# Security Audit — velina (self-hosted 2016 Roblox recreation)

**Date:** 2026-06-26
**Audited fork status:** ~2+ years stale, freshly forked.
**Threat model:** Public-facing, adversarial (external attackers + bots). Virtual economy has value (dupe/theft = real damage). Single-process deployment — *no* horizontal-scaling assumptions.
**Scope:** All services under `services/`, risk-prioritized. Code-level review + dependency/supply-chain + schema. No code was modified during this audit.
**Method:** 8 parallel specialist code audits (auth, authz/IDOR, SQLi/data, economy, rendering/RCE, frontend/proxy, config/secrets, dependencies), then cross-referenced and de-duplicated. Every finding cites `file:line`.

---

## 1. Executive summary

**Overall posture is better than expected for a 2-year-stale hobby fork.** The original author built real defenses: Argon2 password hashing, JWT algorithm pinning (HMAC-SHA512, so no `alg:none`), parameterized Dapper queries (no reachable SQL injection), a React frontend that is clean of XSS, no permissive CORS, good baseline security headers, and the high-value authorization surfaces (economy, trades, chat, admin privilege-escalation, group payouts) are genuinely well-guarded.

**The danger is concentrated in four areas:**

1. **Operational secrets & exposure.** The README hands every operator the *same hardcoded* CSRF key and game-server tokens, and a default DB password. Internal services (game-server WebSocket, Go asset validator, dev scraper) bind to all interfaces and lean on single static, never-rotated, replayable tokens. If any internal port is reachable, this is the fastest path to full compromise / remote code execution.
2. **End-of-life platforms.** .NET 6, Node 18, and Go 1.18 are all past end-of-life and receive **zero security patches**. Two internet-reachable component CVEs sit on top of that (Next.js 12.1.0 middleware auth bypass CVSS 9.1; ImageSharp 2.1.3 image-decoder chain on the upload path).
3. **Authentication throttling & token randomness.** The JSON `v2/login` API has *no* rate-limiting/captcha (the Razor login page does), IP-based throttling is trivially bypassed via a spoofable `cf-connecting-ip` header, session & password-reset tokens use non-cryptographic `Guid.NewGuid()`, and the main Razor login cookie is missing `HttpOnly`.
4. **Economy concurrency integrity.** Currency correctness rests entirely on short-TTL Redis locks with no DB-level `balance >= amount` guard, no `SELECT FOR UPDATE`, no `CHECK (balance >= 0)` constraint, and balances stored as 32-bit `int`. Concurrent requests can over-spend / dupe.

**Bottom line:** Do **not** expose this to the public internet until the P0 list (§5) is done. Most P0 items are configuration/lockdown changes measured in hours, not refactors.

### Posture at a glance

| Area | Verdict |
|---|---|
| Password storage | ✅ Strong (Argon2, salted, timing-equalized login) |
| SQL injection | ✅ No reachable SQLi (latent helpers only) |
| Frontend XSS | ✅ Clean (React auto-escaping; no `dangerouslySetInnerHTML`) |
| Authorization / IDOR | ✅ Mostly solid; a few specific gaps |
| Secrets management | ❌ Hardcoded/shared secrets shipped in README |
| Internal-service isolation | ❌ Public binds + static replayable tokens |
| Platform currency (runtimes/deps) | ❌ EOL + critical CVEs |
| Auth throttling / token randomness | ❌ Multiple gaps |
| Economy concurrency | ⚠️ Race/dupe class, no DB backstop |

---

## 2. Consolidated risk register (de-duplicated, final severities)

Severity reflects *this* application and threat model, reconciled across auditors. "Source IDs" map back to the per-area findings in §3–§4.

