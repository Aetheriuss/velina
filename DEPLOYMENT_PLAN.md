# Velina — Cloudflare + Unraid Deployment & Security Remediation Plan

## Context

We want to take the velina 2016-Roblox recreation public at **velina.lol**, hosted on a home **Unraid** server (48 GB, quad Xeon, Linux) that sits behind **Starlink CGNAT** — no public IP, no port-forwarding possible. A recent security review (`SECURITY_AUDIT.md`) found the app is *not* safe to expose as-is: it ships hardcoded shared secrets, runs end-of-life runtimes (.NET 6 / Node 18 / Go 1.18), trusts a spoofable client-IP header, and has economy race/dupe gaps. The intended outcome is a **safely-exposed, hardened, supported-runtime deployment**: all services in Docker on Unraid, reachable only through a **Cloudflare Tunnel** (which also gives us TLS/CDN/WAF/DDoS and solves CGNAT), with the audit's P0/P1 items fixed and the platform brought up to **.NET 10 LTS** and a supported Next/React.

Four decisions are already made (confirmed with the user): frontend stays a **container behind the tunnel** (Cloudflare *Pages* is not viable — its API routes use Node Streams + `crypto.randomBytes` and `next.config.js` reads config via `fs` at build, all incompatible with the edge runtime); **.NET 10 LTS** is the runtime target (.NET 9 is already at/near EOL); the frontend upgrade is **security-only/minimal** (Next 14 Pages Router + React 18, keep react-jss); and — because we want a **fully working system including live games**, not just the website — the RCC render engine runs as the real `RCCService.exe` inside a **Windows VM on Unraid** (the only path that runs the proprietary, VMProtect-protected 2016 engine and can host 2016-client-playable game sessions; no Linux/OSS engine can). See §6.

---

## 1. Target architecture

Cloudflare's edge fronts everything. A `cloudflared` container at home holds the outbound tunnel, so **no ports are forwarded** and CGNAT is irrelevant. The **.NET backend stays the single entry point**: its existing `FrontendProxyMiddleware` GET-proxies page requests to the Next.js container and handles all API/auth/admin/game/chat routes locally (the `BypassUrls` list). Everything else lives on a private Docker network and is **never published to the host**, which is itself the fix for audit findings C2/H8/M13 (internal-service isolation).

```
Internet ─▶ Cloudflare edge (TLS, WAF, rate-limit, DDoS)
                │  (outbound tunnel — no inbound ports at home)
          cloudflared (container) ─▶ roblox-backend:5000   ◀── SOLE HTTP ingress
                                          ├─ GET pages, /_next/* ─▶ roblox-frontend:3000
                                          ├─ SQL                  ─▶ postgres:5432
                                          ├─ cache / sessions     ─▶ redis:6379
                                          ├─ asset validation     ─▶ asset-validator:4300
                                          └─ render/game WS (outbound) ─▶ game-server (Windows VM):3040/3189
          migrations (run-once, Knex) ─▶ postgres

  Windows VM (Unraid KVM):  game-server (Node, native) ──spawns──▶ RCCService.exe + RobloxPlaceConverter.exe
                            (renders thumbnails + hosts live 2016 game sessions — see §6)
```

**Containers** (private bridge network `velina-net`, e.g. `172.30.0.0/16`; only `roblox-backend` is tunnel-exposed):

| Service | Build source | Internal port | Notes |
|---|---|---|---|
| `cloudflared` | `cloudflare/cloudflared` | egress only | tunnel creds mounted read-only |
| `roblox-backend` | `services/Roblox` (.NET, Release) | 5000 | **sole ingress**; exactly **one** instance (see §7 single-instance) |
| `roblox-frontend` | `services/2016-roblox-main` (Next) | 3000 | internal only |
| `postgres` | `postgres:13.x` (match current schema) | 5432 | `pgdata` named volume |
| `redis` | `redis:7-alpine` | 6379 | persist — holds session/ban cache + IP-hash salt |
| `asset-validator` | `services/AssetValidationServiceV2` (Go) | 4300 | internal only |
| `game-server` | `services/game-server` (Node) | 3040 / 3189 | **runs in the Windows VM, not a Linux container** (spawns `RCCService.exe` locally) — see §6 |
| `migrations` | `services/api` (Knex) | — | one-shot, `restart: "no"`, forward-only |

