# Revisão crítica — Workspace API

Auditoria do estado atual contra a meta declarada: "base de API de produção para grandes empresas". Sem amenizar nada. Itens ordenados por severidade.

> Status: cada item é citado com `arquivo:linha` apontando para o código atual. Não confunda "blocker para enterprise" com "código ruim" — boa parte da base está acima da média; o problema é a distância até o padrão que clientes corporativos exigem.

---

## 🔴 CRÍTICO — vulnerabilidades de segurança

### 1. Account takeover via 2FA setup sem reverificação de senha

`src/modules/auth/use-cases/setup-2fa.use-case.ts` e `enable-2fa.use-case.ts` não exigem a senha atual.

Cenário real de ataque:

1. Atacante rouba access token (XSS, etc) — janela de 15 min.
2. `POST /auth/2fa/setup` → secret novo gerado, sem senha.
3. `POST /auth/2fa/enable` com o TOTP do app **do atacante** → 2FA ativado no autenticador dele. Recovery codes vão na resposta para ele.
4. Usuário legítimo **não consegue desativar**: `disable-2fa.use-case.ts:24-32` exige senha + TOTP atual. Atacante controla o TOTP. Recovery codes não desativam (regra do CLAUDE.md).

**Conta sequestrada permanentemente com janela de 15 minutos.** Disable exige senha mas enable não — assimetria fatal.

**Fix:** setup e enable precisam de senha (ou step-up auth recente, ≤ 5 min).

### 2. Token de convite armazenado em plaintext no banco

`prisma/schema.prisma:125` — `Invitation.token` é `String @unique`, sem hash. `prisma-invitations.repository.ts:27` faz `where: { token }` direto.

O `CLAUDE.md` exige: *"Hash tokens (refresh tokens, recovery codes) with sha256 before persisting"*. Regra violada justamente para o token mais sensível (concede membership a workspace).

Comparativo: `EmailVerifyToken.tokenHash`, `PasswordResetToken.tokenHash`, `Session.refreshTokenHash`, `User.recoveryCodes` — todos hashed. **Só o convite vaza em backup/dump/leak.**

**Fix:** `tokenHash` em vez de `token`, gerar token raw, devolver no email/response, persistir só hash.

### 3. Sem endpoint de logout — cookie nunca limpa

`grep "logout"` retorna **zero** matches. Existe `clearRefreshCookie` em `refresh-cookie.ts:23`, mas **nunca é chamado em lugar nenhum**.

`sessions.controller.ts` revoga sessões mas não limpa o cookie do refresh. Cliente faz "logout" no front, o cookie segue no browser válido até `maxAge` (7 dias). Combinado com #4 (revoke não invalida JWT) é grave.

**Fix:** `POST /auth/logout` que (a) revoga `req.user.sessionId`, (b) `clearRefreshCookie(res)`.

### 4. Revoke de sessão não invalida access token

`JwtStrategy.validate()` (`src/modules/auth/strategies/jwt.strategy.ts:18`) não consulta a tabela `Session`. Quando você revoga uma sessão, o JWT (15 min) **continua aceito** até expirar.

Para "grandes empresas" com requisito de force-logout imediato (employee fired, device stolen, breach), isso **não passa**.

**Fix:** validar `sessionId` do payload contra `Session.revokedAt` na strategy. Custo: 1 query/request — mitigar com cache Redis curto (15s).

### 5. OAuth state não vinculado ao browser do usuário

`oauth-state.service.ts` assina o `state` como JWT, sem nonce em cookie no browser que iniciou o flow.

**OAuth CSRF clássico**: atacante inicia login, captura state, induz vítima a completar o callback → vítima entra na conta do atacante (ou link na inversa).

Mitigação industry-standard:
- state hash em cookie HttpOnly (SameSite=Lax) + comparação no callback;
- PKCE (não implementado).

### 6. Soft delete de usuário não anonimiza PII (LGPD/GDPR)

