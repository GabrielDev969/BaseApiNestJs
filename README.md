# Workspace API

Multi-tenant NestJS API with workspaces, RBAC, JWT auth, 2FA, OAuth (Google + GitHub), audit logging, and a global super admin.

- **Stack**: NestJS 11, Prisma 7 + PostgreSQL, Passport JWT, Argon2id, Zod, Pino, Helmet, Swagger, Jest + Testcontainers.
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

docker compose up -d                  # Postgres + Redis
pnpm exec prisma migrate dev          # apply schema
pnpm exec prisma db seed              # seed permissions + super admin
pnpm run start:dev                    # http://localhost:3000
```

Once the app is up:

- **API base**: `http://localhost:3000/api/v1`
- **Swagger UI** (dev only): `http://localhost:3000/docs`
- **Health**: `http://localhost:3000/health` and `/health/ready`

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
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | yes (seed) | provisioned by `prisma db seed` |
| `CORS_ORIGINS` | optional | comma-separated; defaults to `*` |

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
    database/             # PrismaService
    decorators/           # @Public, @CurrentUser, @CurrentWorkspace, @RequirePermissions, @Audit
    filters/              # AllExceptionsFilter (normalized error envelope)
    guards/               # JwtAuthGuard (global), WorkspaceGuard, PermissionsGuard
    interceptors/         # AuditInterceptor (global)
    pipes/ utils/ types/
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
| `POST` | `/auth/register` | public | Create user + personal workspace |
| `POST` | `/auth/login` | public | Returns tokens, or `{ requires2FA, challenge }` |
| `POST` | `/auth/refresh` | public | Rotate refresh token |
| `GET`  | `/auth/me` | bearer | Current user, workspaces, `isSuperAdmin` |
| `POST` | `/auth/2fa/setup` | bearer | Generate TOTP secret + otpauth URL |
| `POST` | `/auth/2fa/enable` | bearer | Activate 2FA after first valid code; returns 10 recovery codes (shown once) |
| `POST` | `/auth/2fa/disable` | bearer | Requires password + current TOTP |
| `POST` | `/auth/2fa/verify` | public | Complete 2FA-required login (TOTP **or** recovery code) |

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
