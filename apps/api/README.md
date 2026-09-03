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

Linvy still uses `SandboxProvider`. Public provision, suspend, resume, terminate, usage, billing, smart routing, and real-provider endpoints remain deliberately unsupported; the API does not fake telecom side effects or usage data.

## Provider Readiness V0.2.4

The Replacement Engine resolves adapters through `ProviderRegistry.get(target.provider_id)`; the selected connectivity line, not a global adapter or smart-routing rule, determines the provider. Every adapter declares `activation` and `operation_status` capabilities plus explicit false values for unsupported suspend, resume, terminate, usage and provisioning operations.

Provider commands carry the deterministic operation key `{provider_id}:activate:{replacement_id}`. Future adapters must map it to native provider idempotency when available. Linvy does not promise exactly-once external side effects: operation keys plus status reconciliation reduce duplicates, while providers without native idempotency require an adapter-specific strategy.

Provider calls have a `PROVIDER_OPERATION_TIMEOUT_MS` boundary and typed errors: `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `PROVIDER_AUTH_FAILED`, `PROVIDER_RATE_LIMITED`, `PROVIDER_INVALID_REQUEST`, `PROVIDER_CAPABILITY_UNSUPPORTED`, `PROVIDER_OUTCOME_UNKNOWN`, and `PROVIDER_NOT_CONFIGURED`. Classification uses explicit `retryable`, `outcome_unknown`, and terminal semantics rather than message parsing.

An unknown activation moves the Provider Order to `unknown` and the replacement to `reconciling`, then creates one PostgreSQL `provider_order.reconcile` job. Reconciliation calls `getOperationStatus` and never calls `activate` again. Confirmed success completes the normal assignment/event/outbox transaction; confirmed failure safely releases the target. A permanently unknown result becomes `reconciliation_required` after the configured limit and preserves the reserved target for human/provider investigation.

Workers renew owned leases every `JOB_HEARTBEAT_MS`, which must be less than `JOB_LEASE_MS`. A dead process stops heartbeats and remains recoverable after lease expiry; loss of ownership raises `JOB_LEASE_LOST` and prevents the old worker from committing completion.

`provider_connections` stores adapter type, encrypted credentials, key version and basic health timestamps/counters. Credentials use AES-256-GCM under the independent `PROVIDER_MASTER_KEY`, are decrypted only at an adapter boundary, and never appear in public provider DTOs or logs. Public provider responses expose only capabilities and derived `healthy`, `degraded`, or `unknown` health.

To add an adapter, implement `ConnectivityProvider`, declare honest capabilities, honor operation keys, classify errors with `ProviderError`, implement `getOperationStatus` if advertised, decrypt credentials only at the boundary, register by provider ID, and run the reusable provider contract suite. V0.2.4 activates only `SandboxProvider`; no real telecom provider or new telecom endpoint is included.

## Linvy Guard V0.5

Linvy Guard is an optional operational-intelligence and safety layer. The core API continues to work while `guard-worker` is stopped. The worker reads the existing durable `events` store with a per-organization `events-v1` checkpoint, lease, heartbeat and stale-lock recovery. Reprocessing is safe because signals, waves, actions, alerts, Guard events and the existing webhook outbox use database dedupe constraints.

The pipeline is `event -> signal -> deterministic correlation/risk -> cluster -> playbook -> alert -> safe action`. Guard never creates a replacement. Fraud, suspected abuse, platform policy blocks, compliance review and enforcement create a critical compliance signal and an `approval_required` `manual_review_required` action; they never rotate a number or retry an operation to bypass enforcement.

Run `npm run guard-worker`. Configuration is `GUARD_POLL_MS`, `GUARD_LEASE_MS`, `GUARD_HEARTBEAT_MS`, `GUARD_BATCH_SIZE`, and the independent 32-byte base64 `GUARD_CHANNEL_MASTER_KEY`. Channel credentials use AES-256-GCM and are never returned in public DTOs. `SandboxChannel` is executable in tests; email, Slack webhook, Telegram and Guard webhook channels are explicit prepared adapters that require later transport configuration.

Provider Health supports auditable 15-minute, 1-hour and 24-hour PostgreSQL windows. Defaults are centralized: at least 10 operations, 10% failure/unknown for degraded and 25% for critical; three consecutive failures also indicate degraded. Baseline is the preceding equivalent window and is `null` with `INSUFFICIENT_BASELINE` below ten observations. Risk is the clamped sum of `{rule_id, weight, evidence}` factors: 0–24 low, 25–49 medium, 50–74 high and 75–100 critical.

Incident waves require five distinct lines on the same provider and region in a ten-minute bucket. A transaction advisory lock plus `(organization_id, wave_key)` uniqueness ensures one cluster. Membership is normalized. System playbooks are `PROVIDER_OUTAGE`, `SIM_FAILURE`, `ACTIVATION_FAILURE_WAVE`, `OUTCOME_UNKNOWN`, `RECONCILIATION_REQUIRED`, and `COMPLIANCE_REVIEW`.

Alerts have a 30-minute cooldown, occurrence counter and severity escalation. Orchestration-changing actions default to `approval_required`. `pause_provider_activations` only sets an internal policy for future activations; it does not suspend lines, contact telecom providers, interrupt reconciliation, or release unknown-outcome targets. The engine checks this explicit policy immediately before a new activation and raises `PROVIDER_GUARD_BLOCKED`.

Guard endpoints cover `/v1/guard/overview`, signals, risk, clusters, rules, playbooks and runs, alerts and acknowledgement, actions and approval/rejection, and structured policy changes. Explicit scopes are `guard:read`, `guard:signals:read`, `guard:risk:read`, `guard:rules:read|write`, `guard:playbooks:read`, `guard:alerts:read|write`, `guard:actions:read|write`, and `guard:policy:read|write`. All private queries bind the authenticated `organization_id`; system playbooks and global policies are explicitly marked. DTOs use snake_case and omit credentials, keys, leases and checkpoints.

Policy Intelligence is structured ingestion, not scraping. High/critical changes create a signal and alert but never mutate an adapter. `DeterministicGuardExplainer` uses supplied evidence only; no LLM is connected and no private reasoning is persisted.

Limitations: provider observations use `SandboxProvider` until real adapters exist; health uses simple PostgreSQL aggregation; notification transports other than sandbox are prepared but inactive; there is no UI, smart routing, external policy monitor, ML, Redis, Kafka or automatic circuit breaker.