`prisma-users.repository.ts:53-58` só faz `deletedAt = new Date()`. Permanecem no DB: `email`, `name`, `passwordHash`, `twoFactorSecret`, `recoveryCodes`, `ipAddress` em sessions/audit, e tudo em `AuditLog.metadata`.

Direito ao esquecimento (LGPD art. 18 / GDPR art. 17) exige delete real ou anonimização efetiva. **Para vender pra empresa europeia ou seguir LGPD no Brasil, blocker jurídico.**

Side effect: `User.email @unique` bloqueia recriação do mesmo email após soft-delete.

**Fix:** `anonymizeAndPurge(userId)` que nulifica/randomiza PII, mantém só o registro com `deletedAt` para integridade referencial dos audit logs.

### 7. Metrics endpoint aberto por padrão

`metrics-ip-allowlist.guard.ts:14`:

```ts
if (!allowed || allowed.length === 0) return true;
```

Se `METRICS_ALLOWED_IPS` não estiver setado → permite tudo. `/metrics` expõe estatísticas internas de DB, contagem de logins por outcome, default node metrics. Falha de config = vazamento.

`env.config.ts` marca a var como `optional` — em produção também pode rodar aberto.

**Fix:** em prod, `METRICS_ALLOWED_IPS` obrigatório (via Zod `.refine` como o `CORS_ORIGINS`). Default deny.

### 8. Linking de conta OAuth sem reverificação de senha

`handle-oauth-callback.ts:69-102` (`linkToUser`) não exige password.

Token roubado → atacante linka o GitHub/Google dele → **persistência após reset de senha** (porque OAuth login não exige senha do user vítima).

**Fix:** mesmo step-up auth do #1.

---

## 🟠 ALTO — bloqueadores de produção real

### 9. RBAC com furos funcionais grandes

`src/modules/rbac/constants/permissions.ts` define:
- `workspace:remove_member` → **não existe endpoint**
- `role:assign` → **não existe endpoint** para trocar role de membro

**Não há como, via API:**
- listar membros de um workspace com seus papéis
- mudar o papel de alguém
- remover membro
- transferir ownership do workspace

Multi-tenant B2B sem isso não é viável.

### 10. Sessions table cresce para sempre

`prisma-sessions.repository.ts:73` — `deleteExpired()` existe mas **nunca é chamado**. Não há `@nestjs/schedule`, cron, bull repeatable, nada.

Mesma situação para:
- `EmailVerifyToken` — sem cleanup
- `PasswordResetToken` — sem cleanup
- `AuditLog` — sem política de retenção (audit cresce indefinidamente)

Em 6-12 meses de produção a tabela `Session` tem milhões de linhas revogadas/expiradas. Custo de storage e latência de query crescem linearmente.

**Fix:** `@nestjs/schedule` com job diário OU bull repeatable job. Configurar retenção via env (`SESSION_RETENTION_DAYS`, `AUDIT_RETENTION_DAYS`).

### 11. `updateLastUsed` implementado mas nunca chamado