**Windows VM (rendering + live games).** game-server spawns RCC as a *local* child process, so it must share an OS with the engine — and only Windows runs the VMProtect-protected `RCCService.exe`. So `game-server` (native mode, `dockerDisabled:true`) + `RCCService.exe` + `RobloxPlaceConverter.exe` run together in a **Windows KVM VM on Unraid**, not in Docker. Connectivity: (1) backend → game-server is an outbound WS — set `Render:BaseUrl` to the VM's LAN IP (`ws://<vm-ip>:3189`); the VM must sit on a network the Docker host can reach (Unraid `br0` bridge or a shared macvlan). (2) game-server → backend HTTP callbacks (`/gs/*`, `/api/upload-thumbnail-v1`) need to reach the backend, whose `:5000` is otherwise cloudflared-only — expose `:5000` on the **LAN bridge** (LAN-only, still no internet forward behind CGNAT) or put the VM on the Docker network. (3) Live-game client traffic from the public internet → see RISK-GAMEWS (§7): behind CGNAT the only inbound path is the tunnel, so this only works if game transport is WebSocket-over-HTTPS (must verify early).

**Config/secrets on Unraid:** all config files are gitignored and must be created on the host under a restricted dir (e.g. `/mnt/user/appdata/velina/config/`, 0600), bind-mounted in. The authoritative key list for `appsettings.json` is `Roblox.Website/Program.cs:20-77`. Note `AddJsonFile("appsettings.json")` is **not optional and has no env fallback** — the file must exist in the container or the app crashes at boot. `Directories:*` must point at in-container mount paths (e.g. `/data/assets`) backed by Unraid bind mounts so assets survive rebuilds; replace all the README's `C:\Users\...` Windows paths.

---

## 2. Deployment code/config changes (required regardless of security work)

- **DEP-1 — Production Dockerfiles.** Multi-stage builds for backend (.NET, **Release**), frontend (`next build && next start`), game-server, asset-validator, migrations. Start from the existing integration harness (`services/Roblox/Roblox.IntegrationTest/docker/run.dockerfile`, `migrations.dockerfile`) — bump base images and add slim runtime stages. Backend runtime image must include native deps: **libsodium** (Sodium.Core) and **ffmpeg** (FFMpegCore).
- **DEP-2 — `docker-compose.prod.yml`.** The §1 service graph: `velina-net` with a fixed subnet, named volumes, healthchecks, `replicas: 1` for backend, **no published ports** except cloudflared egress.
- **DEP-3 — Configurable frontend proxy target.** `FrontendProxyMiddleware.cs:101` hardcodes `http://localhost:3000` and asserts `Host=="localhost"`/`Port==3000` at `:104-107`. Make this a config value (e.g. `Frontend:BaseUrl`) pointing at `roblox-frontend:3000`. (The proxy is **GET-only** — no body/headers/WebSocket forwarded — so this is the only change needed there.)
- **DEP-4 — `ForwardedHeaders` middleware.** `Program.cs` has none today. Add it early with `KnownNetworks = <velina-net CIDR>`. This underpins the H3 fix (P0-7).
- **DEP-5 — Cloudflared ingress.** Tunnel → `http://roblox-backend:5000`, WebSockets on (default — needed for SignalR chat), credentials read-only. Configure Cloudflare DNS + edge WAF/rate-limit rules as a first line.
- **DEP-6 — Migrations one-shot.** Backend `depends_on` migrations `service_completed_successfully`. **Forward-only** — do not run `down`/rollback (audit L8: a bad `down()` drops the wrong table).
- **DEP-7 — Healthcheck + restart policy.** Add a cheap liveness endpoint; `start_period` must be **generous** (boot runs delayed tasks at `Program.cs:78,170-175`); restart policy `unless-stopped`. **Do not** let a flapping healthcheck drive restarts — every restart currently logs all users out (see §7).

