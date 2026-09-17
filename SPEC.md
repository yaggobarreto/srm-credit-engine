# SPEC.md — SRM Credit Engine

Este documento registra as premissas adotadas para as ambiguidades propositais do
enunciado, as perguntas que eu faria ao negócio num projeto real, as decisões de
precisão numérica e os critérios de aceite que defini para esta entrega.

Os **golden cases** (seção 4.3 do desafio) usam premissas fixas e independentes
destas — servem só para aferição do motor. As premissas abaixo valem para o
restante do sistema (o que os golden cases não cobrem).

---

## 1. Premissas adotadas

### 1.1 Unidade do prazo na fórmula

`Prazo` é tratado como **número inteiro de meses corridos** entre a data da
operação (cessão) e a data de vencimento do título, com juros compostos mensais
(igual aos golden cases). Não implementei contagem por dias úteis nem prazos
fracionários — assumo meses cheios porque é o que os golden cases exercitam e
porque a maioria dos recebíveis do enunciado (duplicata, cheque pré-datado) tem
vencimento em data fechada, não em dias corridos.

Se o prazo real cair em dias (ex.: 47 dias), minha premissa é arredondar para
cima em meses inteiros (`ceil(dias / 30)`) — mais conservador para quem compra o
recebível, já que gera mais deságio. Isso é uma simplificação assumida, não
validada com o negócio.

### 1.2 Origem e valor da taxa base

A `Taxa Base` (1% a.m. nos golden cases) é tratada como um **parâmetro de
configuração da mesa de operações**, não uma taxa de mercado externa (como
CDI/Selic). Ela fica numa tabela `pricing_config` com vigência por data, do
mesmo jeito que o câmbio — assim a mesa pode atualizá-la sem deploy, e cada
liquidação registra qual taxa base estava vigente no momento do cálculo (rastreável
na auditoria).

Não a atrelei a um índice externo (CDI, por exemplo) porque o enunciado não
pede integração com esse tipo de fonte, e isso adicionaria uma dependência
externa fora do escopo do case.

### 1.3 Política de arredondamento