| # | Finding | Final severity | Source IDs |
|---|---|---|---|
| **C1** | README ships live shared secrets (frontend `csrfKey`, game-server `authorization`, `websiteBotAuth`) | **Critical** | CFG-01 |
| **C2** | Game-server WebSocket binds `0.0.0.0`, single static replayable token → full RCC/process control (docker as root) | **Critical** | RCE-01 |
| **C3** | EOL runtimes (.NET 6, Node 18, Go 1.18) — no security patches | **Critical (strategic)** | DEP |
| **C4** | Next.js 12.1.0 — CVE-2025-29927 middleware auth-bypass (CVSS 9.1); proxy fronts Next | **Critical (CVE) / reach UNVERIFIED** | DEP, FE-06 |
| **H1** | ImageSharp 2.1.3 image-decoder chain (OOB-write GHSA-2cmq-823j-5qj8, CVE-2024-32035, CVE-2025-54575) on user-upload path | **High** | DEP |
| **H2** | `v2/login` + change-password: no rate-limit/captcha → unthrottled brute force | **High** | AUTH-04, CFG-02 |
| **H3** | Spoofable `cf-connecting-ip` trusted unconditionally → defeats all IP throttling/abuse detection + UA-bypass binding | **High** | AUTH-07, CFG-04, FE-05, AUTHZ-07 |
| **H4** | Session IDs & password-reset tokens use non-CSPRNG `Guid.NewGuid()` (+ unthrottled reset `change` step) | **High** | AUTH-01, AUTH-16 |
| **H5** | Economy over-spend/dupe: short-TTL Redis locks, no DB `balance>=amt` guard, no `FOR UPDATE`; exchange path takes no economy lock; no `CHECK(>=0)` | **High** | ECON-01/06/08, SQLI-04 |
| **H6** | SSRF in `pages/api/proxy.js` (domain-only allowlist; forwards internal `authorization` secret; reflects `set-cookie`) | **High** | FE-01, FE-02 |
| **H7** | Auth checks compiled out under `#if DEBUG == false` → unauthenticated migrate/SSRF endpoints if a DEBUG build ships | **High** | RCE-04 |
| **H8** | AssetValidationServiceV2 (Go): no authentication, binds publicly | **High** | RCE-03 |
| **H9** | Lua/SOAP code injection via unescaped avatar JSON into single-quoted Lua literal (`.replace` without `/g`) | **High** | RCE-02 |
| **H10** | Razor login/signup session cookie missing `HttpOnly`; frontend cookies missing `Secure` | **High** | AUTH-05, CFG-13, FE-03 |
| **H11** | No real CSRF protection on Razor auth pages (only `SameSite=Lax`; the "RequestVerificationToken" claim is false) | **High** | AUTH-06 |
| **H12** | Balances stored as 32-bit `int` (overflow/truncation) while ledger uses `long` | **High** | ECON-02 |
| **H13** | 18+ asset age-gate bypass via spoofable `RbxTempBypassFor18PlusAssets` header | **High** | AUTHZ-01 |
| **H14** | Latent SQLi: `ServiceBase.UpdateAsync` interpolates FK value; `MultiGetAsync` column allowlist is a no-op | **High (latent)** | SQLI-01, SQLI-02 |
| **H15** | Default DB password documented (`password`/`test`), postgres superuser | **High** | CFG-03 |
| **H16** | Case-sensitive username uniqueness → impersonation | **High** | DB-02 |
| **M1** | Swagger UI + raw OpenAPI exposed unconditionally in prod | Medium | CFG-05 |
| **M2** | Weak password policy (min length 3, no complexity/breach check) | Medium | AUTH-12, CFG-06 |
| **M3** | CSRF key from `Guid.NewGuid()`; CSRF token from `System.Random` (8 bytes) | Medium | AUTH-02/03, CFG-07/08 |
| **M4** | No 2FA despite UI advertising `displayTwoStepVerification=true`; no step-up auth | Medium | AUTH-08 |
| **M5** | Sessions not invalidated on password change / logout-others; stale session cache delays ban (~1 min); session-fixation surface | Medium | AUTH-09/10/11 |
| **M6** | Hardcoded secrets in source (`UserAgentBypassSecret`, `VerificationSecret`) | Medium | AUTH-13/14 |
| **M7** | `jwt.verify` without pinned `algorithms`; hand-rolled `iat` freshness; `jsonwebtoken@8.5.1` | Medium | FE-04 |
| **M8** | CSP weaknesses (`unsafe-eval`, `unsafe-inline`, placeholder hosts, no `frame-ancestors`/`Referrer-Policy`); no security headers on frontend | Medium | CFG-12, FE-07 |
| **M9** | `dockerDisabled:true` in documented game-server config (RCC sandbox off) | Medium | CFG-17 |
| **M10** | game-server token: non-constant-time compare, token in WS URL query, no strength check | Medium | CFG-10, RCE-08 |
| **M11** | `/gs/*` game-server callbacks trust client-supplied `userId`/`placeId` behind one shared secret (visit/currency inflation, arbitrary server shutdown) | Medium | AUTHZ-03 |
| **M12** | Admin `lottery/*` endpoints missing `StaffFilter` → leak usernames + valuable item holdings of dormant accounts | Medium | AUTHZ-02 |
| **M13** | `services/web` dev scraper binds `0.0.0.0`, unauthenticated, HTTPS→HTTP rewrite | Medium | CFG-09 |
| **M14** | asset-backup SFTP via `sshpass` + `StrictHostKeyChecking=no` (MITM, cmdline password) | Medium | CFG-11 |
| **M15** | Untrusted RBXL parsing (decompression bomb) + weak place validation logic in Go validator | Medium | RCE-06 |
| **M16** | SSRF in `GetStreamAsync` (no host allowlist, no redirect cap, no private-IP block) | Medium (reach UNVERIFIED) | RCE-07 |
| **M17** | Trade Robux not recorded as transactions (ledger desync; launders around transfer caps); resale limited-status recheck TOCTOU; trade lock ordering deadlock | Medium | ECON-03/04/05 |
| **M18** | No email / group-name uniqueness; **zero foreign keys** in entire schema (integrity is app-side only) | Medium | DB-03, DB-04 |
| **M19** | `BypassUrls` proxy gate uses fragile `ToLower().StartsWith()` on encoded path+query (normalization mismatch risk) | Medium (UNVERIFIED) | FE-05b |
| **M20** | Logging full request URLs incl. query strings/tokens + HCaptcha bodies to console | Medium | CFG-14 |
| **M21** | Place-converter command via `cp.exec` string concat (latent OS command injection) | Medium (latent) | RCE-05 |
| **M22** | Go validator concurrency off-by-one + unbounded request body → DoS | Medium | RCE-09 |
| **M23** | Seeded owner = user ID 1 (predictable privileged account) | Medium | CFG-16 |
| **M24** | No idempotency keys on purchase/trade/exchange POSTs (replay) | Medium | ECON-09 |
| **L1** | Avatar `WearAsset`/`WearOutfit` IDOR — wear unowned items (cosmetic) | Low | AUTHZ-04/05 |
| **L2** | Group role-permission disclosure (authorization check commented out) | Low | AUTHZ-06 |
| **L3** | User enumeration via password-reset response discrepancy | Low | AUTH-15 |
| **L4** | `target="_blank"` without `rel="noopener"` (reverse tabnabbing) | Low | FE-08 |
| **L5** | Verification phrase from `new Random()` | Low | AUTH-17 |
| **L6** | DEBUG-only stack traces to client (compiled out in Release — risk only if DEBUG deployed); dev paths/usernames in committed scripts | Low | CFG-15 |
| **L7** | Deprecated `X-XSS-Protection: 1; mode=block` (should be `0`) | Low | CFG-12 |
| **L8** | Duplicate migration timestamp; `addModerationBans` `down()` drops wrong table (`user_ban`) | Low (operational) | DB-05 |

