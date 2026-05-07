# Workspace API — Guia para Claude

API NestJS multi-tenant com RBAC, autenticação JWT, 2FA, audit logging e super admin global. Use este documento como contrato — siga estritamente.

## Stack

- **NestJS 11** + Express + TypeScript (strictNullChecks, target ES2023)
- **Prisma 7** com adapter `@prisma/adapter-pg` (PostgreSQL)
- **Auth**: Passport JWT (access 15m, refresh 7d), Argon2id, otplib (TOTP)
- **Validação**: class-validator + class-transformer (controllers); Zod (env)
- **Logging**: nestjs-pino (redact em headers `authorization` e `cookie`)
- **Outros**: helmet, throttler, swagger, husky + commitlint (Conventional Commits)

## Arquitetura

Cada módulo de domínio segue 4 camadas — não invente outras:

```
src/modules/<nome>/
  http/
    <nome>.controller.ts        # HTTP routing, ApiTags, decorators
    dto/                        # class-validator DTOs (input)
  use-cases/
    <verbo>-<recurso>.use-case.ts   # 1 caso de uso por arquivo, classe @Injectable
  services/                     # opcional: lógica reutilizável (TokenService, etc.)
  repositories/
    <recurso>.repository.interface.ts   # abstract class (SEM Symbol, SEM interface I*)
    prisma-<recurso>.repository.ts      # extends da abstract class
  entities/
    <recurso>.entity.ts         # POJO simples (sem decorators ORM)
  <nome>.module.ts
```

Compartilhado fica em `src/shared/` (guards, interceptors, decorators, utils, types, database). Aliases: `@modules/*`, `@shared/*`, `@core/*`.

## Repository pattern (DI via abstract class)

**Repositórios são abstract classes — não interfaces.** Isso elimina a duplicação `Symbol + import type + @Inject`. O nome do arquivo permanece `*.repository.interface.ts` por convenção, mesmo definindo `abstract class`.

```ts
// users.repository.interface.ts
export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract create(data: CreateUserData): Promise<User>;
}

// prisma-users.repository.ts
@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private prisma: PrismaService) {
    super();
  }
  async findById(id: string) { ... }
  async create(data: CreateUserData) { ... }
}

// users.module.ts
providers: [{ provide: UsersRepository, useClass: PrismaUsersRepository }]
exports: [UsersRepository]

// any consumer
constructor(private users: UsersRepository) {}   // 1 import, sem @Inject, sem Symbol
```

**Regras desse padrão:**
- Implementações usam `extends`, **nunca** `implements`.
- A derivada **deve** chamar `super()` no construtor.
- Não recriar `Symbol`s — a classe abstrata **é** o token de DI.
- Não usar `@Inject(UsersRepository)` — Nest resolve por reflexão de tipo.

## Regras inegociáveis

0. **Tudo em inglês**. Identificadores, comentários, mensagens de erro, descriptions de Swagger, mensagens de validação, console.log, seed data — **tudo**. Nada de português no código, mesmo que o time fale português. A única exceção é a comunicação humana (chat, commits podem ser PT) — código não.
1. **Sem `any`**. Tipos explícitos sempre. Use `unknown` + narrow se preciso. Exceção justificada: campos `Record<string, any>` que cruzam a fronteira do Prisma JSON (ver `audit-logs.repository.interface.ts` — comente com `eslint-disable-next-line`).
2. **Repos via abstract class** (regra acima).
3. **Use cases não falam HTTP**. Lançam `BadRequestException`, `UnauthorizedException`, etc., mas não conhecem `Request`/`Response`.
4. **Controllers são finos**. Apenas: validar DTO, extrair contexto (user, workspace), chamar use-case, retornar.
5. **Multi-tenant por header**. Toda rota protegida por workspace recebe `x-workspace-id` (ou `:workspaceId` em params). O `WorkspaceGuard` carrega membership e permissões em `req.workspace` e `req.permissions`.
6. **Permissões via decorator**. `@RequirePermissions('user:delete')` antes do handler. Permissões são keys string (ver `src/modules/rbac/constants/permissions.ts`).
7. **Soft delete**. `deletedAt` em User/Workspace. Queries de leitura sempre filtram `deletedAt: null`.
8. **Senhas com Argon2id**. Use `CryptoUtil.hashPassword` / `verifyPassword`. Nunca compare strings ou use bcrypt/sha256 para senha.
9. **Secrets sensíveis (2FA, etc.) criptografados** com `CryptoUtil.encrypt/decrypt` usando `env.ENCRYPTION_KEY`.
10. **Tokens hash sha256** antes de persistir (refresh tokens em `Session.refreshTokenHash`, recovery codes em `User.recoveryCodes`).
11. **Audit automático**. `AuditInterceptor` é global. Não logue manualmente; use `@Audit('action.name')` se precisar customizar.
12. **JwtAuthGuard é global**. Marque rotas públicas com `@Public()`. Não importe o guard manualmente.

