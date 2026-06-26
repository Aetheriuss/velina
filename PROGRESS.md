# Velina — Remediation & Deployment Progress

Tracks execution of `DEPLOYMENT_PLAN.md` against `SECURITY_AUDIT.md`.
Branch: `harden/p0-deployment`. Last updated: 2026-06-26.

**Toolchain available on this dev box** (for validation): .NET 9 + **.NET 10** SDKs (net6.0 builds
fine; .NET 6 *runtime* absent, so backend runs only in Docker), Node 22, **Go 1.26** (`~/.local/go`),
**Docker 29 + compose v2** (via Docker Desktop WSL integration).

---

## Status at a glance

| Phase | Item | Status | Validated by |
|---|---|---|---|
| **P0** | P0-1 rotate secrets / strip README | ✅ done | generator runs; 0 secret literals remain |
| | P0-2 Go validator auth + isolation | ✅ done | `go build` + `go vet` + govulncheck 0 vulns |
| | P0-3 Release builds only | ✅ done | backend Dockerfile publishes `-c Release` |
| | P0-4 remove 18+ header bypass | ✅ done | net6 build |
| | P0-5 strip x-middleware-subrequest / cf-connecting-ip | ✅ done | net6 build |
| | P0-6 disable Swagger in prod | ✅ done | net6 build |
| | P0-7 cf-connecting-ip trust | ✅ done | net6 build |
| | P0-8 throttle v2/login + change-pw | ✅ done | net6 build |
| **DEP** | DEP-1 Dockerfiles (backend/frontend/validator/migrations) | ✅ done | all 4 images `docker build` |
| | DEP-2 docker-compose.prod.yml | ✅ done | `docker compose config` valid |
| | DEP-3 configurable frontend proxy target | ✅ done | net6 build |
| | DEP-4 ForwardedHeaders | ✅ done | net6 build |
| | DEP-5 cloudflared ingress | ✅ done | config sample written |
| | DEP-6 migrations one-shot (forward-only) | ✅ done | **ran clean vs Postgres 13** |
| | DEP-7 /healthz + healthchecks | ✅ done | endpoint + compose healthchecks |
| | DEP-8 domain wiring → velina.lol | ✅ done | net6 build + JS checks |
| **P1** | P1-1 economy integrity | ✅ done | **PG13: atomic debit, CHECK, bigint, 89-migration chain** |
| | P1-2 CSPRNG + session lifecycle + persist secrets | ✅ done | net6 build; generator |
| | P1-3 cookie flags (HttpOnly/Secure) | ✅ done | net6 build |
| | P1-4 CSRF on Razor auth | ✅ **false positive** | every form has `@Html.AntiForgeryToken()`; Razor auto-validates |
| | P1-5 SSRF lockdown (proxy.js) | ✅ done | 13/13 attack vectors + frontend image rebuild |
| | P1-6 latent SQLi (ServiceBase) + Lua injection (game-server) | ✅ done | net6 build + `tsc` clean |
| | P1-7 case-insensitive username uniqueness | ✅ done | **PG13: index created** |

---

## Commits (branch `harden/p0-deployment`)

- `5780de3` — P0 security + Docker/Cloudflare infra (Phases 1–2)
- `b748564` — P1-1 economy integrity + P1-3 cookie flags
- `d1dfc58` — P1-2 CSPRNG tokens, session lifecycle, persist per-process secrets
- `465a992` — P1-6 latent SQLi + P1-7 case-insensitive username uniqueness
- `41f2471` — P1-5 SSRF lockdown + P1-6 Lua-injection fix

---

## Key validations performed

- **All 4 prod images build**: backend (net6 Release, +libsodium/ffmpeg, 834 MB), frontend (Next 12,
  1.16 GB), validator (Go distroless, 16 MB), migrations (505 MB).
- **Migrations one-shot ran against Postgres 13** end-to-end (89 migrations, exit 0).
- **Economy (P1-1) proven at SQL level**: over-spend debit → 0 rows / balance unchanged; valid debit →
  decremented; forced negative → `CHECK` violation; balances are `bigint`; 4 CHECK constraints present.