---

## 3. Critical & High findings (detail)

### C1 — README ships live shared secrets *(Critical, CWE-798/CWE-321)*
`README.md:65` (frontend `csrfKey`), `README.md:106` (game-server `authorization`), `README.md:110` (`websiteBotAuth`). Operators paste these verbatim, so **every install runs with publicly-known keys**. The `csrfKey` is the HMAC key for the frontend login-CSRF JWT (`2016-roblox-main/pages/api/validate-and-add-cookie.js:22-37`) → an attacker forges a valid `.LoginCSRF` and defeats login-CSRF. The game-server `authorization` is the single secret gating the backend↔game-server WebSocket + thumbnail upload (`game-server/src/server.ts:25,59,151`).
**Fix:** Strip all real secret values from the README; instruct generation (`openssl rand -base64 64`), and use the existing `util/create_config.js` (already generates a random csrfKey). Treat published values as compromised; rotate everywhere.

### C2 — Game-server WebSocket: public bind + static replayable token → RCC control *(Critical, CWE-306/CWE-798)*
`game-server/src/server.ts:11-13` binds with only a port (→ all interfaces); auth is a single string compare against static `conf.authorization` (`:151`, `:25`). Every command (`startGame`, `ConvertRobloxPlace`/`ConvertHat`, `GenerateThumbnail*`) is dispatched by name from the WS message (`:98-108`), and converters/RCC spawn processes via `sudo`/docker as root. The token never rotates, has no rate-limit/lockout, and is fully replayable. **This is the pivot that turns H9 (Lua injection) and M21 into remotely-reachable RCE.**
**Fix:** Bind WS/Express to `127.0.0.1` (or a private interface) and firewall the port; require a ≥256-bit random token from a secret store; constant-time compare; per-IP connection rate-limit + key-failure lockout; consider mTLS between site and game-server.

