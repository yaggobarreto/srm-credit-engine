# REVIEW.md — Code Review Reverso (Anexo A)

Contexto assumido: PR de sexta-feira à tarde, "gerado por IA e aprovado às
pressas", endpoint de liquidação (`POST /settlements`). Este é o review que
eu teria feito antes de aprovar — nenhum dos itens abaixo passaria em CI ou
em revisão humana num sistema financeiro.

Critério de ordenação: severidade = probabilidade × impacto em produção
(dinheiro perdido, dados corrompidos, dados vazados), não a ordem em que os
bugs aparecem no arquivo. Para cada item: o problema, o que acontece em
produção se ele passar, e a correção que eu proporia no PR.

---

## 1. [Crítico] SQL Injection em três queries diferentes

```ts
const receivable = await db.queryOne(
  `SELECT * FROM receivables WHERE id = ${receivableId}`
);
...
await db.query(
  `INSERT INTO settlements (receivable_id, amount, currency)
   VALUES (${receivableId}, ${finalAmount.toFixed(2)}, '${currency}')`
);
```

**Problema:** `receivableId` e `currency` vêm direto de `req.body` e são
interpolados como string na query, sem parametrização nem sanitização — nas
três queries do endpoint (`SELECT`, `INSERT`, `UPDATE`).

**Impacto em produção:** qualquer cliente da API pode enviar
`receivableId` malicioso e ler, alterar ou apagar qualquer dado do banco
(inclusive de outros cedentes/fundos), bypassar autenticação, ou derrubar
o serviço. Num sistema que movimenta caixa de terceiros, isso é uma falha
de compliance grave, não só técnica — é o tipo de achado que para uma
auditoria.

**Correção:** parametrizar todas as queries (`WHERE id = $1`, `[receivableId]`)
ou, melhor, nunca escrever SQL cru para isso — usar o query builder/ORM com
bind parameters (é o que faço em todo o projeto: ver
[`SettlementsService`](backend/src/settlements/settlements.service.ts) e
[`ReportsService`](backend/src/reports/reports.service.ts), que usam
TypeORM com parâmetros nomeados). Validar o formato de `receivableId`
(UUID) e o enum de `currency` na borda (DTO), antes de a query rodar.

---

## 2. [Crítico] Nenhuma transação — dois writes independentes e não atômicos

```ts
await db.query(`INSERT INTO settlements ...`);
await db.query(`UPDATE receivables SET status = 'SETTLED' ...`);
```

**Problema:** o INSERT e o UPDATE são duas chamadas separadas ao banco,
sem `BEGIN`/`COMMIT` nem qualquer mecanismo de transação. Não há garantia
de que as duas rodem juntas ou nenhuma rode.

**Impacto em produção:** se o UPDATE falhar depois que o INSERT já
commitou (timeout de rede, conexão caiu, constraint falhou), o sistema
fica com uma liquidação registrada **e** o recebível ainda como `PENDING`
— ou seja, ele pode ser liquidado de novo. Esse é exatamente o mecanismo
mais provável por trás do incidente do Anexo B.

**Correção:** envolver os dois writes numa única transação de banco, com
rollback automático em caso de erro em qualquer um dos passos. No meu
código, `SettlementsService.settle()` roda inteiro dentro de
`dataSource.transaction(...)` — o insert da liquidação e o update do
status do recebível só existem juntos, nunca separados.

---

## 3. [Crítico] Endpoint não é idempotente

**Problema:** não existe nenhuma chave de idempotência, nem checagem do
status atual do recebível antes de liquidar. Repetir a mesma requisição
(retry de rede, duplo clique do operador, timeout no client que reenvia)
executa o cálculo e o insert de novo.

**Impacto em produção:** é o cenário literal do Anexo A + Anexo B — três
cedentes recebendo a mesma liquidação duas vezes, dinheiro saindo em
dobro do caixa do fundo. Combinado com o item 2 (sem transação) e o item
4 (erro engolido), não há nenhuma camada que impeça ou sequer detecte
isso.

**Correção:** exigir um header `Idempotency-Key` por tentativa de
liquidação; a primeira chamada processa e grava a chave junto do
resultado, chamadas repetidas com a mesma chave retornam o resultado
original sem reprocessar. Adicionalmente, checar (com lock, para
resistir a corrida real) se o recebível já está `SETTLED` antes de
liquidar de novo. É exatamente o que `SettlementsService.settle()`
implementa — inclusive testado sob concorrência real, não só no papel
(`backend/test/settlements.e2e-spec.ts`).

---

## 4. [Crítico] Erro engolido silenciosamente, resposta 200 OK mesmo assim

```ts
} catch (e) {
  // se falhar aqui, o insert já rodou, então segue o jogo
}

res.status(200).json({ ok: true, amount: finalAmount.toFixed(2) });
```