`sessions.repository.interface.ts:16` e `prisma-sessions.repository.ts:45` definem `updateLastUsed`. Grep no resto do código: **zero chamadas em src/** (só em specs e definições).

Sessões nunca atualizam `lastUsedAt` em uso. A coluna existe, é indexada (`@@index([expiresAt])`), mas é dead code. A UI "sessões ativas" mostra `lastUsedAt = createdAt` da última rotação. Indica implementação incompleta.

### 12. Auditoria incompleta — gap de compliance

Eventos de auth ausentes do audit log:
- `login` (success/failure)
- `logout`
- `password reset` (request e confirm)
- `2FA enable/disable`
- `email verified`
- `session revoke`
- `register`

Só roles, users, invitations, workspaces e oauth.link/login têm `@Audit`. Login só vai pro Prometheus (`incLoginAttempt`), não pro DB. Para SOC 2 / ISO 27001 isso falha.

### 13. Audit log mutável — sem integridade

Sem hash chaining, sem WORM, sem flag append-only no nível de banco. Qualquer um com acesso ao DB pode `DELETE FROM "AuditLog"` e a evidência some.

Para enterprise/regulado, audit log deve ser tamper-evident. Mínimo aceitável: hash do registro anterior em `AuditLog.prevHash` (Merkle/chain), permissões SQL que não permitam UPDATE/DELETE para a app role.

### 14. Sanitização de audit é denylist frágil

`audit.interceptor.ts:19` tem lista hard-coded:

```ts
const SENSITIVE_FIELDS = ['password', 'passwordhash', 'refreshtoken', 'accesstoken',
                          'token', 'secret', 'twofactorsecret', 'recoverycodes',
                          'authorization'];
```

Adicione amanhã um endpoint com `apiKey`, `clientSecret`, `newPassword`, `pin`, `cvv` — vaza tudo pro audit log. Padrão de produção: redact por **allowlist** (sé loga campos explicitamente seguros) ou pino-style patterns com path matching profundo.

### 15. PrismaService instancia pool em tempo de import

`src/shared/database/prisma.service.ts:13`:

```ts
const pool = new Pool({ connectionString: env.DATABASE_URL, ... });  // top-level
const adapter = new PrismaPg(pool);
```

Executa na importação do módulo. Quebra:
- isolamento de testes (não dá pra ter 2 PrismaService independentes)
- HMR / hot reload
- qualquer cenário multi-tenant com pool dedicado por tenant
- `OnModuleDestroy` chama `pool.end()` no singleton — segunda boot da app no mesmo processo falha

**Fix:** instanciar no constructor ou em factory provider.

### 16. Readiness probe ignora Redis e queue

`health.controller.ts:41` checa só Postgres. Sem Redis: cache falha, throttler falha, BullMQ trava (emails ficam parados). Kubernetes marca pod como ready e manda tráfego.

**Fix:** `RedisHealthIndicator` e checar pelo menos uma queue.

### 17. OAuth signup não seta `emailVerifiedAt`

`handle-oauth-callback.ts:134` cria user sem `emailVerifiedAt`. Mas o Google/GitHub provider já validou — o próprio provider rejeita se `!email_verified` (linhas 76 e 89 dos provider files).

Resultado: user OAuth-only é criado, é logado em sequência via `issueTokens` (que **não** checa email verificado), mas:
- não consegue logar via fluxo de senha (sem senha)
- `me` informa `twoFactorEnabled: false` mas a verificação de email aparece como pendente em qualquer lugar que consulte
- se um dia limparem cookies, são tratados como não verificados

**Fix:** setar `emailVerifiedAt: new Date()` no signup OAuth.

### 18. OAuth-only user sem fluxo "set password"

`forgot-password.use-case.ts:24` retorna early se `!user.passwordHash`. Usuário que entrou via Google e quer adicionar senha **não tem como**. UX comprometida; também segurança (forçado a depender só do provider externo).

### 19. Sem account lockout específico

Throttle: 10 logins/min por IP (`rate-limits.ts:6`). Atacante com botnet faz 10 logins/min/IP × N IPs. **Não há trava por conta** (`account_locked_at` após N tentativas falhas).

Padrão: 5 falhas em 15 min → lock 15-30 min. Independente de IP.

### 20. Sem rotação de chave JWT (sem `kid`)

Uma chave RS256 estática do env. Sem `kid` no header, sem JWKS endpoint, sem rotação programada. Comprometimento = revogar tudo manualmente.

Padrão SOC 2: rotação trimestral com período de overlap. Implementar `JWT_ACCESS_PRIVATE_KEY_CURRENT` + `JWT_ACCESS_PUBLIC_KEYS` (mapa kid→pub).

### 21. Sem revogação global / por escopo

Não há mecanismo para "invalidate all tokens issued before X" globalmente ou por user.

Casos:
- mudança de permissões → token vigente continua com perms antigas
- breach → não dá pra revogar tudo de uma vez sem dropar a tabela `Session`

**Fix:** `User.tokensInvalidatedAt` + checar no JwtStrategy contra `iat` do token.

---

## 🟡 MÉDIO — gaps de maturidade

### 22. Sem API keys / service accounts

Nada para autenticação backend-to-backend. Cliente corporativo que quer integrar via servidor não tem como sem fingir ser um usuário humano.

### 23. `bumpNamespace` não é atômico

`cache.service.ts:43-46` faz read-modify-write:

```ts
const next = (await this.getNamespaceVersion(namespace)) + 1;
await this.cache.set(this.versionKey(namespace), next);
```

Duas réplicas concorrentes podem terminar na mesma versão. Não catastrófico (chaves antigas viram órfãs e TTL limpa), mas o correto em Redis é `INCR` (atômico).

### 24. `CacheService.instance` static singleton

`cache.service.ts:6-9` quebra DI:

```ts
private static _instance: CacheService | null = null;
static get instance() { return CacheService._instance; }
onModuleInit() { CacheService._instance = this; }
```

Decorators (`@Cacheable`, `@InvalidateCache`) acessam via static. Se método cacheable rodar antes do `onModuleInit` → cache silenciosamente bypassed. Frágil, anti-testável.

**Fix:** `forwardRef` no constructor do interceptor / repassar via Reflector.

### 25. Repository lança `BadRequestException`

`prisma-roles.repository.ts:40` e `:132` lançam `BadRequestException`. Viola sua própria regra do CLAUDE.md: *"use cases throw `*Exception`"* — repositórios são camada de dados, sem semântica HTTP. Acoplamento.

### 26. Slow query log com `params` raw

`prisma.service.ts:64`:

```ts
this.logger.warn({
  msg: 'Slow query',
  durationMs: event.duration,
  query: event.query,
  params: event.params,  // <- emails, nomes, qualquer dado vai pro log
});
```

Pode vazar PII no log. Em produção: stripar, hashar ou só `query` sem params.

### 27. `connectionTimeoutMillis: 50_000` default

50 segundos esperando conexão. Cliente HTTP timeouta antes (ALB default 60s). Reduza para 5-10s. Pior: `idleTimeoutMillis: 30_000` (30s) com pool max 10 — sob carga, conexões reciclam direto.

### 28. CORS fallback `origin: env.CORS_ORIGINS ?? true`

`main.ts:23`. Em dev/test, `true` reflete qualquer Origin **com credentials** — laboratório de CSRF se algum endpoint não-Auth aceitar cookie. Validação Zod só obriga em production. Staging fica vulnerável.

### 29. Sem `Idempotency-Key` em POSTs sensíveis

Network retry pode criar 2 invites, 2 users, 2 roles. Padrão Stripe-style: header `Idempotency-Key` com store em Redis (24h TTL) — retorna a resposta original em retry.

### 30. Sem password history

Reset permite re-usar a senha anterior. Vários clientes enterprise exigem bloquear as últimas N senhas. Requer tabela `PasswordHistory` ou campo `passwordHashes: String[]`.

### 31. TOTP `verifyToken` usa `===`

`totp.util.ts:88` — comparação string não-constant-time. Para 6 dígitos em janela ±30s o ganho de timing é desprezível, mas o padrão é `crypto.timingSafeEqual`.

### 32. JWT sem `iss`, `aud`, `jti`

Sem `aud` não emite tokens diferentes para audiences distintos (web, mobile, integração de partner). Sem `jti` não dá pra revogar token individual. Padrão para escalar.

### 33. Cookie `SameSite=strict` + OAuth callback cross-domain

`refresh-cookie.ts:13` — `strict`. No fluxo atual o callback é POST do front, então o cookie é setado pela própria resposta. Funciona. Mas se um dia o callback virar GET redirect direto do provider, o browser não envia cookie em navegação top-level cross-site. `Lax` cobre os dois cenários.

### 34. `Permission` global (sem `workspaceId`)

Permissões hard-coded no schema, sem extensibilidade por tenant. Para SaaS B2B onde cada cliente pode ter permissões custom (`module:billing:read` só para tenants que pagaram), não há flexibilidade.

### 35. Sem feature flags por workspace

Gating de funcionalidade por tenant (plano, beta, etc.) é mandatório para SaaS enterprise. Nada implementado.

### 36. Sem nível "Organization" acima de "Workspace"

`Workspace.ownerId` é `User.id`. Não há:
- transferência de ownership
- múltiplos owners
- billing entity separada
- agrupamento de workspaces sob uma Organization (típico em B2B: 1 Org → N Workspaces, billing/seats/SSO no nível Org)

---

## 🟢 BAIXO — qualidade

### 37. `invitation.token` retornado no response

`invitation-response.dto.ts` aceita `includeToken: true`. O token também vai pelo email. Devolver via API é exposição extra. Para debug interno OK, para produção: remover do response.

### 38. Performance interceptor pode logar query strings sensíveis

`performance.interceptor.ts:31` loga `req.originalUrl`. Se algum endpoint passar token via query (`?token=...`), vai pro slow log. Hoje os tokens só estão em body — manter assim, mas vale comentar a invariante.

### 39. Endpoint `request-email-verification` exige auth — deadlock

`auth.controller.ts:247` — `requestEmailVerificationEndpoint` é auth-protected. Mas para logar precisa de email verificado (`login.use-case.ts:44`).

**Deadlock**: registrou, email não chegou, **não consegue logar para reenviar**. Tem que resetar via DB.

**Fix:** ou marcar `@Public()` aceitando email como body, ou liberar login mesmo sem verificação dando token com escopo restrito ("só pode reenviar verificação").

### 40. Sem pre-push hook rodando testes

`lint-staged` só roda ESLint+Prettier. Sem `pre-push` rodando `pnpm test`. CI pega, mas pra padrão enterprise um hook local evita push de código quebrado.

### 41. Sem Dependabot / Renovate config

Supply chain.

### 42. Sem SBOM e sem scan no CI

Sem Snyk / Trivy / Grype. Compliance.

---

## Resumo executivo

**Como base para CRUD multi-tenant intermediário:** acima da média. Boa estruturação de camadas, abstract-class repos para DI, RS256 com PEM via base64, Prisma+adapter-pg, observability stack completa, e2e com testcontainers, soft delete consistente em queries. Esqueleto sólido.

**Como "produção para grandes empresas":** **não passa**. Os 7 bloqueadores que precisam ser corrigidos antes de cobrar isso como enterprise-grade:

| # | Item | Tipo |
|---|------|------|
| 1 | Account takeover via 2FA enable sem senha | Vulnerabilidade ativa |
| 2 | Invitation token plaintext | Vulnerabilidade ativa |
| 3 | Sem logout (cookie nunca limpa) | Requisito básico |
| 4 | Revoke de sessão não invalida JWT | Force-logout impossível |
| 6 | Soft delete sem anonimização PII | LGPD/GDPR blocker |
| 12, 13 | Audit log incompleto e mutável | SOC 2 blocker |
| 9 | RBAC sem trocar role / remover membro | Multi-tenant inviável |
| 10 | Sem cleanup / retenção | Colapso operacional em 6-12 meses |

O restante é tier de maturação (API keys, key rotation, password history, idempotency, feature flags, Organization) — separa "boa SaaS" de "enterprise-ready", mas não é blocker imediato.

---

## Sugestão de ordem de ataque

1. **Sprint 1 (segurança crítica):** #1, #2, #3, #4, #8 — fecha vulnerabilidades exploráveis.
2. **Sprint 2 (compliance):** #6, #12, #13 — destrava conversa com cliente corporativo / jurídico.
3. **Sprint 3 (operacional):** #9, #10, #11, #15, #16 — destrava operação real em produção.
4. **Sprint 4 (maturidade):** #20, #21, #22, #29, #36 — diferencial enterprise.

O resto é melhoria contínua.