### C3 — End-of-life runtimes *(Critical, strategic)*
.NET 6 (EOL 2024-11-12), Node 18 (EOL 2025-04-30), Go 1.18 (long out of support). All three receive **no** security patches — every future framework CVE accrues unpatched. The whole `Roblox` backend is `net6.0` across all 17 csproj.
**Fix (schedule early, run in parallel with other tracks):** Migrate to .NET 8 or 10 (LTS), Node 22 LTS, current Go. Treat as a funded project, not a quick bump.

### C4 — Next.js 12.1.0 middleware auth bypass (CVE-2025-29927, CVSS 9.1) *(Critical CVE; reach UNVERIFIED)*
The `.NET` proxy fronts Next; the CVE lets an attacker bypass middleware via the `x-middleware-subrequest` header. **Reach nuance:** no `middleware.ts` was found in the frontend and auth is cookie-based at the .NET layer, so direct exploitation of *this* app is unconfirmed — but the framework is years below the patch line and other 12.x SSRF/cache/DoS advisories apply.
**Fix:** Immediate mitigation — strip the `x-middleware-subrequest` header at the .NET proxy. Then upgrade Next.js to ≥12.3.5 (ideally the 14/15 LTS line) and retest.

### H1 — ImageSharp 2.1.3 decoder chain on upload path *(High, CWE-1035)*
Server-side decoder for **user-uploaded** images (`Roblox.Services` / thumbnails). Below every 2.1.x patch: CVE-2024-32035, GHSA-2cmq-823j-5qj8 (OOB-write), CVE-2025-54575 (GIF infinite-loop). Attacker-reachable with crafted images. **Fix:** upgrade to ≥2.1.11.

### H2 — `v2/login` + change-password unthrottled *(High, CWE-307)*
`Roblox.Website/Controllers/v2/Authentication.cs:89-115` — no cooldown, no attempt bucket, no captcha (the Razor `Login.cshtml.cs:130-154` path has all three). There is no global ASP.NET rate-limiter. Combined with M2 (3-char passwords) and H3 (IP spoofing), online brute force is unrestricted. **Fix:** apply the Razor path's IP cooldown + attempt bucket + captcha to the controller (or route all logins through one throttled service); add per-account lockout.

### H3 — Spoofable `cf-connecting-ip` *(High, CWE-290/CWE-348)*
`Roblox.Website/Controllers/ControllerBase.cs:57-71` returns the `cf-connecting-ip` header verbatim with no check that the peer is actually Cloudflare. This value keys *all* IP rate-limiting, abuse detection, game-join tickets, and UA-bypass binding. Rotate the header per request → fresh bucket each time. **Fix:** only honor the header when `Connection.RemoteIpAddress` is in Cloudflare's published ranges (ASP.NET `ForwardedHeadersOptions` with `KnownProxies`/`KnownNetworks`); else use the socket peer.

