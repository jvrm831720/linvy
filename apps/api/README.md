# Linvy API V0.2

The dashboard is a client of this API; the API and worker remain operational without the frontend.

## Run

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
npm run worker
```

Docs: `http://localhost:3333/docs`. Health: `GET /health`.

The first milestone implements `incident → replacement → PostgreSQL job → SandboxProvider → ProviderOrder → assignment transfer → event → webhook delivery record`. Replacement creation requires `Authorization: Bearer lv_test_...` and `Idempotency-Key` and returns `202 Accepted`.

API keys are SHA-256 hashed; plaintext bootstrap keys must only be used to seed development. Webhook delivery rows are persisted for a dedicated dispatcher; no network delivery is executed by the replacement transaction.
