# SRM Credit Engine

Plataforma de cessão de crédito multimoedas — case técnico para a vaga de
Engenheiro(a) de Software Júnior/Pleno Fullstack na SRM Asset.

## Stack

- **Backend:** NestJS + TypeScript (modo `strict`), TypeORM + PostgreSQL,
  `decimal.js` para toda operação monetária (nunca `float`/`double`).
- **Frontend:** React (a implementar).
- **Infra local:** Docker Compose (app + banco).

Justificativa: TypeScript ponta a ponta dá tipagem forte em todo o sistema
(diferencial pedido pelo desafio), e o NestJS já impõe separação em módulos/
camadas (controller → service → repository) sem esforço extra de arquitetura.

## Como rodar

### Opção 1 — Docker Compose (recomendado)

Pré-requisito: Docker Desktop rodando.

```bash
docker compose up -d --build
```

- API disponível em `http://localhost:3000`
- Documentação Swagger em `http://localhost:3000/docs`
- Postgres exposto em `localhost:5432` (usuário/senha/db: `srm`/`srm`/`srm_credit_engine`)

Para parar:

```bash
docker compose down
```

### Opção 2 — backend local, banco em Docker

```bash
docker compose up -d db
cd backend
cp .env.example .env
npm install
npm run start:dev
```

## Testes

```bash
cd backend
npm test
```

Inclui os 3 golden cases da seção 4.3 do desafio
(`src/pricing/pricing.service.golden-cases.spec.ts`), que precisam bater ao
centavo.

## Estrutura

```
srm-credit-engine/
├── SPEC.md              # premissas da Fase 0
├── docker-compose.yml
└── backend/
    └── src/
        ├── common/money/     # value object monetário (decimal.js)
        ├── pricing/          # motor de precificação (Strategy pattern)
        └── currency/         # câmbio com vigência (append-only)
```

## Documentos do case

- [`SPEC.md`](./SPEC.md) — premissas, perguntas ao negócio, precisão numérica
- `REVIEW.md` — code review reverso (Fase 2, a entregar)
- `AI_USAGE.md` — engenharia da colaboração com IA (a entregar)
- `DECISIONS.md` — cortes e simplificações deliberados (a entregar)