### H4 — Non-CSPRNG session & password-reset tokens *(High, CWE-330/CWE-340)*
`Roblox.Services/Users/Users.cs:589` (session id), `:2211` (reset token) use `Guid.NewGuid()` — a v4 UUID, **not** from a CSPRNG. The reset token is the *sole* authorization to change a victim's password after the social step, and the reset `change` branch (`Pages/Auth/PasswordReset.cshtml.cs:169-196`) has **no captcha/rate-limit** (AUTH-16). **Fix:** generate tokens from `RandomNumberGenerator.GetBytes(32)`, Base64Url-encode; add rate-limit/captcha to the `change` branch; expire all sessions after redemption.

### H5 — Economy over-spend / dupe class *(High, CWE-362/CWE-191)*
Currency correctness relies *only* on short-TTL Redis locks (`Users.cs:53-59` 5s, `:1368` 10s; `Economy.cs:47-55` 5s) with **no fencing token and no auto-extend**; if the transaction outruns the TTL the lock silently expires and a concurrent request reads a stale balance. There is **no** `SELECT ... FOR UPDATE` and the decrement (`Economy.cs:108-130`) has no `WHERE balance >= :amt` guard — it debits first, checks `< 0` after, relying on rollback. `CurrencyExchange.PlaceOrder` (`CurrencyExchange.cs:361-419`) takes **no** economy lock at all. The schema has **no `CHECK (balance_robux >= 0)`** and `.unsigned()` is a Postgres no-op (`20210113082858_addEconomy.js:10-11`). `Database.connection` releases its mutex before returning (`Database.cs:21-32`), so non-transaction balance reads are fully concurrent. **Fix (single highest-value change):** atomic conditional debit — `UPDATE ... SET balance = balance - :amt WHERE balance >= :amt`, treat 0 rows as insufficient funds (the pattern already exists at `Groups.cs:793`) — plus `SELECT ... FOR UPDATE` on the economy row; add the `CHECK (>= 0)` constraint; take the economy lock in `PlaceOrder`/`CloseOrder`.

### H6 — SSRF in `pages/api/proxy.js` *(High, CWE-918/CWE-200)*
`2016-roblox-main/pages/api/proxy.js:5-30,33-81` forwards a fully attacker-controlled `req.query.url` server-side; the only guard (`UrlUtilities.isSafe`) compares **registrable domain only** — ignoring scheme (`file://`/`gopher://`), port, and userinfo (`@`) confusion. It forwards near-all client headers (denylist, not allowlist) including the server's internal `authorization` secret, and reflects upstream `set-cookie` back to the browser. **Fix:** don't accept a full URL — reconstruct server-side from a fixed base + allowlisted api enum; if a URL is required, enforce `https`, exact-host allowlist, default port, no userinfo, block private/loopback/link-local IPs; never forward the internal `authorization` to a user-derived host; switch to a forward-header allowlist.

### H7 — Auth compiled out under `#if DEBUG` *(High, CWE-489)*
`Roblox.Website/Controllers/Internal/BypassController.cs:815-823` — `ValidateBotAuthorization()` is entirely removed in DEBUG builds, leaving `botapi/migrate-alltypes`/`migrate-clothing` (server-side fetch + asset creation) unauthenticated, and making M16's SSRF unauthenticated. Real risk for a hobby project that may deploy a DEBUG artifact. **Fix:** never gate authentication on `#if DEBUG`; use a fail-closed runtime config flag; deploy only Release builds.

### H8 — Go asset validator: no auth, public bind *(High, CWE-306)*
`AssetValidationServiceV2/main.go:48-82` — `app.Listen(":4300")` (all interfaces); `/api/v1/validate-place` and `/api/v1/validate-item` read the body and parse untrusted RBXL with **no credential check** (the .NET caller sends `robloxAuthorization` but the Go side never reads it). **Fix:** enforce the header (constant-time compare); bind to `127.0.0.1`; firewall the port.

### H9 — Lua/SOAP injection via avatar JSON *(High, CWE-94)*
`game-server/src/controllers/index.ts:917-957` injects `JSON.stringify(user)` into a **single-quoted** Lua literal in `thumbnail.lua`/`headshot.lua`; the escaping `.replace(\`'\`, \`\\'\`)` replaces only the **first** quote (no `/g`) and ignores `\`, newlines, and the CDATA terminator `]]>`. Via the web API all fields are numeric/server-derived (not currently injectable), but anyone who can speak to the game-server WS (C2) controls the whole object → arbitrary Lua in the RCC job. **Fix:** pass avatar data as a base64 arg decoded inside Lua (don't string-replace into source); add `/g` and escape `\`,`'`,newlines,`]]>`; whitelist fields server-side.