**Problema:** qualquer exceção nos dois writes é descartada — nem
logada. O código continua e responde `200 OK` com `ok: true`
independente do que aconteceu de fato.

**Impacto em produção:** este é o item que transforma os bugs 1–3 em um
incidente que passa **duas semanas em produção sem ninguém perceber**
(citando o próprio cenário do Anexo B). O operador acha que a liquidação
funcionou porque a API disse que sim; não há log, não há métrica, não há
como saber que algo deu errado sem auditar o banco manualmente. É
também um anti-padrão citado explicitamente no enunciado do desafio.

**Correção:** nunca capturar uma exceção sem, no mínimo, logar e
propagar um status de erro. Deixar exceções não tratadas subirem para um
exception filter global que traduz o tipo de erro em um status HTTP
correto (`500` para falha inesperada, `409`/`422` para violação de regra
de negócio) — nunca `200` para uma operação que não completou.

---

## 5. [Crítico] `BASE_RATE = 1.0` e spreads como `1.5`/`2.5` — taxa 100x maior que o correto

```ts
const BASE_RATE = 1.0; // taxa base mensal
const spread = receivable.type === "DUPLICATA" ? 1.5 : 2.5;
```

**Problema:** o enunciado define taxa base de 1% a.m. e spreads de 1,5%
e 2,5% a.m. — ou seja, `0.01`, `0.015`, `0.025` em decimal. O código usa
`1.0`, `1.5`, `2.5`, tratando 1% como 100%. O comentário ("taxa base
mensal") não ajuda quem revisa a perceber o erro de grandeza.

**Impacto em produção:** todo valor presente calculado por este código
está errado por duas ordens de grandeza — não é um bug de borda, é
100% das liquidações com o deságio completamente errado desde o
primeiro deploy. Para o caso C1 do desafio (R$100.000, 3 meses), o valor
correto é R$92.859,94; esta fórmula devolve algo perto de R$2.032,52.
Dependendo de qual lado da operação usa esse número, o fundo paga a
mais ao cedente ou compra o recebível por uma fração do que deveria.

**Correção:** representar taxas sempre como decimal (`0.01`, `0.015`,
`0.025`), e — mais importante — ter testes automatizados contra os
golden cases do desafio rodando no CI. Esse tipo de erro de grandeza é
exatamente o que um teste de regressão pega em segundos; é o que os
testes em `backend/src/pricing/pricing.service.golden-cases.spec.ts` e
`backend/test/settlements.e2e-spec.ts` fazem neste projeto.

---

## 6. [Alto] `float`/`number` para dinheiro em toda a cadeia de cálculo

```ts
const presentValue = receivable.face_value / Math.pow(1 + BASE_RATE + spread, receivable.term);
finalAmount = presentValue / rate;
```

**Problema:** `face_value`, `presentValue` e `finalAmount` são `number`
JS comuns, e a divisão/potenciação roda em ponto flutuante binário
(IEEE-754). `.toFixed(2)` no final só formata a string — não corrige o
erro de representação acumulado nos passos anteriores, e o próprio
`toFixed` tem comportamento de arredondamento inconsistente em casos de
borda.

**Impacto em produção:** erro de centavos que se acumula em escala —
pequeno em uma transação, sistemático e mensurável em milhares. É
listado como anti-padrão eliminatório a partir do nível pleno no próprio
desafio.

**Correção:** usar um tipo decimal de precisão arbitrária
(`decimal.js` na aplicação, `NUMERIC` no banco, ponta a ponta), com um
único arredondamento explícito (half-even, 2 casas) no fim do cálculo —
ver [`Money`](backend/src/common/money/money.ts).

---

## 7. [Alto] Nenhuma validação de entrada nem checagem de existência

**Problema:** `receivableId` e `currency` são usados como vieram, sem
checar tipo, formato ou se pertencem a um conjunto válido. O código
também assume que `receivable` existe (`receivable.type`,
`receivable.face_value`) sem checar se a query retornou algo.

**Impacto em produção:** um `receivableId` inexistente ou malformado
gera um `TypeError` não tratado (500 cru, stack trace potencialmente
vazado) em vez de um `404` claro; um `currency` fora de `BRL`/`USD`
segue adiante e quebra silenciosamente mais à frente.

**Correção:** validar o corpo da requisição contra um schema/DTO antes
de qualquer lógica de negócio rodar (no meu código,
`ValidationPipe` + `class-validator` em todos os DTOs), e checar
explicitamente a existência do recebível, retornando `404` com mensagem
clara quando não existir.

---

## 8. [Médio] Auditoria incompleta — não há como provar o que foi calculado

**Problema:** a tabela `settlements` só grava `receivable_id`, `amount`
e `currency`. Não há timestamp, não há registro de qual taxa base, qual
spread ou qual taxa de câmbio foram efetivamente usados no cálculo.

**Impacto em produção:** se a taxa base ou o câmbio mudarem depois, não
há como reconstruir ou provar, para uma liquidação já feita, quais
valores foram realmente aplicados — o que o desafio exige
explicitamente ("cada liquidação gera registro imutável com valores,
taxa de câmbio efetivamente usada e timestamps").

**Correção:** persistir um snapshot completo no momento da liquidação
(valor de face, prazo, taxa base usada, spread usado, câmbio usado,
valores calculados, timestamp) e nunca fazer update/delete dessa linha
depois — ver `SettlementEntity`.

---

## 9. [Médio] `fxService.getLatestRate("USD")` é ambíguo e sem tratamento de erro

**Problema:** "latest" não é definido (vigente em relação a quê?) e o
valor retornado não fica associado a um registro versionado/datado. A
chamada também não tem tratamento de erro — se o serviço de câmbio
falhar ou responder lento, a exceção sobe sem controle.

**Impacto em produção:** impossível auditar depois qual cotação foi
usada (mesmo problema do item 8, agravado); uma falha temporária do
provedor de câmbio derruba o endpoint inteiro sem uma resposta
controlada ao cliente.

**Correção:** resolver a taxa a partir de um registro com vigência
explícita, gravar seu valor (e não só usá-lo em memória) na liquidação;
tratar falha da chamada externa com um erro de negócio claro (e, em um
cenário de maior maturidade operacional, timeout/retry — fora do escopo
desta entrega, mas registrado como próximo passo).

---

## 10. [Médio] Conversão cross-currency não segue a ordem de arredondamento definida no negócio

```ts
finalAmount = presentValue / rate;
```

**Problema:** a conversão usa `presentValue` bruto (não arredondado),
não o valor em BRL já fechado em 2 casas. Os golden cases do desafio
(C1 → C3) deixam claro que a conversão deve partir do valor em BRL **já
arredondado**.

**Impacto em produção:** o valor final em USD diverge (por centavos) do
que a regra de negócio define como correto — pequeno, mas sistemático,
e falha exatamente o tipo de teste de aferição que o desafio usa para
validar o motor.

**Correção:** arredondar o valor presente em BRL antes de dividir pela
taxa de câmbio, e arredondar de novo o resultado final — replicado em
`PricingService.price()`.

---

## 11. [Baixo] Sem contrato de resposta, sem status HTTP semânticos, sem documentação

**Problema:** `req.body` não é tipado, a resposta é um objeto ad hoc, e
não há OpenAPI/Swagger para este endpoint. Tudo retorna `200`, inclusive
quando internamente algo falhou (item 4) — não há `201` para criação,
`404` para recebível inexistente, nem `409` para liquidação duplicada.

**Impacto em produção:** integrações com este endpoint não conseguem
diferenciar sucesso de falha por status HTTP (só inspecionando o corpo,
que também mente); a ausência de tipagem forte é parte do motivo pelo
qual o bug do item 5 (`BASE_RATE = 1.0`) passou despercebido — um
`number` solto não denuncia visualmente que "1.0" deveria ser "0.01".

**Correção:** DTOs tipados para request/response, decorators Swagger, e
status HTTP semânticos por cenário (201/400/404/409/500) — ver
`SettlementsController`.

---

## Resumo

| # | Severidade | Problema | Categoria |
|---|---|---|---|
| 1 | Crítico | SQL Injection | Segurança |
| 2 | Crítico | Sem transação | Integridade de dados |
| 3 | Crítico | Sem idempotência | Integridade de dados |
| 4 | Crítico | Erro engolido, 200 OK falso | Confiabilidade |
| 5 | Crítico | Taxa/spread com grandeza errada | Corretude financeira |
| 6 | Alto | `float` para dinheiro | Corretude financeira |
| 7 | Alto | Sem validação de entrada | Robustez |
| 8 | Médio | Auditoria incompleta | Domínio do negócio |
| 9 | Médio | Câmbio ambíguo, sem tratamento de erro | Domínio do negócio |
| 10 | Médio | Ordem de arredondamento errada | Corretude financeira |
| 11 | Baixo | Sem contrato de API/documentação | Design de API |

Os itens 1–7 sozinhos, combinados, reproduzem com bastante fidelidade o
cenário do Anexo B: SQL injection é a porta de entrada mais grave, mas o
incidente de liquidações duplicadas nasce da combinação específica de
"sem transação" + "sem idempotência" + "erro engolido com 200 OK" — as
três coisas que, juntas, permitem que a mesma liquidação aconteça duas
vezes **e** que ninguém perceba até alguém reconciliar o caixa
manualmente.
