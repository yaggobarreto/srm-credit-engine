# DECISIONS.md — Cortes e simplificações deliberados

Este documento existe porque o desafio deixa claro: priorização é critério
de avaliação, não desculpa. Um corte bem justificado vale mais que uma
feature a mais mal feita. Abaixo está o que ficou de fora ou foi
simplificado, e por quê — organizado por categoria, não por ordem
cronológica.

---

## 1. Itens de senioridade fora do escopo (Júnior→Pleno)

O desafio é explícito: senioridade não é acúmulo de artefatos, é mudança de
eixo. Optei por levar Pleno até o fim em vez de fazer um pouco de tudo até
Staff. Ficaram de fora, deliberadamente:

- **Optimistic locking com coluna de versão.** Implementei concorrência
  segura via **lock pessimista** (`SELECT ... FOR UPDATE` na transação de
  `SettlementsService.settle()`), testado com duas liquidações concorrentes
  reais (`backend/test/settlements.e2e-spec.ts`). Resolve o mesmo problema
  que o item de sênior pede (nenhuma liquidação duplicada sob concorrência),
  por um mecanismo mais simples de raciocinar — mas não é literalmente
  "optimistic locking com teste de conflito por versão", que é o que o
  nível sênior pede especificamente.
- **Observabilidade** (logs estruturados, métricas de negócio como
  liquidações/min). Não implementado.
- **Resiliência de integração externa** (timeout/retry/circuit breaker).
  Não se aplica hoje porque a "integração de câmbio" é um endpoint interno
  de atualização manual, não uma chamada HTTP a um provedor externo — não
  há uma chamada de rede para proteger. Se fosse um provedor real
  (ex.: PTAX/BACEN), esse item entraria.
- **CI** (GitHub Actions rodando testes/lint). Os testes rodam localmente
  (`npm test` e `npm run test:e2e`); não configurei pipeline.
- **Diagramas C4.** Não produzidos como artefato formal; a arquitetura em
  camadas está documentada no `README.md` e é direta o suficiente (poucos
  módulos, um banco) para não precisar de um C4 completo neste estágio.

## 2. Simplificações de modelagem de negócio

- **Sem liquidação parcial.** Cada recebível é liquidado por inteiro, uma
  única vez (reforçado pela constraint `UNIQUE` em `settlements.receivable_id`).
  O desafio e os golden cases não exercitam liquidação parcial, e é uma das
  perguntas que ficou registrada para o negócio no `SPEC.md` (item 2.3) —
  implementar sem essa resposta seria adivinhar uma regra financeira.
- **Sem estorno/cancelamento pós-liquidação.** O desafio afirma
  explicitamente que "alterar uma liquidação registrada não é uma operação
  do sistema" — não implementei a operação inversa (uma transação
  compensatória) porque a regra contábil por trás dela também é uma
  pergunta em aberto para o negócio (`SPEC.md` 2.4). Não fechei a porta pra
  isso: a idempotência é por chave explícita, não derivada só do
  `receivableId`, então uma futura liquidação compensatória do mesmo
  recebível é modelável sem redesenhar o schema.
- **Moedas limitadas a BRL/USD (enum fechado no DTO).** O desafio e os
  golden cases trabalham só com esse par. Um cadastro de moedas genérico
  seria generalização prematura para um requisito que não existe hoje.
- **Prazo em meses inteiros, arredondado pra cima (`ceil(dias/30)`).**
  Documentado como premissa no `SPEC.md` 1.1 — não é uma convenção
  contratual real (30/360, dias úteis), é uma simplificação assumida na
  ausência de uma resposta do negócio.

## 3. Simplificações técnicas

- **`synchronize: true` do TypeORM em vez de migrations versionadas.**
  O schema é sincronizado a partir das entities em qualquer ambiente que
  não seja `NODE_ENV=production` (ver `backend/src/app.module.ts` e o
  comentário em `docker-compose.yml`). Escrever e manter migrations
  versionadas (`up`/`down`) para cada mudança de entity tem retorno baixo
  num projeto de 8-16h com schema estável desde o início — mas é a
  primeira coisa que eu mudaria antes de um deploy real, porque
  `synchronize` pode aplicar mudanças destrutivas sem aviso.
- **Sem paginação nas listagens simples** (`GET /receivables`,
  `GET /currency-rates/history`). Só implementei paginação server-side
  onde o desafio exige explicitamente (`GET /reports/settlements`, seção
  4.1.6). As listagens simples devolvem tudo de uma vez — aceitável para o
  volume de dados de uma demo/case, mas seria o próximo ponto a corrigir
  se o volume de recebíveis/cotações crescesse.
- **Sem autenticação/autorização na API.** O desafio não pede login para a
  API do motor em si (é distinto do produto `FluxAsset` que já tenho, que
  tem 2FA). Deixar a API aberta é aceitável para rodar localmente/no
  Docker Compose da avaliação, mas seria inaceitável em produção — trataria
  isso como pré-requisito de deploy, não como parte do motor de
  precificação.
- **Sem rate limiting.** Mesmo raciocínio da autenticação: não é o foco do
  case (motor de precificação/liquidação), mas é um gap real de produção
  que eu nomearia explicitamente numa conversa de arquitetura.
- **Health check só no banco, não no backend** (`docker-compose.yml` só
  tem `healthcheck` no serviço `db`). Suficiente para o compose local
  (o backend depende do banco saudável antes de subir); um endpoint
  `/health` dedicado seria necessário para orquestração real (k8s/ECS).

## 4. O que eu faria diferente com mais tempo (não é corte, é honestidade)

Se este fosse um projeto real e não um case de 8-16h, a primeira coisa que
eu mudaria não é uma feature nova — é substituir `synchronize: true` por
migrations antes de qualquer outra coisa, porque é o único item desta
lista que pode causar perda de dados silenciosa em produção. Todo o resto
aqui é escopo consciente, não dívida técnica escondida.
