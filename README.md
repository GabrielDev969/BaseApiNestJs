# Workspace API

Multi-tenant NestJS API with workspaces, RBAC, JWT auth, 2FA, OAuth (Google + GitHub), audit logging, and a global super admin.

- **Stack**: NestJS 11, Prisma 7 + PostgreSQL, Passport JWT, Argon2id, Zod. Redis for cache/throttler/queue. BullMQ for background jobs. Resend (or log) for email. prom-client + Prometheus + Alertmanager + Grafana for observability. Pino, Helmet, Swagger, Jest + Testcontainers.
- **Layout**: each domain module is split into `http/` (controllers, DTOs), `use-cases/`, `services/`, `repositories/`, `entities/`. Repos are abstract classes injected by type — no `@Inject` / Symbol tokens.
- **Conventions**: see [CLAUDE.md](./CLAUDE.md) for the non-negotiable rules (English-only code, abstract-class repos, soft delete, etc.).

---

## Requirements

- Node.js **>= 20**
- pnpm **10.33** (pinned in `packageManager`)
- Docker (for Postgres + Redis locally, and for E2E tests via Testcontainers)

## Setup

```bash
pnpm install
cp .env.example .env
# Generate strong secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_ACCESS_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY (must be 32 bytes hex = 64 chars)
# Edit .env, paste the values, set SUPER_ADMIN_*

docker compose up -d                  # Postgres + Redis + Prometheus + Alertmanager + Grafana
pnpm exec prisma migrate dev          # apply schema
pnpm exec prisma db seed              # seed permissions + super admin
pnpm run start:dev                    # http://localhost:3000
```

Once the app is up:

- **API base**: `http://localhost:3000/api/v1`
- **Swagger UI** (dev only): `http://localhost:3000/docs`
- **Health**: `http://localhost:3000/health` and `/health/ready`
- **Metrics**: `http://localhost:3000/metrics` (Prometheus exposition format)
- **Prometheus UI**: `http://localhost:9090`
- **Alertmanager UI**: `http://localhost:9093` (requires `ALERT_DISCORD_WEBHOOK_URL` set)
- **Grafana**: `http://localhost:3001` — login `admin` / `admin` (or `GRAFANA_ADMIN_PASSWORD`)

> Only `postgres` + `redis` are strictly required for the API to boot. The observability stack (Prometheus, Alertmanager, Grafana) is optional in dev — start it on demand with `docker compose up -d prometheus grafana`.

## Environment

All variables are validated by Zod at boot (`src/config/env.config.ts`). The app refuses to start with an invalid set.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | – | `development` / `production` / `test` |
| `PORT` | – | default `3000` |
| `APP_URL` | yes | base URL the API is served at |
| `DATABASE_URL` | yes | Postgres connection string |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | host/port yes | Redis (used by BullMQ) |
| `JWT_ACCESS_SECRET` | yes | min 32 chars |
| `JWT_REFRESH_SECRET` | yes | min 32 chars |
| `JWT_ACCESS_EXPIRES_IN` | – | default `15m` |
| `JWT_REFRESH_EXPIRES_IN` | – | default `7d` |
| `ENCRYPTION_KEY` | yes | exactly 64 hex chars (32 bytes) — used to encrypt 2FA secrets |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | optional | all three together; otherwise Google OAuth is disabled |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_CALLBACK_URL` | optional | all three together; otherwise GitHub OAuth is disabled |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | – | global rate limit, default 60s / 100 req |
| `METRICS_ALLOWED_IPS` | optional | CSV of IPs allowed to scrape `/metrics`. Empty = open (dev). Set to loopback + Prometheus scraper IP in prod. |
| `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` | optional | Used by the docker-compose `grafana` service. Default `admin`/`admin` — change for shared environments. |
| `TRUST_PROXY` | optional | `false` (default), `true` (trust all), or a number of hops (`1`/`2`...). **Required behind a proxy** so `req.ip` is the real client. |
| `DB_POOL_MAX` / `DB_POOL_IDLE_MS` / `DB_POOL_CONN_TIMEOUT_MS` | – | Postgres pool tuning. Defaults `10` / `30000` / `50000`. |
| `EMAIL_PROVIDER` | – | `resend` or `log` (default). `log` only writes to the logger — useful in dev. |
| `EMAIL_FROM` | – | "From" address used by the mailer. |
| `RESEND_API_KEY` | yes if `EMAIL_PROVIDER=resend` | Resend API key. |
| `APP_PUBLIC_URL` | optional | Public URL used in email links. Falls back to `APP_URL`. |
| `ALERT_DISCORD_WEBHOOK_URL` | optional | Discord webhook the Alertmanager service routes to. Required if you run the `alertmanager` container. |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | yes (seed) | provisioned by `prisma db seed` |
| `CORS_ORIGINS` | required outside `development` | comma-separated allowed origins. In `development` defaults to `http://localhost:3000,http://127.0.0.1:3000`. Never wildcards credentials. |