Sigo exatamente a regra fixada para os golden cases, generalizada para todo o
sistema: **half-even (banker's rounding), 2 casas decimais, aplicado apenas no
resultado final** de cada cálculo monetário exposto/persistido (valor presente,
deságio, valor convertido). Durante os passos intermediários (potenciação da
taxa composta, conversão cambial) mantenho precisão decimal estendida — só
arredondo no último passo antes de gravar/exibir.

Motivo de manter half-even (e não a mais comum "half up"): é a regra dada como
correta para os golden cases, e é a convenção usual em sistemas financeiros
justamente por não enviesar somas repetidas para cima.

### 1.4 Qual taxa de câmbio vale na liquidação

Esta é a ambiguidade mais sensível a negócio, então tratei com cautela:

- Nos **golden cases**, o câmbio é um valor informado explicitamente na
  requisição (C3 usa "5,4321" como dado de entrada) — não é buscado
  automaticamente. Implementei o endpoint de liquidação aceitando um câmbio
  explícito **opcional**; quando informado, é ele que vale (e fica registrado).
- Quando **não informado**, minha premissa é usar a **taxa vigente no momento
  da liquidação** (equivalente a "mais recente", não a taxa da data de
  vencimento do título nem a da data em que o recebível foi cadastrado).
  Justificativa: a liquidação é o evento em que o dinheiro efetivamente muda de
  mãos/moeda — é o câmbio desse instante que reflete o custo real da operação,
  igual a uma mesa de câmbio spot.
- Cada liquidação grava a taxa efetivamente usada e seu timestamp de vigência
  (requisito de auditoria da seção 4.1.4), então essa decisão fica
  **rastreável e não é ambígua depois do fato**, mesmo que a política mude no
  futuro.

### 1.5 Idempotência

Idempotência é obtida por uma **chave de idempotência fornecida pelo
cliente** (header `Idempotency-Key`), com constraint de unicidade no banco.
Uma segunda requisição com a mesma chave retorna o resultado da primeira
liquidação (mesmo status HTTP e corpo), sem executar o cálculo de novo.
Alternativa que considerei e descartei: gerar a chave no servidor a partir de
`(receivableId)` — descartei porque impediria uma re-liquidação legítima do
mesmo recebível em caso de estorno futuro (fora do escopo desta entrega, mas
não quero fechar essa porta na modelagem).

---

## 2. Perguntas que eu faria ao negócio

1. A `Taxa Base` é a mesma para todo o fundo ou varia por cedente
   (rating de crédito) ou por moeda de pagamento?
2. O spread por tipo de recebível (1,5% Duplicata, 2,5% Cheque) é fixo por
   produto ou pode ser parametrizado por operação/cliente (ex.: cedente de
   maior risco paga spread adicional)?
3. Existe liquidação parcial de um recebível, ou é sempre tudo ou nada?
4. Como funciona um estorno/cancelamento pós-liquidação na prática contábil do
   fundo? (O enunciado deixa claro que "alterar" não é operação do sistema —
   mas a operação inversa, se existir, precisa ser modelada como uma nova
   transação compensatória.)
5. Qual é a fonte real da taxa de câmbio em produção (PTAX/BACEN, provedor
   pago, mesa própria)? Isso muda o desenho de resiliência (timeout/retry)
   que faria sentido no nível Sênior.
6. Prazo em dias não-inteiros de mês: existe uma convenção contratual (30/360,
   dias corridos, dias úteis) que devo seguir, ou minha premissa de "arredondar
   para cima" está alinhada com o que a mesa pratica?
7. Há necessidade de multi-tenant (mais de um fundo/mesa usando o mesmo
   sistema) ou é sempre um fundo único?

---

## 3. Decisões de precisão numérica

- **Banco de dados:** PostgreSQL, colunas monetárias e de taxa como
  `NUMERIC(18,6)` (6 casas para não perder precisão em taxas percentuais
  compostas antes do arredondamento final; valores finais de liquidação
  gravados já em 2 casas, mas na coluna `NUMERIC` — nunca `FLOAT`/`DOUBLE`).
- **Aplicação:** uso de tipo decimal de precisão arbitrária em toda a camada
  de negócio (nunca `number`/`float` para dinheiro) — em TypeScript, biblioteca
  `decimal.js`. Conversão para `number` só acontece, se necessário, na borda
  de serialização JSON, e nunca antes do arredondamento final.
- **Quando o arredondamento acontece:** uma única vez, no fim do cálculo de
  cada strategy (valor presente em BRL) e, se houver conversão, uma segunda
  vez no fim da conversão cambial — nunca nos passos intermediários (potência
  da taxa composta, por exemplo). Isso é o que os golden cases C1→C3
  confirmam (a conversão parte do BRL já arredondado, não do valor "cru").
- **Modo de arredondamento:** `ROUND_HALF_EVEN` em todas as operações
  monetárias finais.

---

## 4. Critérios de aceite definidos

**Usabilidade**
- Simulação do valor líquido no painel do operador atualiza sem reload de
  página, com resposta percebida abaixo de ~300ms para os dados de teste.
- Erros de validação (ex.: valor de face negativo, moeda inválida) aparecem
  no formulário antes do submit, com mensagem específica por campo.

**Segurança**
- Toda query ao banco é parametrizada (zero concatenação de string em SQL).
- Endpoints de escrita validam e sanitizam o corpo da requisição (schema
  validation) antes de tocar a camada de negócio.
- Erros de negócio (ex.: recebível já liquidado) retornam status HTTP
  semântico (409, 422 etc.) — nunca `200 OK` com um corpo indicando falha.

**Desempenho**
- Endpoint de extrato/listagem é paginado server-side desde o primeiro
  commit que o implementa (não pagino em memória depois de trazer tudo do
  banco).
- Cálculo de precificação (sem I/O) é uma função pura, testável sem banco
  nem rede — o que também é critério de design, não só de performance.