---

## 2.5 Domain wiring (velina.lol)

The public domain is **velina.lol**. Inventory of what to set, what to parameterize, and what to leave as `roblox.com` on purpose.

**Config values to set:**
- Frontend `services/2016-roblox-main/config.json`: `publicRuntimeConfig.backend.baseUrl = "https://velina.lol"`; **`apiFormat = "https://velina.lol/apisite/{0}{1}"`** — use the **path-based** form from `README.md:87-88`, NOT a subdomain form (`{0}.velina.lol`). Path-based keeps one hostname → one tunnel route, no wildcard DNS/cert, and `/apisite/` is already in the backend's `BypassUrls`. (RISK-FE-2: baked at build time → rebuild on change.)
- Backend `appsettings.json`: `BaseUrl = "https://velina.lol"`; `CdnBaseUrl = ""` (serve images locally) or `https://cdn.velina.lol` if a CDN is added later. `Render:BaseUrl` (`ws://<vm-ip>:3189`) and `AssetValidation:BaseUrl` (`http://asset-validator:4300`) are **internal**, not velina.lol.
- game-server `config.json` (in the Windows VM): `baseUrl` = the backend's **LAN-reachable** callback URL (e.g. `http://<backend-lan-ip>:5000`), not the public domain — avoids hairpinning every `/gs/*` + thumbnail-upload callback through Cloudflare.

**Source to parameterize / fix (hardcoded `economy-simulator.org` / `localhost`):**
- `2016-roblox-main/pages/api/proxy.js` — reserved-domain allowlist (`:14-17`) and Set-Cookie domain rewrite (`:73,76`) hardcode `economy-simulator.org` (+ `// TODO: "localhost" needs to be configurable` at `:71`). Drive from config; fold into the P1-5 SSRF lockdown (allowlist → velina.lol).
- `Roblox.Website/Middleware/CorsMiddleware.cs` — CSP placeholders (audit M8): `https://*.example.com` + `wss://*.localhost:5000` (`:15`), `http://localhost:5000` (`:31`), `https://*.cdn.com` (`:24`) → velina.lol (or `'self'`). Refactor `GenerateCspHeader()` to take the domain from config.
- `Roblox.Services/Groups/Groups.cs:483,486` — group-URL regexes hardcode `localhost:3000` → velina.lol.
- `Roblox.Website/Pages/Internal/CreatePlace.cshtml.cs:292` — malformed `http://:economy-simulator.org/...` (scheme bug too) → `https://velina.lol/internal/place-update?id=`.
- `Roblox.Website/Controllers/v1/BillingController.cs:26` — premium-membership redirect to `www.roblox.com`; decide local page vs external.

**Cookies:** with the single-domain (path-based) setup, leave the `.ROBLOSECURITY`/`.LoginCSRF` cookie `Domain` **unset** (exact-host, more secure); only set `Domain=.velina.lol` if APIs later move to real subdomains. (Cookie *flags* are the P1-3 fix.)

**Leave as-is (intentional `roblox.com`):** the live-Roblox API client `Roblox.Libraries/RobloxApi/RobloxApi.cs` (fetches real assets/data), external social links in `Roblox.Dto/Users/Users.cs`, the `/apisite/{subdomain}/` internal routing convention, XML-schema namespace URLs, and test fixtures. Internal service URLs (`roblox-frontend:3000`, container names, VM LAN IP) stay internal — none are velina.lol.

---

## 3. Security remediation — P0 (must complete before any public exposure)

Full finding detail lives in `SECURITY_AUDIT.md` §3–§5; this is the execution list. Several P0 network items are already satisfied by the §1 topology.

