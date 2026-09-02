# Linvy API V0.2.3

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
npm run webhook-worker
```

Docs: `http://localhost:3333/docs`. Health: `GET /health`.

The first milestone implements `incident → replacement → PostgreSQL job → SandboxProvider → ProviderOrder → assignment transfer → event → webhook delivery record`. Replacement creation requires `Authorization: Bearer lv_test_...` and `Idempotency-Key` and returns `202 Accepted`.

API keys are SHA-256 hashed; plaintext bootstrap keys must only be used to seed development. The replacement transaction atomically creates the event and one outbox delivery per enabled webhook. The dedicated dispatcher performs network I/O outside that transaction.

V0.2.1 reserves pool resources atomically with `FOR UPDATE SKIP LOCKED`, recovers stale job leases, applies bounded exponential retry, uses stable provider operation keys, and encrypts recoverable webhook signing secrets with AES-256-GCM. API keys remain hash-only.

## Webhooks

Create a registration with `POST /v1/webhooks` and scope `webhooks:write`:

```json
{"url":"https://consumer.example/linvy"}
```

The response contains a generated `whsec_...` secret exactly once. The database stores only its AES-256-GCM ciphertext under `WEBHOOK_MASTER_KEY`; `GET /v1/webhooks` never returns either plaintext or ciphertext. `DELETE /v1/webhooks/:id` disables a registration. Read operations require `webhooks:read`, write operations require `webhooks:write`, and every lookup is restricted by the authenticated `organization_id`.

Each POST has `Content-Type: application/json`, `User-Agent: Linvy-Webhooks/0.2`, and these headers:

- `Linvy-Event-Id`: stable event identifier
- `Linvy-Delivery-Id`: stable event/webhook outbox identifier
- `Linvy-Timestamp`: Unix seconds
- `Linvy-Signature`: `v1=<lowercase hex HMAC>`

The body is canonical JSON with recursively sorted object keys and the semantic shape `{id,type,created_at,data}`. The exact signing input is the UTF-8 byte sequence `Linvy-Timestamp + "." + raw_request_body`. The signature is `HMAC-SHA256(webhook_secret, signing_input)`, hex encoded and prefixed with `v1=`. Consumers must verify against the unmodified raw body using a constant-time comparison, reject timestamps outside a small tolerance (five minutes is recommended), and deduplicate on `Linvy-Event-Id` and/or `Linvy-Delivery-Id`.

```js
const expected = 'v1=' + createHmac('sha256', secret)
  .update(timestamp + '.' + rawBody)
  .digest('hex');
const valid = timingSafeEqual(Buffer.from(received), Buffer.from(expected));
```

The PostgreSQL claim is exclusive (`FOR UPDATE SKIP LOCKED`) and protected by `locked_at`/`locked_by`; an expired `WEBHOOK_LEASE_MS` lease is reclaimable after a worker crash. External HTTP is inherently **at-least-once**, not exactly-once: a crash after the consumer accepts a request but before Linvy commits `delivered` can cause a duplicate.

HTTP 2xx succeeds. Timeouts, transient network/DNS failures, 408, 425, 429, and 5xx retry with capped exponential backoff; valid `Retry-After` on 429/503 is honored within `WEBHOOK_RETRY_MAX_MS`. Other 3xx/4xx responses, invalid URLs, disabled registrations, SSRF violations, and undecryptable secrets are terminal. After `WEBHOOK_MAX_ATTEMPTS`, the delivery becomes `failed`. Redirects are never followed and response bodies are never retained.

Production delivery requires HTTPS. Before connection, the dispatcher resolves DNS, rejects every result if any address is loopback, private, link-local, metadata-adjacent, multicast, or reserved, and pins the request socket to the validated address while preserving the original TLS hostname. This closes the ordinary second-resolution DNS rebinding path. Residual network-layer controls such as an egress firewall remain recommended for defense in depth.

## Public API contract

Authenticate with `Authorization: Bearer <key>`. Every response, including errors, contains `X-Request-ID`; a safe client-provided value is preserved. Invalid input returns HTTP 400 with `VALIDATION_ERROR` and safe field details. Public DTOs use snake_case and never expose database rows, hashes, encrypted secrets, job payloads, or lease ownership.

All collections return `{"data": [...], "next_cursor": "..."}`. The opaque cursor uses stable descending creation time plus ID where timestamps exist, otherwise descending ID. `limit` defaults to 25 and accepts 1–100. Pass `cursor` and the same filters to retrieve the next page.

Available scopes are: `lines:read`, `providers:read`, `people:read`, `people:write`, `assignments:read`, `assignments:write`, `incidents:read`, `incidents:write`, `replacements:read`, `replacements:write`, `provider_orders:read`, `events:read`, `webhooks:read`, `webhooks:write`, `webhook_deliveries:read`, `api_keys:read`, and `api_keys:write`. The development bootstrap key has all scopes. API keys can manage keys only with the explicit `api_keys:*` scopes.

```bash
curl -H "Authorization: Bearer $LINVY_KEY" 'http://localhost:3333/v1/lines?limit=25&region=RJ'
curl -X POST -H "Authorization: Bearer $LINVY_ADMIN_KEY" -H 'Content-Type: application/json' \
  -d '{"name":"ERP Production","scopes":["lines:read","incidents:write","replacements:write"]}' \
  http://localhost:3333/v1/api-keys
curl -X DELETE -H "Authorization: Bearer $LINVY_ADMIN_KEY" http://localhost:3333/v1/api-keys/key_id
```

Read endpoints cover lines and pool, providers, people, assignment history, incidents, replacements, Provider Orders, events, webhooks, webhook deliveries, and API keys. Mutations are intentionally limited to people, assignments, incidents, replacement commands, webhooks, and API-key lifecycle. Every lookup and mutation is scoped to the authenticated organization.

Linvy V0.2.3 still uses `SandboxProvider`. Provision, suspend, resume, terminate, usage, billing, smart routing, reconciliation, and real-provider endpoints are deliberately unsupported until Provider Readiness; the API does not fake telecom side effects or usage data.
