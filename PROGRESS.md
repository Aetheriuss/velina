# Velina — Remediation & Deployment Progress

Tracks execution of `DEPLOYMENT_PLAN.md` against `SECURITY_AUDIT.md`.
Branch: `harden/p0-deployment`. Last updated: 2026-06-27.

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
| **P2** | H1 ImageSharp 2.1.3 → 2.1.11 (stay on 2.1 line) | ✅ done | Release build; **gone from `dotnet list --vulnerable`** |
| | M7 jsonwebtoken ^8 → ^9 + pin HS256 (frontend LoginCSRF) | ✅ done | lock=9.0.3; JS ESM syntax OK |
| | axios ^0.21 → ^1.8 (frontend/game-server/api/admin/web) | ✅ done | lock=1.18.1; **game-server `tsc` clean** |
| | ws ^7 → ^8 + @types/ws + @types/node ^18.19 (game-server/api) | ✅ done | lock ws=8.21.0; **game-server `tsc` clean** |
| | express ^4.17 → ^4.21 (game-server/api/web) | ✅ done | lock=4.22.2 |
| | generate `admin/` lockfile (+ un-ignore it) | ✅ done | `npm audit` = **0 vulns**; committed |
| | Npgsql 6.0.1 → 6.0.11 (High, stays on 6.0.x — no tz semantics change) | ✅ done | Release build; gone from vulnerable list |
| | Newtonsoft.Json → 13.0.3 (pin transitive High) | ✅ done | cascade-cleared System.* 4.3.0 Highs |
| | Swashbuckle 6.2.3 → 6.6.2 (Moderate) | ✅ done | Release build |
| | M6 UserAgentBypassSecret / VerificationSecret → config | ✅ done | Release build; generator emits both |
| **P2 (non-dep)** | M12 lottery `get-users-eligible` / `get-items` → StaffFilter | ✅ done | Release build |
| | M20 request logging: log Path only, never query string | ✅ done | Release build |
| | M8 CSP + security headers (backend) + frontend via single-ingress proxy | ✅ **already done** | config-derived CSP; headers set pre-proxy |
| | M16 SSRF in `RobloxApi.GetStreamAsync` / asset-content fetch | ✅ done | host allowlist + private-IP block + per-hop redirect re-validation |
| | M18 group-name + (dormant) email uniqueness | ✅ done | **PG13: indexes enforce; case-collision + verified-dup rejected** |
| | M15 Go validator: `recover()` + instance-count cap | ✅ done | `go build` + `go vet` clean |
| | M22 Go validator: concurrency off-by-one + BodyLimit | ✅ **already done** (P0-2) | — |
| | M14 asset-backup SFTP: execFile argv, key auth / `sshpass -e`, known_hosts | ✅ done | `node --check` |
| | M17 trade lock ordering (ascending userId) — deadlock fix | ✅ done | Release build |
| | M17 paired trade-Robux ledger rows (counts toward transfer caps) | ✅ done | Release build; new TransactionSubType + 2 trx classes |
| | M17 resale price/seller recheck inside the lock (TOCTOU) | ✅ done | Release build |
| | M4 stop advertising 2FA that isn't implemented (`displayTwoStepVerification=false`) | ✅ done (stopgap) | Release build |

---

## Commits (branch `harden/p0-deployment`)

- `5780de3` — P0 security + Docker/Cloudflare infra (Phases 1–2)
- `b748564` — P1-1 economy integrity + P1-3 cookie flags
- `d1dfc58` — P1-2 CSPRNG tokens, session lifecycle, persist per-process secrets
- `465a992` — P1-6 latent SQLi + P1-7 case-insensitive username uniqueness
- `41f2471` — P1-5 SSRF lockdown + P1-6 Lua-injection fix
- `5cef4fa` — docs: PROGRESS.md tracking P0 + DEP + P1
- `e3a4264` — P2 dependency remediation (ImageSharp/jwt+HS256/axios/ws/express/admin-lock,
  +Npgsql 6.0.11/Newtonsoft 13/Swashbuckle 6.6.2) + M6 secrets-to-config
- `57d54d4` — P2 non-dep hardening: M12 lottery authz, M20 log scrub, M16 SSRF, M18 uniqueness,
  M15 Go validator recover/instance-cap, M14 SFTP keys (M8/M22 verified done)
- `6423ec9` — P2 economy integrity M17 (lock ordering, paired trade ledger, resale TOCTOU)
  + M4 2FA advertising stopgap

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
  `Csrf:Key`, `GameServer:TicketJwtKey`, `UserAgentBypassSecret`, `VerificationSecret` (M6 — else they
  rotate per restart), plus all generated secrets (see `deploy/generate-secrets.sh`).