## Scripts

```bash
pnpm run start:dev      # dev with watch
pnpm run start:prod     # node dist/main (after `pnpm run build`)
pnpm run build          # nest build
pnpm run lint           # eslint --fix
pnpm test               # unit tests
pnpm test:cov           # unit + coverage
pnpm test:e2e           # e2e with Testcontainers (Docker required)
pnpm exec prisma migrate dev   # apply migrations
pnpm exec prisma db seed       # seed permissions + super admin
```

## Project layout

```
src/
  config/                 # env validation
  modules/
    auth/                 # register, login, refresh, /me, 2FA
    oauth/                # Google + GitHub OAuth (login + linking)
    users/                # workspace-scoped user CRUD
    workspaces/           # list / get / update / delete
    rbac/                 # roles + permissions
    invitations/          # send / accept / revoke
    sessions/             # active sessions, revoke
    audit/                # query audit logs
    health/               # liveness + readiness
  shared/
    database/             # PrismaService (instruments query duration metric)
    cache/                # AppCacheModule, CacheService, @Cacheable, @InvalidateCache (Redis)
    metrics/              # MetricsModule, MetricsService, MetricsInterceptor, /metrics controller
    queues/               # QueuesModule, queue-names; BullMQ on the shared Redis
    mailer/               # MailerService + Resend/Log impls, EmailDispatcher, EmailProcessor, templates
    decorators/           # @Public, @CurrentUser, @CurrentWorkspace, @RequirePermissions, @Audit, @RateLimit
    filters/              # AllExceptionsFilter (normalized error envelope)
    guards/               # JwtAuthGuard (global), CustomThrottlerGuard (global), WorkspaceGuard, PermissionsGuard
    interceptors/         # PerformanceInterceptor, MetricsInterceptor, AuditInterceptor (all global)
    pipes/ utils/ types/
infra/
  prometheus/prometheus.yml
  prometheus/rules/       # SLO alert rules
  alertmanager/           # alertmanager.yml + Discord entrypoint
  grafana/provisioning/   # auto-provisioned datasource + dashboards
  grafana/dashboards/     # JSON dashboards (committed)
test/
  helpers/                # test-app, test-database (Testcontainers)
  *.e2e-spec.ts
prisma/
  schema.prisma  migrations/  seed.ts
```

## Endpoints

All paths below are prefixed with `/api/v1` unless marked otherwise. URI versioning is enabled with default `v1`. `/health` and `/health/ready` are version-neutral and live outside the prefix.

Auth model:

- `JwtAuthGuard` is global. Routes default to authenticated; public routes opt out with `@Public()`.
- Workspace-scoped routes additionally require `WorkspaceGuard` + a permission check via `@RequirePermissions(...)`. Send the workspace via the `x-workspace-id` header (or `:workspaceId` route param when present). Super admins (members of the `__admin__` workspace) bypass workspace membership checks.

### Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | public | Create user + personal workspace; auto-enqueues a verification email |
| `POST` | `/auth/login` | public | Returns tokens, or `{ requires2FA, challenge }`. **Throws 403 if email is not verified.** |
| `POST` | `/auth/refresh` | public | Rotate refresh token |
| `GET`  | `/auth/me` | bearer | Current user, workspaces, `isSuperAdmin` |
| `POST` | `/auth/verify-email/request` | bearer | Resend the verification email |
| `POST` | `/auth/verify-email` | public | Body `{ token }`; marks user verified |
| `POST` | `/auth/forgot-password` | public | Body `{ email }`; always 204 (no enumeration) |
| `POST` | `/auth/reset-password` | public | Body `{ token, newPassword }`; revokes all sessions |
| `POST` | `/auth/2fa/setup` | bearer | Generate TOTP secret + otpauth URL |
| `POST` | `/auth/2fa/enable` | bearer | Activate 2FA after first valid code; returns 10 recovery codes (shown once) |
| `POST` | `/auth/2fa/disable` | bearer | Requires password + current TOTP |
| `POST` | `/auth/2fa/verify` | public | Complete 2FA-required login (TOTP **or** recovery code) |