- **Username uniqueness (P1-7)**: `ux_user_username_lower` index created on the full chain.
- **SSRF (P1-5)**: `isSafe` unit-tested against 13 allow/attack vectors (all correct).
- **Go validator (P0-2)**: builds, vets, govulncheck clean after bumping fiber 2.36.0 → 2.52.12.
- **Backend** compiles on the net6.0 target (full `Roblox.sln`, 0 errors) after every change.

---

## New files this session

- `docker-compose.prod.yml`
- `services/Roblox/Dockerfile`, `services/2016-roblox-main/Dockerfile`,
  `services/AssetValidationServiceV2/Dockerfile`, `services/api/Dockerfile` (+ `.dockerignore`s)
- `services/api/docker/migrate-entrypoint.sh`
- `services/Roblox/Roblox.Website/Lib/{TrustedProxy,SessionCookie}.cs`
- `services/Roblox/Roblox.Website/Middleware/SpoofableHeaderGuardMiddleware.cs`
- `services/Roblox/Roblox.Libraries/CryptoRandom.cs`
- `services/api/migrations/20260626120000_economyIntegrityNonNegativeBigint.js`
- `services/api/migrations/20260626120100_caseInsensitiveUsernameUniqueness.js`
- `deploy/{generate-secrets.sh, README.md, .env.example, cloudflared/config.example.yml}`
- root `.gitignore` (blocks `.env`, tunnel `credentials.json`)

## Config/env operators must set (otherwise safe fallbacks apply)

- `appsettings.json`: `Frontend:BaseUrl`, `TrustedProxyNetworks` (= compose subnet `172.30.0.0/16`),
  `Csrf:Key`, `GameServer:TicketJwtKey`, plus all generated secrets (see `deploy/generate-secrets.sh`).
- Go validator env: `ASSET_VALIDATION_AUTHORIZATION` (= backend `AssetValidation:Authorization`).
- `.env` (repo root) from `deploy/.env.example`.

---

## Remaining work

### Not started
- **M6** (Medium): move hardcoded `UserAgentBypassSecret` / `VerificationSecret` constants to config.
  (The CSRF-key + game-server-key parts of M6 were done in P1-2.)
- **P2** (Medium + deps): ImageSharp ≥ 2.1.11, jsonwebtoken ≥ 9 (+ pinned alg), axios → 1.8.x,
  ws/follow-redirects/express patches, generate `admin/` lockfile; 2FA; schema FKs + email/group-name
  uniqueness; idempotency keys + paired trade-ledger rows; game-server/validator hardening (M10/M11/
  M15/M21/M22/M16); remaining CSP/header polish; SFTP keys; lottery `StaffFilter`.
- **Phase 6** (platform): .NET 10 LTS + Next 14 / React 18 + Node 22 / current Go. **Now buildable
  on this box** (.NET 10 SDK installed). Npgsql 6→10 timestamp/UTC semantics is the top hotspot.
- **Phase 4** (live games): stand up the Windows VM (game-server native + RCCService.exe + converter);
  wire `Render:BaseUrl`; **resolve RISK-GAMEWS** (is game transport WebSocket-over-HTTPS?).

### Operator actions for go-live (on Unraid)
- Create real `appsettings.json` + `game-servers.json` + content dirs under `/data`.
- Create the Cloudflare tunnel + DNS; drop `config.yml` + `credentials.json` in `$VELINA_CONFIG_DIR/cloudflared`.
- Run the §8 tunnel smoke test (start private/allowlisted first).

### Open product decisions (need user input)
1. `BillingController` premium-membership redirect target (currently `velina.lol/premium/membership`).
2. Real contact email for `Contact.cshtml` (currently still `economy-simulator.org`).

### Test-infra gap (pre-existing, not from this work)
- `Roblox.IntegrationTest` can't run from a clean checkout — it needs gitignored
  `config.json` + `appsettings.json` with no committed templates. Creating those would make the
  integration harness usable as the per-phase regression gate (verification strategy §8).