## Estilo de código

- **Conciso > defensivo**. Validar só nas bordas (DTO, env, repos). Não duplique checks.
- **Sem comentários explicando o "o que"**. Identificadores claros bastam. Comente só "porquês" não-óbvios.
- **Sem fallbacks especulativos**. Nada de `?? defaultMágico` para ramos que nunca acontecem.
- **Não criar README/docs novos** salvo pedido explícito.
- **Erros**: prefira exceções HTTP do Nest (`UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `BadRequestException`, `ConflictException`).
- **Formato**: prettier + eslint configurados; rode `pnpm exec eslint <files> --fix` antes de finalizar.

## Padrões específicos

### Adicionar permissão nova
1. Adicione em `src/modules/rbac/constants/permissions.ts` (constante tipada)
2. Adicione no array `PERMISSIONS` de `prisma/seed.ts`
3. Use no controller: `@RequirePermissions(PERMISSIONS.X.Y)`
4. Rode `pnpm exec prisma db seed`

### Criar novo módulo
- Siga a estrutura de `src/modules/users/` como referência canônica
- Registre o módulo em `src/app.module.ts`
- Exporte os repos do módulo se outros módulos vão consumi-los

### DTOs
- 1 DTO por endpoint, 1 arquivo cada
- `@ApiProperty` em todos os campos (Swagger)
- `@Transform` para normalização (lowercase email, trim, etc.)
- Validações detalhadas com mensagens

## Super Admin global

- Workspace com slug `__admin__` (constante em `@modules/rbac/constants/system`)
- Role `SuperAdmin` no workspace admin tem TODAS as permissões
- `WorkspaceGuard` faz fallback: se user não é membro do workspace alvo, tenta `findSuperAdminMembership` → ganha permissões totais
- Provisionado via seed a partir de `SUPER_ADMIN_EMAIL/PASSWORD/NAME`
- **Nunca** crie endpoint que permita promover alguém a super admin pela API

## 2FA

- Secret armazenado **criptografado** em `User.twoFactorSecret`
- Recovery codes (10) armazenados como JSON de hashes sha256 em `User.recoveryCodes`
- Fluxo de login: senha OK + `twoFactorEnabled` → emite challenge JWT 5min → `/auth/2fa/verify` aceita TOTP **ou** recovery code
- Disable exige senha + TOTP atual (recovery não disable — força usuário comprometido a saber senha)

## Testing

Stack: Jest 30 + Supertest 7 + @nestjs/testing 11 + @testcontainers/postgresql 11 (Postgres real, isolado por job).

**3 padrões canônicos** (cada um tem um exemplo no repo, copie e cole):

| Tipo | Onde | Exemplo | Quando usar |
|------|------|---------|------------|
| Service puro | `src/.../*.spec.ts` | `two-factor.service.spec.ts` | Lógica sem deps externas |
| Use case com mocks | `src/.../*.spec.ts` | `register.use-case.spec.ts` | Use cases — mocka repos via `jest.Mocked<UsersRepository>` |
| E2E real | `test/*.e2e-spec.ts` | `auth.e2e-spec.ts` | Fluxo completo HTTP→DB com testcontainers |

**Regras:**
- Repos não são mockados em e2e — banco real via testcontainers, migrations via `prisma migrate deploy`.
- Use cases unitários: mocke o repo inteiro como `jest.Mocked<XRepository>` (a classe abstrata serve de tipo).
- E2E: import dos helpers no top, mas `createTestApp` via `require()` lazy dentro do `beforeAll` para que o container já esteja de pé antes do AppModule ler `DATABASE_URL`.
- Reset entre testes via `resetDatabase()` (TRUNCATE com CASCADE), não `DROP/CREATE`.
- Stub do `nanoid` em `test/stubs/nanoid.ts` (ESM-only). Outras libs ESM resolvem com `customExportConditions: ["node"]` no jest-e2e.

**Comandos:**
```bash
pnpm test                # unit (rápido, sem Docker)
pnpm test:watch          # unit em watch
pnpm test:cov            # unit + coverage
pnpm test:e2e            # e2e (precisa Docker)
```

**Antes de produção:** rode `pnpm test && pnpm test:e2e` no CI.

## Comandos

```bash
pnpm install
docker-compose up -d              # Postgres + Redis
pnpm exec prisma migrate dev      # aplica schema
pnpm exec prisma db seed          # popula permissions + super admin
pnpm run start:dev                # http://localhost:3000  •  docs: /docs
pnpm run build                    # build de produção
pnpm exec eslint src --fix        # lint
```

## O que NÃO fazer

- Não usar `any` (use `unknown` se precisar)
- Não usar `Symbol` para DI tokens — use abstract class
- Não usar `implements IXRepository` — use `extends XRepository`
- Não usar `@Inject(...)` para repos — Nest resolve por tipo
- Não criar arquivos `.md` de planning/decisão sem pedido explícito
- Não adicionar libs sem justificar (já temos otplib, argon2, etc.)
- Não amend commits — sempre criar novo commit
- Não comentar código "morto" — delete
- Não escrever testes a menos que seja pedido
- Não escrever docstring/JSDoc longo — uma linha basta
- Não criar abstrações para um único caso de uso
- Não exponha `passwordHash`, `twoFactorSecret` ou `recoveryCodes` em respostas HTTP

---

# Project guide for Claude (English)

NestJS multi-tenant API with RBAC, JWT auth, 2FA, audit logging, and global super admin. This contract is non-negotiable.

## DI pattern: abstract class repositories (no Symbols)

Repositories are **abstract classes**, never interfaces. The abstract class itself is the DI token, eliminating the `Symbol + import type + @Inject` triplet.

```ts
// repository.interface.ts
export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | null>;
}

// prisma-users.repository.ts
@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private prisma: PrismaService) { super(); }
  async findById(id: string) { ... }
}

// module
providers: [{ provide: UsersRepository, useClass: PrismaUsersRepository }]

// consumer
constructor(private users: UsersRepository) {}
```

Rules:
- Use `extends`, never `implements`.
- Always call `super()` in the derived constructor.
- Never declare `Symbol` tokens for repos.
- Never write `@Inject(UsersRepository)` — Nest resolves by type.

## Layered structure

```
src/modules/<name>/
  http/{<name>.controller.ts, dto/}
  use-cases/<verb>-<resource>.use-case.ts
  services/                # optional reusable logic
  repositories/{<r>.repository.interface.ts, prisma-<r>.repository.ts}
  entities/<r>.entity.ts
  <name>.module.ts
```

Shared code lives in `src/shared/`. Path aliases: `@modules/*`, `@shared/*`, `@core/*`.

## Hard rules

0. **Everything in English**. Identifiers, comments, error messages, Swagger descriptions, validation messages, console logs, seed data — **everything**. No Portuguese in code, even though the team speaks Portuguese. The only exception is human communication (chat, commit messages may be PT) — code is not.
1. **No `any`**. Use `unknown` and narrow. Exception: Prisma JSON fields (e.g. `Record<string, any>` with eslint-disable comment).
2. Repos via abstract class.
3. Use cases never know `Request`/`Response`. They throw `*Exception`.
4. Controllers are thin: validate DTO, extract user/workspace, call use-case, return.
5. Multi-tenant via `x-workspace-id` header. `WorkspaceGuard` populates `req.workspace`, `req.permissions`.
6. `@RequirePermissions('user:delete')` for permission checks.
7. Soft delete via `deletedAt`; reads always filter `deletedAt: null`.
8. Argon2id for passwords (`CryptoUtil.hashPassword`/`verifyPassword`).
9. Encrypt sensitive secrets (2FA, etc.) with `CryptoUtil.encrypt/decrypt` and `ENCRYPTION_KEY`.
10. Hash tokens (refresh tokens, recovery codes) with sha256 before persisting.
11. Audit interceptor is global; use `@Audit('action.name')` to override.
12. `JwtAuthGuard` is global; mark public routes with `@Public()`.

## Style

- Concise over defensive. Validate at boundaries (DTOs, env, repos) only.
- No "what" comments. Only "why" when non-obvious.
- No speculative fallbacks.
- Don't create new `.md` planning docs unless asked.
- Use Nest HTTP exceptions.
- Run `pnpm exec eslint src --fix` before finishing.

## Super admin

- Workspace slug `__admin__`, role `SuperAdmin` with all permissions.
- `WorkspaceGuard` falls back to `findSuperAdminMembership` if the user isn't a member of the target workspace.
- Provisioned by seed from `SUPER_ADMIN_EMAIL/PASSWORD/NAME` env vars.
- Never expose an API path that promotes someone to super admin.

## 2FA

- Secret stored **encrypted** in `User.twoFactorSecret`.
- 10 recovery codes stored as JSON of sha256 hashes in `User.recoveryCodes`.
- Login flow: password OK + `twoFactorEnabled` → 5-minute challenge JWT → `/auth/2fa/verify` accepts TOTP **or** a recovery code.
- Disable requires password + current TOTP (recovery cannot disable).

## Don'ts

- No `any`, no `Symbol` DI tokens, no `implements I*Repository`, no `@Inject(<repo>)`.
- No new docs without explicit request.
- No untriaged libs.
- No `--amend` commits — always new commits.
- No dead-code comments — delete.
- No tests unless asked.
- No long JSDoc — single-line max.
- No abstractions for a single use site.
- Never expose `passwordHash`, `twoFactorSecret`, or `recoveryCodes` in HTTP responses.