- **P0-1 Rotate all README-shipped secrets** (C1, H15): frontend `csrfKey`, game-server `authorization` + `websiteBotAuth`, render/RCC/bot tokens, and the DB password (generate via `openssl rand -base64 64` / `util/create_config.js`). Create a **least-privilege non-superuser** Postgres role; PG bound to the internal network only.
- **P0-2 Network isolation** (C2/H8/M13): achieved by the private network + no published ports. Defense-in-depth: add the **missing auth check to the Go validator** (`AssetValidationServiceV2/main.go` — it never reads the `robloxAuthorization` header the backend sends) and bind internal services to the internal interface.
- **P0-3 Release builds only** (H7) — never deploy a DEBUG artifact (auth is compiled out under `#if DEBUG`).
- **P0-4 Remove the `RbxTempBypassFor18PlusAssets` header bypass** (`BypassController.cs:110-113`, H13).
- **P0-5 Strip `x-middleware-subrequest`** at the proxy (C4 mitigation) and strip any inbound `cf-connecting-ip` that isn't from cloudflared.
- **P0-6 Disable Swagger in prod** (M1): gate `UseSwagger()/UseSwaggerUI()` (`Program.cs:157-158`) behind `IsDevelopment()`.
- **P0-7 Fix `cf-connecting-ip` trust** (H3) — **the most important tunnel-correctness fix.** Behind a tunnel, every request's socket peer is the local `cloudflared` container (a private Docker IP), **not** a Cloudflare edge IP — so the textbook "trust the header only from Cloudflare's published CIDRs" approach would *never match*. Instead: trust `cf-connecting-ip` only when the peer is in `velina-net` (the `cloudflared` container), via the DEP-4 `ForwardedHeaders` `KnownNetworks`; otherwise fall back to the socket peer. Change `ControllerBase.GetRequesterIpRaw` (`ControllerBase.cs:57-71`) accordingly. cloudflared overwrites `cf-connecting-ip` at ingress, and `:5000` is unpublished, so spoofing is closed off.
- **P0-8 Throttle `v2/login` + change-password** (H2): reuse the Razor login path's IP cooldown + attempt bucket + captcha on `Controllers/v2/Authentication.cs:89-115`. **Must come after P0-7** (per-IP throttling is meaningless until the IP source is trustworthy).

**Phase-0 exit criteria:** end-to-end smoke test (§8) green; internal ports confirmed unreachable from outside; no README secret in use; Swagger 404 in prod. **Go live private/allowlisted first.**

---

## 4. Security remediation — P1 / P2 (after go-live)