- Go validator env: `ASSET_VALIDATION_AUTHORIZATION` (= backend `AssetValidation:Authorization`).
- `.env` (repo root) from `deploy/.env.example`.

---

## Remaining work

### Not started
- **P2 dependency remediation** — ✅ **done this session** (ImageSharp, jsonwebtoken+HS256, axios, ws,
  express, admin lockfile; plus opportunistic Npgsql 6.0.11 / Newtonsoft 13.0.3 / Swashbuckle 6.6.2).
  **M6 also done.** Deployable .NET backend now has **zero High/Critical** vulns.
- **Residual advisories — deliberately deferred to Phase 6 (runtime/Next jump), not regressions:**
  - **Next.js 12 auth-bypass (Critical, C4)** — mitigated now by the P0-5 `x-middleware-subrequest`
    strip at the proxy; full fix is the Next 14 upgrade.
  - frontend **`ws` 7.x (High)** — transitive via Next 12 (Next's HMR); force-override would break Next.
  - frontend **`lodash` (High)** — no fix on the 4.x line (advisory range `<=4.17.23`, latest published
    is 4.17.21); no real reach (React app, no `_.template` on user input).
  - **RestSharp 107.3.0 (Moderate, .NET)** — transitive via `InfluxDB.Client` 4.0.0, which is **disabled**
    (`Program.cs:31` Configure call commented out); force-pinning 110 breaks InfluxDB's 107-era API.
  - game-server/api/web **brace-expansion / jsdiff** — deep dev-tooling transitives; game-server runs
    native in the Phase-4 VM, api is migrations-only.
- **P2 non-dependency hardening — largely done this session.** M12, M20, M16, M18, M15, M14, M17 done;
  M8 and M22 verified already-done. Remaining P2 items deferred with rationale below.
- **P2 deferred (with rationale):**
  - **M24 idempotency keys** — trades are already replay-safe (`AcceptTrade` checks `status != Open`
    under the trade lock) and purchases too (transferred item → price==0 on replay); combined with the
    P1-1 atomic debit + economy locks, the only residual replay gap is currency-exchange order placement.
    A full idempotency-key system is a frontend+backend feature for marginal extra protection — deferred.
  - **M4 full TOTP 2FA** — large feature (enrollment/QR/recovery codes/login step-up). Stopgap done:
    no longer advertised. Build the real thing as a dedicated effort.
  - **M10 / M11 / M21 (game-server)** — game-server runs **native in the Phase-4 Windows VM**, not a
    container; do these when the VM is stood up (token constant-time compare + out of URL, /gs/* join-ticket
    validation, cp.exec→spawn). Phase 4.
  - **M23 owner = ID 1** — `OwnerUserId` is already configurable; the residual fix is operational
    (provision the owner out-of-band with signup closed, set `OwnerUserId` ≠ 1). Add to go-live runbook.
  - **M19 BypassUrls normalization** (UNVERIFIED) — needs a dynamic path-normalization parity test
    against the proxy gate; left for a focused verification pass.
- **Phase 6** (platform): .NET 10 LTS + Next 14 / React 18 + Node 22 / current Go. **Now buildable
  on this box** (.NET 10 SDK installed). Npgsql 6→10 timestamp/UTC semantics is the top hotspot.
- **Phase 4** (live games): stand up the Windows VM (game-server native + RCCService.exe + converter);
  wire `Render:BaseUrl`; **resolve RISK-GAMEWS** (is game transport WebSocket-over-HTTPS?).

### Operator actions for go-live (on Unraid)
- Create real `appsettings.json` + `game-servers.json` + content dirs under `/data`.
- Create the Cloudflare tunnel + DNS; drop `config.yml` + `credentials.json` in `$VELINA_CONFIG_DIR/cloudflared`.
- Run the §8 tunnel smoke test (start private/allowlisted first).
- **M23:** set `OwnerUserId` to a non-1 account and provision the owner out-of-band with signup closed
  (don't rely on the predictable seeded user ID 1 as the privileged account).

### Open product decisions (need user input)
1. `BillingController` premium-membership redirect target (currently `velina.lol/premium/membership`).
2. Real contact email for `Contact.cshtml` (currently still `economy-simulator.org`).

### Test-infra gap (pre-existing, not from this work)
- `Roblox.IntegrationTest` can't run from a clean checkout — it needs gitignored
  `config.json` + `appsettings.json` with no committed templates. Creating those would make the
  integration harness usable as the per-phase regression gate (verification strategy §8).