### H10 — Cookie flags: missing `HttpOnly` / `Secure` *(High, CWE-1004/CWE-614)*
Razor `Login.cshtml.cs:64-71` and `Signup.cshtml.cs:265-272` set `.ROBLOSECURITY` **without `HttpOnly`** (the v2 controller path `v2/Authentication.cs:78-86` correctly sets it) — so a web-form login yields a JS-readable, 364-day session cookie. Frontend `validate-and-add-cookie.js:56,71-72` sets `.ROBLOSECURITY`/`.LoginCSRF` **without `Secure`**. Any XSS or plaintext hop → session theft → account takeover. **Fix:** add `HttpOnly=true` to the Razor cookie writes and `Secure` to the frontend cookies; factor cookie creation into one shared helper so all paths match.

### H11 — No real CSRF on Razor auth pages *(High, CWE-352)*
`CsrfMiddleware.cs:121-159` bypasses `/auth/*` with a comment claiming they "use built-in RequestVerificationToken", but there is **no** `AddAntiforgery`, no `[ValidateAntiForgeryToken]`, no `@Html.AntiForgeryToken()` anywhere — only `SameSite=Lax` stands between an attacker and forged login/password-reset/account-deletion (and login-CSRF is fully possible). **Fix:** wire up real antiforgery on every state-changing Razor auth handler, or extend the custom CSRF middleware to cover them.

### H12 — 32-bit balance overflow/truncation *(High, CWE-190/CWE-197)*
`Roblox.Dto/Users/Economy.cs:6-10` types `robux`/`tickets` as `int`, but increments accept `long` and SQL adds unbounded (`Economy.cs:84-130`). A balance > 2,147,483,647 truncates to a negative `int` on read, corrupting `balance < price` checks and abuse heuristics. **Fix:** make balances `long` end-to-end; impose and validate a sane per-account maximum.

### H13 — 18+ age-gate bypass header *(High, CWE-639/CWE-807)*
`Roblox.Website/Controllers/Internal/BypassController.cs:110-113` — any request including `RbxTempBypassFor18PlusAssets` (any value) sets `is18OrOver=true`, defeating the gate at `:217`. `/asset/?id=` is in the proxy `BypassUrls` → reachable unauthenticated. (Code comment: *"TEMPORARY... REMEMBER TO REMOVE"*.) **Fix:** remove the header bypass; derive age from the authenticated session only.

### H14 — Latent SQL injection in `ServiceBase` helpers *(High, latent, CWE-89)*
`Roblox.Services/Services/ServiceBase.cs:228` — `UpdateAsync` interpolates the **`foreignKey` value** raw into `WHERE` (safe today only because all 20 callers pass numeric IDs). `:244-250` — `MultiGetAsync` column allowlist is a no-op (`columnsList.Contains(item)` tests the list against itself), so the `SELECT` column list is effectively unvalidated (one caller, hardcoded today). Both become exploitable the instant a caller forwards user input. **Fix:** bind the FK value as a parameter (keep identifier allowlisting); fix the check to `tableData.Contains(item)`.

### H15 — Default DB credentials documented *(High, CWE-1188/CWE-521)*
`README.md:33,44-46` document `password`/`test` for the postgres **superuser**. **Fix:** strong unique password, least-privilege non-superuser role, bind Postgres to localhost.

### H16 — Case-sensitive username uniqueness *(High, CWE-178)*
`20210112161653_addUsersTable.js:36` is byte-exact unique, but lookups are case-insensitive (`Users.cs:434` `ILIKE`). `Notch`/`notch`/`NOTCH` become distinct accounts that collide case-insensitively — impersonation on a trading platform. **Fix:** `citext` column or `UNIQUE INDEX ON lower(username)`.

---

## 4. Medium / Low findings

Captured in the register (§2) with source IDs. Grouped remediation themes:

- **Auth hardening (M2–M6):** raise password floor to ≥8 + breach check; replace `Guid`/`System.Random` for CSRF key & token with `RandomNumberGenerator`; implement TOTP 2FA (or stop advertising it); invalidate all sessions on password change/reset and proactively purge the session cache; move `UserAgentBypassSecret`/`VerificationSecret` to gitignored config and rotate.
- **Config/exposure (M1, M8, M9, M13, M14, M20, M23):** gate Swagger behind `IsDevelopment()`; clean CSP (drop placeholder hosts, add `frame-ancestors 'self'` + `Referrer-Policy`, set `X-XSS-Protection: 0`), add headers on the frontend; set `dockerDisabled:false`; bind the dev scraper to localhost; SFTP keys + `known_hosts` instead of `sshpass`/`StrictHostKeyChecking=no`; log path without query string and scrub upstream bodies; decouple owner from ID 1 and provision it out-of-band with signup closed.
- **Game-server / validator (M10, M11, M15, M21, M22, M16):** per-server identity + join-ticket validation for `/gs/*`; constant-time token compare and token out of the URL; max decompressed-size + instance-count limits and `recover()` in the Go validator; `cp.spawn(argv)` instead of `cp.exec` string; fix the concurrency off-by-one and add `BodyLimit`; allowlist hosts + block private IPs + cap redirects in `GetStreamAsync`.
- **Economy integrity (M17, M24):** record paired `user_transaction` rows for trade Robux (and count them in transfer caps); move resale limited-status + `expectedPrice` checks inside the transaction; canonical lock ordering (ascending userId); idempotency keys on purchase/exchange POSTs.
- **Schema (M18, L8):** add foreign keys on ownership/economy relations; unique (case-insensitive) email and group name; fix the duplicate migration timestamp and the `down()` that drops `user_ban`.
- **Authz (M12, L1, L2):** add `StaffFilter` to (or un-route) the `lottery/*` endpoints; filter avatar wear to owned assets and add the missing `WearOutfit` ownership check; re-enable the commented-out group permission check.
- **Frontend (M7, M19, L4):** pin `jwt.verify({algorithms:['HS256']})` and upgrade `jsonwebtoken`≥9; match `BypassUrls` against the decoded/normalized path with exact-segment semantics; add `rel="noopener noreferrer"`.
- **Low (L3, L5, L6, L7):** uniform password-reset responses; `RandomNumberGenerator` for the verification phrase; ensure Release-only deploys + remove dev paths from committed scripts.

---

## 5. Prioritized remediation roadmap

### P0 — Before any public exposure (hours–days; mostly config/lockdown)
These collapse the largest attack surface with minimal code change.
1. **Rotate & regenerate all secrets** shipped in the README (C1): per-install `csrfKey` (via `util/create_config.js`), game-server `authorization`/`websiteBotAuth`, render/RCC/bot tokens, DB password (H15).
2. **Network-isolate internal services** (C2, H8, M13): bind game-server WS/Express, Go validator `:4300`, and the dev scraper `:3200` to `127.0.0.1`; firewall those ports; add auth to the Go validator.
3. **Deploy Release builds only** (H7) and set `dockerDisabled:false` (M9).
4. **Remove the `RbxTempBypassFor18PlusAssets` bypass** (H13).
5. **Next.js**: strip `x-middleware-subrequest` at the proxy now (C4); schedule the upgrade.
6. **Disable Swagger in prod** (M1).
7. **Fix `cf-connecting-ip` trust** and **add rate-limit/captcha to `v2/login` + change-password** (H3, H2).

### P1 — High severity (1–3 weeks)
8. **Economy concurrency** (H5, H12): atomic conditional debit + `SELECT FOR UPDATE`; `CHECK (balance >= 0)`; widen balances to `bigint`; economy lock in the exchange path.
9. **Token randomness & session lifecycle** (H4, M3, M5): CSPRNG for sessions/reset/CSRF; invalidate sessions on password change/reset; rate-limit the reset `change` step.
10. **Cookie flags** (H10): `HttpOnly` on Razor cookies, `Secure` on frontend cookies, shared helper.
11. **Real CSRF on auth pages** (H11).
12. **Proxy SSRF lockdown** (H6).
13. **Lua injection fix** (H9) and **latent SQLi fixes** (H14).
14. **Case-insensitive username uniqueness** (H16); move hardcoded secrets to config (M6).