**P1 (high severity):**
- **P1-1 Economy integrity** (H5, H12): atomic conditional debit `UPDATE ... SET balance = balance - :amt WHERE balance >= :amt` (pattern already at `Groups.cs:793`); `SELECT ... FOR UPDATE` on the economy row; `CHECK (balance_robux >= 0)` migration; widen balances `int → bigint` (`Roblox.Dto/Users/Economy.cs:6-10` + schema); take the economy lock in `CurrencyExchange.PlaceOrder/CloseOrder`.
- **P1-2 Token randomness + session lifecycle** (H4, M3, M5): CSPRNG (`RandomNumberGenerator.GetBytes(32)`) for session IDs (`Users.cs:589`), reset tokens (`Users.cs:2211`), CSRF key/token; rate-limit/captcha the reset `change` branch; invalidate sessions on password change/reset. **Fold the single-instance fix in here**: move CSRF key + session JWT secret + game-server token from per-process `Guid.NewGuid()` into config, so restarts stop logging everyone out (§7).
- **P1-3 Cookie flags** (H10): `HttpOnly` on Razor cookies (`Login.cshtml.cs`, `Signup.cshtml.cs`), `Secure` on frontend cookies (`validate-and-add-cookie.js`); one shared helper.
- **P1-4 Real CSRF on Razor auth pages** (H11): wire `AddAntiforgery` + `[ValidateAntiForgeryToken]` or extend `CsrfMiddleware` to cover `/auth/*`.
- **P1-5 SSRF lockdown of `pages/api/proxy.js`** (H6): reconstruct URLs from a fixed base + allowlisted enum; enforce https/exact-host/default-port/no-userinfo; block private/loopback IPs; never forward the internal `authorization` to a user-derived host. (Also relevant to locking down the frontend container's SSR egress — RISK-FE-1, §7.)
- **P1-6 Lua injection fix** (H9, game-server) + **latent SQLi fixes** in `ServiceBase` (H14).
- **P1-7 Case-insensitive username uniqueness** (H16): `citext` or `UNIQUE INDEX ON lower(username)`; move remaining hardcoded secrets to config (M6).

**P2 (medium + dependency remediation):** ImageSharp ≥ 2.1.11 (H1 — see RISK-IMG), `jsonwebtoken` ≥ 9 + pinned algorithms, `axios` → 1.8.x, `ws`/`follow-redirects`/`express` to patched lines, generate `admin/` lockfile; 2FA (M4); schema integrity — FKs + email/group-name uniqueness (M18); idempotency keys + paired trade-ledger rows (M17, M24); game-server/validator hardening, CSP/headers, SFTP keys, lottery `StaffFilter`. Several of these (ImageSharp, jsonwebtoken, axios) can be done on the *current* runtimes before the platform jump.

---

## 5. Platform upgrade (.NET 10 LTS + Next 14 / React 18)

Run **after** the site is safely online and P0/P1 are done — it's the highest-risk change and go-live shouldn't wait on it.

**.NET 6 → .NET 10 LTS** (all 17 csproj `net6.0` → `net10.0`):
- Forced package bumps: **Npgsql 6.0.1 → 10.x** (⚠ top hotspot — Npgsql 7+ changed `DateTime`/`timestamptz`/UTC semantics; review every timestamp column and `DateTime.Now` usage), Dapper 2.0.123 → 2.1.x, **ImageSharp 2.1.3 → ≥ 2.1.11** (stay on the 2.1 line; do **not** jump to 3.x — licensing/API changes), StackExchange.Redis → 2.8.x, Swashbuckle 6.2.3 → 6/7.x, JWT 8.7.0 → current (**verify HMAC-SHA512 alg pinning is preserved** — it's a security property), RedLock.net, Sodium.Core, FFMpegCore.
- Re-validate all `#if DEBUG`/`#if RELEASE` blocks under the new SDK (and confirm H7 is fixed). Gate cutover on the integration-test harness passing on .NET 10.

**Next 12 / React 17 → Next 14 (Pages Router) + React 18** (security-only):
- Keep Pages Router, `getInitialProps` in `_document.js`, and `serverRuntimeConfig`/`publicRuntimeConfig` — all still supported in Next 14.
- React 18 `reactStrictMode:true` double-invokes effects in dev → check SignalR/chat `useEffect` for double-subscribe (RISK-SIGNALR-STRICTMODE).
- Keep **react-jss** (decided); verify SSR style injection (`_document.js` `SheetsRegistry`/`JssProvider`) still works after the bump (visual regression).
- Node 16/18 → **Node 22**; Go 1.18 → current (validator).

---

## 6. RCC render engine — Windows VM (DECIDED)

**Decision: run the real `RCCService.exe` in a Windows VM on Unraid.** A fully working system (live games *and* thumbnails) requires it. From research + the contract extraction: RCC is driven over the classic Roblox `OpenJobEx` SOAP API and does two jobs — templated **thumbnail rendering** (`thumbnail.lua`/`headshot.lua`/`asset/*.lua` → `ThumbnailGenerator:Click` → base64 PNG → `POST /api/upload-thumbnail-v1`) and **live 2016 game hosting** (`gameserver.lua` → `NetworkServer:Start(port)`; the 2016 client connects and plays). There is **no Linux/OSS engine** that can host a 2016-client-playable session, and Wine-ing the **VMProtect-protected** `.exe` is unproven. The real `RCCService.exe` (already in-repo at `services/RCCService/RCCService.exe`, PE32 ~2016) runs cleanly on Windows and natively satisfies the *entire* SOAP/Lua contract — no reimplementation. (A DIY Linux thumbnail-only renderer was scoped as a fallback but is unnecessary now that full functionality is the goal.)

**VM setup:**
- Windows KVM VM on Unraid running **`game-server` (Node, native mode `dockerDisabled:true`) + `RCCService.exe` + `RobloxPlaceConverter.exe`** together — they must co-reside because game-server spawns RCC as a local child process.
- Replace the README's Windows desktop paths (`C:\Users\...`) in `game-server/config.json` with the VM's real install paths; set `rcc`/`content` to the RCCService dir; set `baseUrl` to the backend's LAN-reachable URL; rotate `authorization`/`websiteBotAuth` (P0-1).
- **Sandboxing:** `dockerDisabled:true` means RCC isn't in the per-job Docker sandbox the audit's M9 assumes — but the **whole engine runs inside an isolated Windows VM**, a stronger boundary, so M9's concern is mitigated at the VM level. Keep the VM on a restricted network segment, snapshot it, and treat it as untrusted (it executes place Lua). Fix the H9 Lua-injection issue (P1-6) regardless.
- Connectivity recap (from §1): backend `Render:BaseUrl` → `ws://<vm-ip>:3189`; game-server HTTP callbacks → backend `:5000` exposed on the LAN bridge; live-game client traffic → tunnel route, **gated on RISK-GAMEWS (§7)**.

**Rollout:** the website (Phases 0–3) can go live **before** the VM is fully wired — the backend tolerates an absent render WS (`CommandHandler` auto-retries, `CommandHandler.cs:116-121`), but **verify the thumbnail/upload paths and `StartThumbnailFixLoop` (`Program.cs:78`) degrade gracefully rather than crash-loop** while the VM is offline (feature-flag the loop off until the VM is up). Stand the VM up in parallel and cut rendering/games over when ready (Phase 4). **Before relying on live games, resolve RISK-GAMEWS** — it determines whether external players can reach a session at all behind CGNAT.

---

## 7. Key risks & gotchas

- **RISK-GAMEWS (live-game traffic through the tunnel behind CGNAT) — the make-or-break for "fully working" live games.** Cloudflare Tunnel carries **HTTP/WebSocket only**. The 2016 client reaches a session via `/game/join.ashx`, which returns a `WebsocketAddress` (`BypassController.cs:574-620`; game-server WS on `:3189`) — the naming strongly suggests this recreation tunnels game traffic over **WebSocket**, not raw UDP/RakNet. **If game transport is WebSocket-over-HTTPS, it works**: add a cloudflared ingress route (e.g. `game.velina.lol` → the VM's game WS port) and ensure the join response hands clients that public WS URL. **If any game traffic is raw UDP/RakNet, the HTTP tunnel cannot carry it** — and behind CGNAT with no public IP you'd need Cloudflare **Spectrum** (paid TCP/UDP), a small public VPS relay, or players on WARP/VPN. **Action: verify the actual client↔server game transport early** — it decides whether live games are reachable from the public internet at all. (Thumbnails are unaffected — internal backend↔VM only.)
- **RISK-FE-1 (SSR egress hairpin) — most likely "works locally, hangs in Docker" failure.** The frontend builds **absolute** API URLs (`lib/request.js:5-11`) and SSR-fetches them. Inside the Next container these leave the host, hit Cloudflare, and re-enter through the tunnel. Fix: give Unraid split-horizon DNS for the public domain, **or** set the frontend's server-side base to the internal `http://roblox-backend:5000` for SSR while keeping the public URL for the browser. Verify the real SSR call path before go-live.
- **RISK-FE-2 (build-time frontend config).** `next.config.js` reads `config.json` at **build**; changing domain/flags needs a **rebuild**, not a restart. Bake the prod domain at image build.
- **Single-instance constraint.** CSRF key (`Program.cs:155`), game-server token (`:57`), and session secrets are per-process `Guid.NewGuid()` (`// would break if we load balance`). Run **exactly one** backend container; **every restart logs all users out** until P1-2 persists those secrets. Schedule deploys accordingly and avoid health-driven restart loops.
- **RISK-IMG.** ImageSharp bump touches the user-upload/thumbnail decode path — regression-test with real *and* malformed images (the CVEs are OOB-write + GIF infinite-loop). Stay on 2.1.11+, not 3.x.
- **RISK-CHECK-vs-data.** Adding `CHECK(balance_robux>=0)` (P1-1) fails if any existing row is already negative (from prior over-spend). Query and remediate negatives **before** applying the constraint.

---

## 8. Verification strategy

- **Integration-test harness** (`services/Roblox/Roblox.IntegrationTest/run.sh` — throwaway PG/Redis, safe) is the regression gate at every phase: baseline on .NET 6, re-run after each P1/P2 change, and **re-run on .NET 10 before cutover**.
- **Per-fix tests:** economy concurrency (N parallel purchases/exchanges → no negative balance/dupe; assert `CHECK` rejects a forced negative); auth throttling (rapid `v2/login` → lockout; `cf-connecting-ip` rotation ignored — validates P0-7); cookie attributes asserted in response headers; reset-token entropy/throttle.
- **Pre-go-live tunnel smoke test:** (1) `https://velina.lol/` renders the Next home page; (2) `/apisite/*` + `/auth/*` handled by .NET; (3) login sets `HttpOnly`+`Secure` cookie, session survives navigation; (4) chat SignalR negotiates and a WS message round-trips through the tunnel; (5) from outside, `roblox-backend:5000` / `game-server:3040` / `asset-validator:4300` are **unreachable** (isolation); (6) 18+ asset with the bypass header → no bypass; (7) `/api/proxy?url=` SSRF probes (`file://`, `@`-userinfo, port, private IP) rejected; (8) Swagger 404 in prod.
- **Tooling (read-only):** `dotnet list package --vulnerable --include-transitive`, `npm audit` per service, `govulncheck ./...` — drive High/Critical to zero across P2/P3.

---

## 9. Ordered task list

1. DEP-1 Dockerfiles → DEP-3 configurable proxy target → DEP-4 ForwardedHeaders → DEP-2 compose/network/volumes → DEP-6 migrations one-shot → DEP-7 healthchecks → DEP-8 domain wiring to velina.lol (§2.5).
2. P0-1 rotate secrets → P0-2 isolation (+validator auth) → P0-3 Release builds → P0-4 remove 18+ bypass → P0-5 strip headers → P0-6 disable Swagger → **P0-7 cf-connecting-ip (needs DEP-4)** → P0-8 login throttle (needs P0-7).
3. DEP-5 cloudflared up → **smoke test (§8) → go live (private/allowlisted first).**
4. P1-1 economy → P1-2 CSPRNG + session lifecycle + persist-secrets-on-restart → P1-3..P1-7.
5. P2 deps + 2FA + schema + hardening (ImageSharp/jsonwebtoken/axios doable pre-platform-jump).
6. P3 .NET 10 (integration tests gate) → Next 14/React 18 → Node 22/Go.
7. Phase 4: stand up the **Windows VM** (game-server native + `RCCService.exe` + converter, §6); wire `Render:BaseUrl` + game-server callbacks; **resolve RISK-GAMEWS** (verify WS game transport, add the `game.velina.lol` tunnel route) → enable thumbnails **and live games**.

## Critical files
- `services/Roblox/Roblox.Website/Program.cs` — config wiring, middleware pipeline, Swagger gate, ForwardedHeaders.
- `services/Roblox/Roblox.Website/Middleware/FrontendProxyMiddleware.cs` — configurable frontend target, header stripping.
- `services/Roblox/Roblox.Website/Controllers/ControllerBase.cs` — `cf-connecting-ip` trust fix.
- `services/Roblox/Roblox.Website/Controllers/v2/Authentication.cs` + `Controllers/Internal/BypassController.cs` — login throttle, 18+ bypass removal.
- `services/Roblox/Roblox.IntegrationTest/docker/{run,migrations}.dockerfile` — Dockerfile starting point.
- `services/2016-roblox-main/{next.config.js, lib/request.js, pages/api/proxy.js, config.json}` — frontend container + SSR egress + SSRF.
- `services/api/migrations/` (Knex) — economy `CHECK`/`bigint`, FKs, username uniqueness.
- New: `docker-compose.prod.yml`, per-service `Dockerfile`s, `cloudflared` config.