> See [Email & account lifecycle](#email--account-lifecycle) below for token TTLs, mailer providers, and the email-verified gate.

### OAuth (`/auth/oauth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET`  | `/auth/oauth/:provider/login` | public | Begin login flow; returns `{ authorizationUrl }` |
| `POST` | `/auth/oauth/:provider/link` | bearer | Begin account-linking flow; returns `{ authorizationUrl }` |
| `POST` | `/auth/oauth/:provider/callback` | public | Body: `{ code, state }`. Returns tokens (login) or link confirmation |
| `GET`  | `/auth/oauth/accounts` | bearer | List linked OAuth accounts |
| `DELETE` | `/auth/oauth/accounts/:id` | bearer | Unlink (blocks if it's the only credential) |

`:provider` ∈ `google` | `github`. State is a signed JWT (5 min TTL) — no server-side session needed. If a provider isn't configured (env vars missing), endpoints for it return 404.

OAuth flow:

1. Frontend hits `GET /auth/oauth/google/login` → receives `authorizationUrl`.
2. User is redirected to the provider, signs in, and is sent to `*_CALLBACK_URL` with `?code=...&state=...`.
3. Frontend forwards `{ code, state }` to `POST /auth/oauth/google/callback`.
4. If the provider identity is already linked → tokens returned. Else if email is unknown → user + personal workspace created and tokens returned. Else (email exists, no link) → 409: user must sign in and link from settings.

### Sessions (`/auth/sessions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET`    | `/auth/sessions` | bearer | List active sessions for current user |
| `DELETE` | `/auth/sessions/:id` | bearer | Revoke one session |
| `DELETE` | `/auth/sessions` | bearer | Revoke all sessions except the current one |

### Workspaces (`/workspaces`)

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET`    | `/workspaces` | – | List workspaces the user belongs to (filters out `__admin__`) |
| `GET`    | `/workspaces/:workspaceId` | `workspace:read` | Get workspace |
| `PATCH`  | `/workspaces/:workspaceId` | `workspace:update` | Update name (admin workspace blocked) |
| `DELETE` | `/workspaces/:workspaceId` | `workspace:delete` | Soft delete (admin + personal blocked) |

### Users (`/users`) — workspace-scoped, requires `x-workspace-id`

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET`    | `/users` | `user:read` | Paginated list (`?page&limit&search`) |
| `GET`    | `/users/:id` | `user:read` | Get by id within workspace |
| `POST`   | `/users` | `user:create` | Create + add as member |
| `PATCH`  | `/users/:id` | `user:update` | Update name/email |
| `DELETE` | `/users/:id` | `user:delete` | Soft delete |

### RBAC (`/rbac/roles`) — workspace-scoped

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET`    | `/rbac/roles` | `role:read` | List roles |
| `POST`   | `/rbac/roles` | `role:create` | Create role |
| `PATCH`  | `/rbac/roles/:id` | `role:update` | Rename/redescribe (system roles blocked) |
| `DELETE` | `/rbac/roles/:id` | `role:delete` | Delete role (blocked if in use; system roles blocked) |
| `POST`   | `/rbac/roles/:id/permissions` | `role:update` | Assign a permission key |

Built-in permissions: `user:{read,create,update,delete}`, `workspace:{read,update,delete,invite,remove_member}`, `role:{read,create,update,delete,assign}`, `audit:read`. Super admin role has all of them.

### Invitations (`/invitations`) — workspace-scoped except `accept`

| Method | Path | Auth / Permission | Description |
|---|---|---|---|
| `GET`    | `/invitations` | `workspace:invite` | List pending invitations |
| `POST`   | `/invitations` | `workspace:invite` | Send (returns the acceptance token — wire your email service to deliver it) |
| `DELETE` | `/invitations/:id` | `workspace:invite` | Revoke pending invitation |
| `POST`   | `/invitations/accept` | bearer | Accept by token; logged-in email must match |

Tokens are stored as sha256 hashes; TTL is 7 days; expired or accepted tokens return 400.

### Audit (`/audit-logs`) — workspace-scoped

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/audit-logs` | `audit:read` | Paginated; filter by `userId`, `action`, `from`, `to` |

The `AuditInterceptor` is global — endpoints decorated with `@Audit({ action, resource })` are recorded automatically.

### Health (`/health`) — outside `/api/v1`, no auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness — always 200 if process is up |
| `GET` | `/health/ready` | Readiness — pings the database, 503 if down |

## Password policy

Anywhere a password is accepted (`POST /auth/register`, `POST /users`), the field is validated by `@IsStrongPassword()` (`src/shared/decorators/is-strong-password.decorator.ts`), backed by the rules in `src/shared/utils/password-policy.util.ts`.

| Rule | Default |
|---|---|
| Length | 12 – 128 characters |
| Character classes | at least one uppercase, lowercase, digit, special |
| Whitespace | not allowed |
| Repeated characters | no run longer than 3 of the same char (`aaaa` rejected) |
| Sequences | no ascending/descending runs of length ≥ 4 (`1234`, `dcba`) and no 4-char keyboard slices (`qwer`, `asdf`, `1234`) |
| Common passwords | small inline blocklist (`password`, `qwerty`, `admin123`, …) |
| Personal info | password must not contain the user's name (per word) or email local-part if those tokens are ≥ 4 chars |

All violations for a single password are returned together in the `details` array of the validation error envelope, joined with `; ` so the client can split or render them as a list.

To extend:

- **Tighten thresholds**: edit `PASSWORD_POLICY` in `password-policy.util.ts`.
- **Add a custom rule**: append a check inside `validatePasswordPolicy` returning a string in the violation list.
- **Add a forbidden password**: append to `COMMON_PASSWORDS`.
- **Apply to a new DTO**: `@IsStrongPassword()` on the field; if you want personal-info checks, expose `email` and/or `name` on the same DTO (the constraint reads them via `args.object`).

## Logging

Structured logs via [`nestjs-pino`](https://github.com/iamolegga/nestjs-pino) and [`pino-http`](https://github.com/pinojs/pino-http). Configured in `src/config/logger.config.ts`.

**Per-request log line** (one per response):

```json
{
  "level": 30,
  "time": 1736250000000,
  "msg": "POST /api/v1/auth/login 200 124ms",
  "requestId": "9e7a...uuid",
  "durationMs": 124,
  "userId": "uuid-of-authenticated-user",
  "workspaceId": "uuid-of-target-workspace",
  "role": "Owner",
  "request": { "method": "POST", "url": "/api/v1/auth/login", "id": "9e7a..." },
  "response": { "statusCode": 200 }
}
```

Highlights:

- **Per-status log level** — `info` for 2xx/3xx, `warn` for 4xx, `error` for 5xx (so a `level >= 40` filter shows only failures).
- **Correlation ID** — every request gets a UUID (or honours an inbound `x-request-id` header for cross-service tracing). The same id is echoed back in the `x-request-id` response header so clients can include it in bug reports.
- **User / workspace context** — once the JWT and workspace guards run, every subsequent log line on that request carries `userId`, `workspaceId`, and `role` automatically.
- **Header redaction** — `authorization` and `cookie` are redacted; controllers should never log the raw request body for sensitive payloads (the `AuditInterceptor` already redacts `password`, `passwordHash`, `refreshToken`, `twoFactorSecret`, `recoveryCodes`).

### Performance signals

| Signal | Where | Trigger | Default threshold |
|---|---|---|---|
| `durationMs` on every request | pino-http (response complete) | always | – |
| `Slow request` warn | `PerformanceInterceptor` (handler-level) | handler exceeds threshold | `LOG_SLOW_REQUEST_MS` (1000ms) |
| `Slow query` warn | `PrismaService` `query` event | individual SQL exceeds threshold | `LOG_SLOW_QUERY_MS` (100ms) |

Slow-request log line:

```json
{ "level": 40, "msg": "Slow request", "handler": "UsersController.list",
  "url": "/api/v1/users", "durationMs": 1432, "thresholdMs": 1000, "requestId": "..." }
```

Slow-query log line:

```json
{ "level": 40, "msg": "Slow query", "durationMs": 218, "thresholdMs": 100,
  "query": "SELECT \"User\".* FROM \"User\" WHERE ...", "params": "[\"...\"]" }
```

### Env vars

| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) / `silent` (test) | `fatal` `error` `warn` `info` `debug` `trace` `silent` |
| `LOG_PRETTY` | `true` outside production | Use `pino-pretty` (human-readable single-line). Set `false` in containers to keep raw JSON for log shipping. |
| `LOG_SLOW_REQUEST_MS` | `1000` | Threshold for the slow-request interceptor warn |
| `LOG_SLOW_QUERY_MS` | `100` | Threshold for Prisma slow-query warn |

### Tips

- **Grep one user's traffic**: `… | jq 'select(.userId == "uuid")'`.
- **Reproduce a customer-reported issue**: ask for the `x-request-id` from the response — it appears in `requestId` on every log line for that request.
- **Behind a reverse proxy**: set `app.set('trust proxy', true)` in `main.ts` so `req.ip` reflects the real client (also matters for rate limiting).
- **Production**: set `LOG_PRETTY=false` to keep raw JSON; pino's NDJSON is what most log shippers expect.

## Observability — Prometheus + Grafana

Metrics are exposed in Prometheus text format at `GET /metrics` (outside `/api/v1`). The endpoint is wired by `MetricsController` (`src/shared/metrics/metrics.controller.ts`); the `MetricsInterceptor` is global and captures every HTTP request.

### What's instrumented

| Metric | Type | Labels | Source |
|---|---|---|---|
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | `MetricsInterceptor` (every request) |
| `http_requests_total` | Counter | `method`, `route`, `status_code` | `MetricsInterceptor` |
| `auth_login_attempts_total` | Counter | `result` ∈ {`success`, `failure`, `requires_2fa`} | `LoginUseCase` |
| `auth_register_total` | Counter | `result` ∈ {`success`, `conflict`} | `RegisterUseCase` |
| `auth_2fa_enable_total` | Counter | `result` ∈ {`success`, `invalid_code`, `not_found`} | `EnableTwoFactorUseCase` |
| `auth_2fa_verify_total` | Counter | `result` ∈ {`success`, `invalid_challenge`, `invalid_code`} | `VerifyTwoFactorUseCase` |
| `database_query_duration_seconds` | Histogram | `operation` ∈ {`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `OTHER`} | `PrismaService.$on('query')` |
| `nodejs_*`, `process_*` | various | – | `prom-client` default metrics (heap, GC, event-loop lag, RSS, FDs) |

The `route` label uses Express route templates (e.g. `/users/:id`, not `/users/abc123`) so cardinality stays bounded. Unknown handlers (404s) get `route="unknown"`.

### Protecting `/metrics`

`MetricsIpAllowlistGuard` (`src/shared/metrics/metrics-ip-allowlist.guard.ts`) enforces `METRICS_ALLOWED_IPS`:

- **Empty / unset** → endpoint is open (good for local dev).
- **CSV of IPs** → only those `req.ip` values pass; anything else gets `403`.

Behind a reverse proxy you must set `app.set('trust proxy', true)` in `main.ts` so the client IP — not the proxy's — is what the guard sees. Production should always allowlist (loopback + the Prometheus scraper).

### Running the stack locally

`docker-compose.yml` ships Prometheus and Grafana alongside Postgres and Redis:

```bash
docker compose up -d         # postgres + redis + prometheus + grafana
pnpm run start:dev           # API on :3000

# scrape endpoint
curl -s http://localhost:3000/metrics | head -40

# Prometheus UI (query / target health)
open http://localhost:9090

# Grafana — login = ${GRAFANA_ADMIN_USER:-admin} / ${GRAFANA_ADMIN_PASSWORD:-admin}
open http://localhost:3001
```

The Grafana port is **3001** on the host (mapped to the container's `3000`) to avoid colliding with the API. The dashboard "Workspace API — Overview" is auto-provisioned in folder *Workspace API* on first boot.

### What's in the dashboard

`infra/grafana/dashboards/api-overview.json` (10 panels, `refresh: 10s`):

- **Request rate (RPS) by route** — `sum by (method, route) (rate(http_requests_total[1m]))`
- **Error rate (5xx %)** — color-coded thresholds (green / yellow at 1% / red at 5%)
- **HTTP latency P50 / P95 / P99** — `histogram_quantile` over `http_request_duration_seconds_bucket`
- **DB query P95 by operation** — same shape over `database_query_duration_seconds_bucket`
- **Login attempts by result** — stacked bars (success/failure/requires_2fa)
- **2FA verify success rate (5m)**, **2FA enables (5m)** — single stats
- **Node.js heap used / total**, **event-loop lag P99**, **GC duration rate**

To add a panel, edit the JSON or save a new version through the Grafana UI (`allowUiUpdates: true` in the provisioning config) — but commit the JSON back to `infra/grafana/dashboards/` to keep it reproducible.

### Provisioning files

```
infra/
  prometheus/prometheus.yml                          # scrape config (host.docker.internal:3000/metrics, 15s)
  grafana/
    provisioning/datasources/prometheus.yml         # auto-add the Prometheus datasource
    provisioning/dashboards/dashboards.yml          # load JSONs from /var/lib/grafana/dashboards
    dashboards/api-overview.json                    # the dashboard
```

Prometheus scrapes the **host** at `host.docker.internal:3000` because the API normally runs via `pnpm run start:dev` outside Docker. The `extra_hosts: host-gateway` mapping in compose makes this work on Linux too.

## Rate limiting

Throttling is enforced globally by `CustomThrottlerGuard` (`src/shared/guards/custom-throttler.guard.ts`), an extension of `@nestjs/throttler`'s `ThrottlerGuard` that **tracks by authenticated user ID first, falling back to IP** when `req.user` is absent (public routes). The default reads `THROTTLE_TTL` (seconds) and `THROTTLE_LIMIT` from env — **100 requests per 60 seconds**.

Tracker keys are namespaced (`user:<id>` or `ip:<address>`) so a user behind a NAT shares neither the IP bucket nor a UUID collision space. The guard runs **after** `JwtAuthGuard` so `req.user.id` is populated for protected routes.

Sensitive endpoints override the default with tighter limits via `@RateLimit('<key>')` (`src/shared/decorators/rate-limits.ts`):

| Endpoint | Limit | Window | Reason |
|---|---|---|---|
| `POST /auth/register` | 5 | 15 min | abuse / signup spam |
| `POST /auth/login` | 10 | 1 min | password brute-force |
| `POST /auth/refresh` | 30 | 1 min | legitimate clients refresh frequently |
| `POST /auth/2fa/verify` | 10 | 1 min | TOTP / recovery code brute-force |
| `POST /auth/2fa/enable` | 5 | 15 min | sensitive mutation |
| `POST /auth/2fa/disable` | 5 | 15 min | sensitive mutation |
| `GET /auth/oauth/:provider/login` | 20 | 1 min | flow start |
| `POST /auth/oauth/:provider/link` | 20 | 1 min | flow start |
| `POST /auth/oauth/:provider/callback` | 20 | 1 min | code exchange |
| `POST /invitations/accept` | 10 | 1 min | invitation token brute-force |

All other authenticated endpoints fall back to the global default. Health checks (`/health`, `/health/ready`) opt out via `@SkipThrottle`. When `NODE_ENV=test`, the guard is short-circuited via `skipIf` so e2e suites aren't penalised for repeated requests from the same IP.

To add a new tightened limit:

```ts
// src/shared/decorators/rate-limits.ts
export const RATE_LIMITS = {
  // ...
  myEndpoint: { limit: 3, ttl: minutes(5) },
};

// in the controller
@RateLimit('myEndpoint')
@Post('something')
```

Behind a reverse proxy, set `app.set('trust proxy', true)` in `main.ts` so `req.ip` reflects the real client IP — otherwise everyone shares the proxy's IP and limits become useless.

## Caching

A Redis-backed cache layer lives in `src/shared/cache/` and is **transparent to use cases** — it's applied via decorators on repository methods. In `NODE_ENV=test`, the module switches to in-memory automatically so the test suite needs no Redis.

### Stack

| Piece | Purpose |
|---|---|
| `cache-manager` v7 + `@nestjs/cache-manager` v3 | NestJS-friendly wrapper around Keyv |
| `@keyv/redis` | Redis store (connects to `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`) |
| `CacheService` | App wrapper exposing `wrap`, `bumpNamespace`, `buildKey` (`src/shared/cache/cache.service.ts`) |
| `@Cacheable({ namespace, key, ttlMs })` | Method decorator on repository reads |
| `@InvalidateCache(...namespaces)` | Method decorator on repository writes — bumps namespace versions |

### Where it's applied

Caching is on the **repository layer** (not use cases), so any caller — use case, seed script, future feature — gets it for free.

| Repo method | Namespace | TTL | Why |
|---|---|---|---|
| `permissions.findAll` | `permissions` | 24h | Static seed data; rarely changes |
| `roles.findManyByWorkspace` | `roles` | 1h | Read on RBAC list endpoints |
| `users.findById` / `findByIdInWorkspace` | `users` | 15min | Hot on user CRUD |
| `members.findByUserAndWorkspace` / `findSuperAdminMembership` | `workspace_members` | 1min | **`WorkspaceGuard` runs on every authenticated request** with a 3-level JOIN — biggest win |

### Invalidation strategy: namespace + version bump

Each cache key embeds a version stamp for its namespace: `users:v3:id:abc`. Mutations bump the version (`users:v4:...`) — old keys become orphaned and expire by TTL. No need to enumerate or pattern-delete keys.

| Mutation | Namespaces bumped |
|---|---|
| `roles.create` | `roles` |
| `roles.update` / `roles.delete` | `roles`, `workspace_members` |
| `users.update` | `users` |
| `users.softDelete` | `users`, `workspace_members` |
| `members.create` / `updateRole` / `delete` | `workspace_members` |

### Adding cache to a new repo method

```ts
import { Cacheable } from '@shared/cache/cacheable.decorator';
import { InvalidateCache } from '@shared/cache/invalidate-cache.decorator';
import { CACHE_NS, CACHE_TTL } from '@shared/cache/cache.constants';

@Injectable()
export class PrismaWidgetsRepository extends WidgetsRepository {
  @Cacheable({
    namespace: CACHE_NS.widgets,             // add to cache.constants.ts
    key: (id: string) => `id:${id}`,
    ttlMs: CACHE_TTL.fifteenMinutes,
  })
  findById(id: string) { ... }

  @InvalidateCache(CACHE_NS.widgets)
  update(id: string, data: ...) { ... }
}
```

> **Heads-up on `tsconfig`:** when a method has a decorator, types referenced in its signature must be imported with `import type` (TS error `TS1272` under `isolatedModules + emitDecoratorMetadata`). Split your import statement when needed.

Null results are intentionally **not cached** as cache hits — `CacheService.wrap` re-invokes the function when the stored value is `null`, so a "user not found" lookup doesn't poison the cache.

## Background jobs (BullMQ)

`@nestjs/bullmq` runs on the same Redis instance as the cache and the throttler storage. The `QueuesModule` (`src/shared/queues/queues.module.ts`) is global and registers a default job policy: `attempts: 3`, exponential backoff, `removeOnComplete: { age: 24h, count: 1000 }`, `removeOnFail: { age: 7d }`.

Available queues are listed in `src/shared/queues/queue-names.ts`. Today the only one is `emails`.

To wire a new processor:

```ts
@Processor(QUEUE.myQueue)
export class MyProcessor extends WorkerHost {
  async process(job: Job<MyJobData>): Promise<void> { ... }
}
```

Then add it to the providers of a module that imports `QueuesModule`. Use `@InjectQueue(QUEUE.myQueue)` to get a `Queue` instance for enqueuing.

## Email & account lifecycle

The mailer is abstracted by `MailerService` (`src/shared/mailer/mailer.service.ts`), with two implementations:

| `EMAIL_PROVIDER` | Implementation | When to use |
|---|---|---|
| `log` (default) | `LogMailerService` | dev/test — writes the email to logs, doesn't send |
| `resend` | `ResendMailerService` | prod — uses `RESEND_API_KEY` to call Resend's API |

Emails are not sent inline. The use cases call `EmailDispatcher.enqueue(...)`, which adds a `send-email` job to the BullMQ `emails` queue. `EmailProcessor` (`src/shared/mailer/email.processor.ts`) consumes the job and calls the mailer. This means a slow or failing provider never blocks an HTTP request.

Templates are inline TS in `src/shared/mailer/templates.ts` — invitation, email verification, and password reset.

### Email-verified gate

The `User` model has `emailVerifiedAt`. Login throws `403 Forbidden` (`Email not verified.`) if the user has a password and hasn't verified yet. OAuth flows are unaffected (verified externally).

### Endpoints (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/verify-email/request` | bearer | Resend the verification email to the current user |
| `POST` | `/auth/verify-email` | public | Body `{ token }`; marks user verified |
| `POST` | `/auth/forgot-password` | public | Body `{ email }`; always 204 (no enumeration) |
| `POST` | `/auth/reset-password` | public | Body `{ token, newPassword }`; revokes all sessions |

`POST /auth/register` automatically enqueues the verify-email message — no manual call needed. Tokens are 32 random bytes (hex), stored as sha256 hashes (`EmailVerifyToken`, `PasswordResetToken`); verify TTL is 24h, reset TTL is 1h. Both have `usedAt` for one-shot enforcement.

## Alerting (Alertmanager → Discord)

`docker-compose.yml` ships an `alertmanager` service alongside Prometheus. Rules live in `infra/prometheus/rules/api-alerts.yml` and define:

| Alert | Severity | Trigger |
|---|---|---|
| `HighErrorRate` | page | 5xx rate > 5% for 5m |
| `ElevatedErrorRate` | warn | 5xx rate > 1% for 10m |
| `HighLatencyP95` | warn | HTTP P95 > 1s for 10m |
| `HighDbQueryP95` | warn | DB P95 by op > 500ms for 10m |
| `HighEventLoopLag` | warn | Node.js event loop P99 > 200ms for 5m |
| `TargetDown` | page | Prometheus can't scrape `/metrics` for 2m |

Alertmanager (`infra/alertmanager/alertmanager.yml`) routes everything to a Discord webhook. The webhook URL is read from `ALERT_DISCORD_WEBHOOK_URL` at container start (entrypoint script writes it to `/etc/alertmanager/discord-webhook.url`).

To set up:

```bash
# Get a Discord webhook URL: Server Settings → Integrations → Webhooks → New Webhook
echo "ALERT_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/..." >> .env
docker compose up -d alertmanager prometheus
open http://localhost:9093  # Alertmanager UI
```

To validate end-to-end, generate some 5xx by killing the API briefly — Prometheus will fire `TargetDown` after 2m and you should see a Discord post.

## Background-tier reliability

| Concern | How it's handled |
|---|---|
| Multi-instance rate limiting | Throttler uses Redis storage (`@nest-lab/throttler-storage-redis`) so all pods share the same counters. |
| Graceful shutdown | `app.enableShutdownHooks()` in `main.ts`; Prisma + Redis (cache) + BullMQ workers close on SIGTERM. |
| `req.ip` behind a proxy | Set `TRUST_PROXY=1` (or higher hop count) so rate limit, IP allowlist, and audit logs see the real client. |
| DB pool tuning | `DB_POOL_MAX` / `DB_POOL_IDLE_MS` / `DB_POOL_CONN_TIMEOUT_MS` in env. |

## Error envelope

All errors are normalized by `AllExceptionsFilter`:

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "User not found",
  "details": ["email must be a valid email"],
  "timestamp": "2026-05-08T12:34:56.789Z",
  "path": "/api/v1/users/abc",
  "requestId": "req-12",
  "stack": "..."
}
```

- `details` only on validation errors (400).
- `requestId` present when pino-http populated it.
- `stack` only outside `production`.
- Prisma errors are mapped: `P2002 → 409`, `P2025 → 404`, `P2003 → 409`, `P2014 → 400`.

## Testing

- `pnpm test` — unit tests (no Docker).
- `pnpm test:e2e` — full HTTP→DB tests against a real Postgres spun up by Testcontainers; runs migrations with `prisma migrate deploy`. Docker must be running.

Reset between e2e tests is `TRUNCATE … CASCADE` (see `test/helpers/test-database.ts`).

## CI

`.github/workflows/ci.yml`:

1. **`verify`** — install, `prisma generate`, `eslint --max-warnings 0`, `nest build`, unit tests.
2. **`e2e`** — runs after `verify`, executes the e2e suite with Testcontainers.

Triggered on PRs and pushes to `main`. Concurrency cancels superseded runs. Node and pnpm versions come from `engines` and `packageManager` in `package.json`.

## Backup & Recovery

### Manual backup

Requires `pg_dump` on `$PATH` and `DATABASE_URL` exported.

```bash
./scripts/backup-database.sh                                      # writes ./backups/workspace-api_<ts>.dump
BACKUP_DIR=/var/backups/workspace ./scripts/backup-database.sh    # custom destination
RETENTION_DAYS=7 ./scripts/backup-database.sh                     # tighter retention
```

The script writes a Postgres custom-format dump (`-Fc -Z 9`, native gzip-9 compression) and prunes dumps older than `RETENTION_DAYS` (default `30`).

### Automated daily backup

`.github/workflows/backup.yml` runs `scripts/backup-database.sh` every day at 03:00 UTC and uploads the dump as a workflow artifact (90-day retention). To enable:

1. Set repo secret `BACKUP_DATABASE_URL` to the production connection string.
2. Confirm the workflow is listed under **Actions → Database backup**.
3. Trigger an on-demand run from the Actions tab to validate end-to-end.

> Artifacts are tied to the GitHub repo and capped at 90-day retention. For longer retention or off-platform DR, mirror them to S3/GCS — out of scope here.

### Restore from backup

```bash
DATABASE_URL=postgresql://... ./scripts/restore-database.sh ./backups/workspace-api_20260509_030000Z.dump
```

The script prompts for confirmation (URL is shown with the password masked), runs `pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error`, then validates by running `prisma migrate status` and printing row counts for `User`, `Workspace`, `Role`, `Permission`, `WorkspaceMember`.

### RTO / RPO

- **RTO** (Recovery Time Objective): **1 hour** — fetch artifact, run `restore-database.sh`, smoke-test the API.
- **RPO** (Recovery Point Objective): **24 hours** — bound by the daily cron. Tighter RPO requires WAL archiving (out of scope).

### Disaster recovery checklist

1. Download the latest GitHub Actions backup artifact and verify it with `pg_restore --list <file.dump>`.
2. Provision a new Postgres instance and export `DATABASE_URL`.
3. Run `./scripts/restore-database.sh <file.dump>`.
4. Confirm `prisma migrate status` shows no pending migrations and row counts match expectations.
5. Smoke-test the API: register, login, list workspaces.
6. Rotate `JWT_*_SECRET` and `ENCRYPTION_KEY` only if the originals may have leaked — otherwise keep them so existing sessions and encrypted 2FA secrets remain valid.
