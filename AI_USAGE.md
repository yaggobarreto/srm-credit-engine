# AI_USAGE.md — Engenharia da colaboração com IA

Ferramenta usada: **Claude Code** (agente de CLI), em sessão interativa,
do início ao fim do projeto — não geração pontual de trechos copiados de um
chat. Este documento não é o log da sessão; é o que importa dele: como o
trabalho foi direcionado, onde a IA errou e como isso foi pego, e o que eu
mantive sob controle humano deliberadamente.

---

## 1. Como direcionei o trabalho (specs/prompts estratégicos)

Não usei a IA como "gerador de código a partir de uma frase". O fluxo real
foi:

1. **Entendimento antes de código.** Antes de qualquer linha, pedi pra IA
   me explicar o case inteiro de volta — o que cada seção exigia, o que a
   fórmula dos golden cases significava, onde estavam as ambiguidades — e
   só validei a matemática dos 3 golden cases manualmente antes de aceitar
   como corretas.
2. **Decisão de escopo antes de arquitetura.** Defini explicitamente o
   nível-alvo (Júnior→Pleno) antes de qualquer decisão técnica, porque isso
   muda o que vale a pena construir (ex.: lock pessimista simples em vez de
   optimistic locking com teste de conflito, que é item de sênior).
3. **`SPEC.md` como contrato antes da implementação.** Segui a ordem que o
   próprio desafio pede: as premissas para as ambiguidades propositais
   (unidade de prazo, origem da taxa base, política de arredondamento, qual
   câmbio vale na liquidação) foram decididas e documentadas **antes** de
   qualquer código de precificação existir — não depois, para justificar o
   que já tinha sido escrito.
4. **Trabalho em fatias verificáveis.** Cada PR corresponde a uma peça
   coesa e testável (motor de precificação → câmbio → Docker → recebíveis/
   liquidação → extrato → review), sempre com "rode os testes e me mostre
   que bate" como critério de aceite antes de eu aprovar o merge — nunca
   "gere tudo de uma vez e eu reviso no final".

## 2. Um caso concreto em que a IA errou

**Onde:** validação de taxa de câmbio em
[`CurrencyService.registerRate`](backend/src/currency/currency.service.ts).

**O que aconteceu:** a primeira versão do código rejeitava taxas inválidas
com `!new Decimal(input.rate).isPositive()`. Parece correto lendo o nome do
método — mas `isPositive()` na biblioteca `decimal.js` retorna `true`
também para zero (ela responde "não é negativo", não "é maior que zero").
Ou seja: o código aceitava `rate: "0"` como uma cotação de câmbio válida,
um bug sutil de semântica de biblioteca, não um erro óbvio de sintaxe.

**Como o processo detectou:** o teste unitário que cobre exatamente esse
caso (`rejeita rate não positivo`, em
[`currency.service.spec.ts`](backend/src/currency/currency.service.spec.ts))
falhou na primeira execução — a asserção esperava uma exceção e recebeu uma
promise resolvida. Troquei para `.greaterThan(0)`, rodei de novo, passou.
Isso só foi pego porque o teste foi escrito para exercitar o caso de borda
(`rate = "0"`) e não só o caminho feliz — se o teste tivesse testado só
`rate = "-1"`, o bug do zero teria passado batido pra produção.

**Lição aplicada no resto do projeto:** todo `service` que valida um valor
numérico (`ReceivablesService`, `PricingConfigService`) tem teste explícito
pro valor-limite (zero), não só pro caso negativo óbvio.

## 3. O que decidi não delegar à IA, e por quê

- **O nível-alvo da entrega (Júnior→Pleno) e o que fica de fora.** Isso é
  uma decisão de carreira/posicionamento, não uma decisão técnica — a IA
  pode listar o que cada nível pede, mas não pode decidir por mim até onde
  vale a pena ir.
- **As premissas do `SPEC.md`.** A IA levantou as opções e os trade-offs
  para cada ambiguidade (ex.: qual câmbio vale na liquidação), mas a
  escolha final e a justificativa de negócio são minhas — são exatamente o
  que vai ser questionado na defesa ao vivo, então preciso ser capaz de
  defender cada uma sem "porque a IA sugeriu".
- **Aprovação de cada fatia de trabalho antes de seguir.** Pedi pra
  trabalhar "por partes" de propósito: cada PR só avança depois que os
  testes relevantes rodam e eu vejo o resultado (inclusive testes manuais
  via `curl` contra o Postgres real, não só testes automatizados) — nunca
  deixei acumular trabalho não verificado.
- **A validação de infraestrutura real.** Subir o Docker Desktop e abrir o
  projeto no editor pra visualizar foram ações minhas, não da IA — quis ver
  o sistema funcionando de verdade, não só relatórios de "passou".
- **Entender o código a ponto de conseguir explicar e alterar ao vivo.**
  O desafio é claro que isso é eliminatório se eu não conseguir. Por isso
  pedi, ao final de todo o trabalho, um documento único que reconstrói o
  "porquê" de cada decisão do projeto — não para ler na hora da defesa, mas
  para estudar antes dela.

## 4. Uso de IA na própria defesa ao vivo

O desafio libera e incentiva uso de IA durante a mudança de código ao vivo
(seção 9). Pretendo usar Claude Code do mesmo jeito que usei aqui: pedir a
alteração, revisar o diff antes de aceitar, rodar os testes relevantes
(unitários e, se fizer sentido, o suite e2e contra o Postgres do
`docker compose`) antes de considerar a tarefa concluída.