### P2 — Medium severity & dependency remediation (1–2 months)
15. **Dependency upgrades** (H1 + supply chain): ImageSharp ≥2.1.11; `jsonwebtoken`≥9, `axios`→1.8.x, `ws`/`follow-redirects`/`express` to patched lines; generate `admin/` lockfile. Run the authoritative tooling (§7) and burn down the results.
16. **2FA** (M4); **schema integrity** (M18 FKs/uniqueness); **idempotency + trade ledger** (M17, M24).
17. **game-server/validator hardening** (M10, M11, M15, M21, M22, M16); **logging/CSP/headers** (M20, M8); **SFTP keys** (M14); **lottery StaffFilter** (M12).

### P3 — Strategic platform track (start early, run in parallel)
18. **Runtime migration** (C3): .NET 8/10 LTS, Node 22 LTS, current Go. Largest effort; begin scoping during P1 because EOL means unpatched CVEs accumulate the whole time.
19. Remaining Low items (L1–L8).

---

## 6. Verification strategy

- **Per-fix regression tests** in `Roblox.UnitTest`/`Roblox.IntegrationTest` (Docker-based, throwaway PG/Redis — safe): economy concurrency (parallel purchase/exchange to assert no negative balance/dupe; assert the `CHECK` constraint rejects negatives); auth throttling (script N rapid `v2/login` attempts → expect lockout); CSRF (cross-origin POST to `/auth/*` → expect rejection); cookie attributes asserted in response headers; reset-token entropy/throttle.
- **Manual / scripted abuse tests:** `curl` the 18+ asset with/without the bypass header; attempt `cf-connecting-ip` rotation against the login bucket; SSRF payloads against `/api/proxy?url=` (`file://`, `@`-userinfo, port, private IP); confirm internal ports are unreachable from outside after the bind change.
- **Tooling re-runs:** `npm audit` per service, `dotnet list package --vulnerable --include-transitive`, `govulncheck ./...` (commands in §7) — track the count to zero High/Critical.
- **Negative-result confidence (don't re-audit):** Argon2 hashing, JWT alg pinning, parameterized Dapper, frontend XSS cleanliness, admin privilege-escalation gating, no-permissive-CORS, hash-based asset paths, no insecure .NET deserialization — all verified present/correct.
- **Open items needing dynamic confirmation (UNVERIFIED):** C4 middleware reachability; M19 path-normalization parity; M16 `location`-field controllability; whether the deployment is *strictly* behind Cloudflare (decides H3 real-world severity); ECON-10 staff-reward `lastClock` atomicity; AUTH-14 whether forging `es-verification-phrase` alone bypasses the social proof (`WebsiteServices/Verification.cs:188-260`).

---

## 7. Authoritative dependency commands (read-only)

```bash
# npm — per service (admin/ has NO lockfile; generate one first without mutating prod)
for d in 2016-roblox-main game-server api admin web asset-backup table-generator; do
  echo "== $d =="; ( cd "services/$d" && npm audit --omit=dev --audit-level=high || npm audit ); done
cd services/admin && npm install --package-lock-only && npm audit

# NuGet — from services/Roblox
cd services/Roblox && dotnet restore Roblox.sln
dotnet list Roblox.sln package --vulnerable --include-transitive
dotnet list Roblox.sln package --deprecated --include-transitive

# Go — from services/AssetValidationServiceV2
cd services/AssetValidationServiceV2
go install golang.org/x/vuln/cmd/govulncheck@latest && govulncheck ./...
```

**Top supply-chain risks:** EOL runtimes (.NET 6 / Node 18 / Go 1.18); Next.js 12.1.0 (CVE-2025-29927); ImageSharp 2.1.3 (decoder chain); `golang.org/x/crypto` 2022-02 (Terrapin + 2025 SSH DoS, via `rbxfile`); `axios 0.21.x` (CVE-2023-45857) across 5 services; `jsonwebtoken 8.5.1` (CVE-2022-23541); `ws`/`follow-redirects`/`express` below patch lines.
