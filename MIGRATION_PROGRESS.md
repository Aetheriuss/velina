# Unified Next.js Migration — Progress

Migrating Velina's three-headed UI (Next.js `2016-roblox-main` + .NET Razor pages + Svelte `admin`) into **one modern Next.js App Router app**, re-themed from 2016 to **2020-era Roblox styling (light + dark)**, backed by the existing .NET JSON API. Also removing redundant features along the way.

- **Branch:** `feature/unified-nextjs-2020`
- **Plan file:** `~/.claude/plans/create-a-plan-to-drifting-harp.md`
- **Status:** Phase 0 ✅ · Phase R ✅ · Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅ · Phases 4–7 pending
- **Build health:** `.NET` 0 errors · Next frontend builds (16 App Router routes + legacy pages) · jest green · prod-server SSR smoke-tested

---

## Commits so far

| Commit | Summary |
|--------|---------|
| `e2d54dd` | Phase 0 scaffold + remove forums & clothing-stealer |
| `61e53a2` | Phase R: remove account-application, invite, social-verification, Twitter (UI + flow) |
| `13a6231` | Phase R complete: dead code, enums, DB drop migrations |
| `d2726c9` | Phase 1: runtime config → env vars |
| `c18b974` | Phase 2: low-risk routes + /home + /develop re-skin + Chat mount |
| _(pending)_ | Phase 3: auth migration (Discord-only) — app/auth/* + JSON endpoints + BypassUrls split |

---

## ✅ Phase 0 — Foundations & scaffolding (complete & verified)

App Router tree added **alongside** the legacy `pages/` tree (both build together). Files under `services/2016-roblox-main/`:

| Piece | Path | Notes |
|-------|------|-------|
| TypeScript (incremental) | `tsconfig.json`, `types/css.d.ts` | `allowJs`; pinned `typescript@5.9.3` |
| 2020 design tokens | `app/globals.css` | `:root` (light) + `[data-theme="dark"]`; `#00A2FF` accent, rounded surfaces, dark nav |
| Tailwind v3 (scoped) | `tailwind.config.ts`, `postcss.config.js` | utilities → tokens; **preflight disabled** so legacy Bootstrap pages are untouched |
| Theme system | `components/providers/ThemeProvider.tsx` | light/dark toggle, localStorage, **FOUC-guard inline script**, migrates legacy `obc2016` → dark |
| Auth (React Query) | `components/providers/AuthProvider.tsx` | reads `/v1/users/authenticated`; `refresh()` for post-login |
| Server state | `components/providers/QueryProvider.tsx` | TanStack Query |
| API client | `lib/apiClient.ts` | typed, same-origin `/apisite/...`, preserves CSRF-retry |
| UI primitives | `components/ui/{Button,Card}.tsx` | flat 2020 components |
| App shell | `components/appShell/{Navbar,Footer}.tsx`, `app/layout.tsx`, `app/providers.tsx` | provider tree mirroring `_app.js`; `next/font` Source Sans 3 |
| Verification route | `app/ui-preview/page.tsx` | proves tokens + toggle + primitives (remove once real routes land) |

New deps: `@tanstack/react-query`, `tailwindcss@^3`, `postcss`, `autoprefixer`, `typescript`, `@types/*`.

**Deferred to Phase 2/3:** mounting `<Chat/>` (SignalR) into the shell (auth-dependent). → **done in Phase 2.**

---

## ✅ Phase R — Feature removal (complete)

Six redundant features fully removed (UI + backend + DB), build green at each step.

| Feature | What was removed |
|---------|------------------|
| **Forums** | `pages/Forum/*`, 8 forum components, `services/forums.js`; `ForumsController`, `Forums.cs` service, `Forums` DTO, service registration; admin `Forums.svelte` + route + nav + `TextModeration` coupling; activity-metric decoupling (place-creation gate, profile `postCount`, admin text-mod IDs & staff-payment); DB drop migration `forum_post`/`forum_post_read` |
| **Clothing-stealer** | `/internal/clothingstealer` Razor page, admin `CopyRobloxClothing.svelte` + orphaned `asset/copy-from-roblox` endpoint + `CopyAssetRequest`; nav + BypassUrls/CSRF entries. **Kept** shared `MigrateItem` + general `CopyAnyItemFromRoblox` |
| **Application process** | `Application`/`ApplicationCheck`/`MigrateToApplication` pages; `ApplicationService`, `ApplicationProcessorService`, ~13 application methods in `Users.cs`; admin endpoints (`force-application`, `applications/*`) + admin pages; the `SessionMiddleware` unapproved→`/auth/application` gate (→ **open registration**); the Discord seed-application in `CreateUser`; the place-creation "approved application" gate; DB drop migration `join_application` + `moderation_change_join_app` |
| **Invite system** | `Invite` page, signup invite path; invite write methods (read methods **stubbed to empty** because anti-abuse purchase/trade/currency checks still call them); admin `invites` endpoint + `GetUsersList` joins; nav + BypassUrls/CSRF; DB drop migration `user_invite` |
| **Social-verification** | `Verification.cs`, the whole `AppSocialMedia`/`SocialMediaSite` parser hierarchy (Steam/Reddit/Twitter/TikTok/YouTube/Roblox); password-reset decoupled (it already redirected to Discord) |
| **Twitter** | `TwitterApi.cs`, DTO types, `Program.cs` init, `Twitter:Bearer` appsettings key, Home/TOS copy + `twitter:card` meta |

Enums retired (Staff `Access` + `FeatureFlag`): `ForceApplication`, `ManageApplications`, `ClearApplications`, `ManageInvites`, `DeleteForumPost`, `LockForumThread`, `CopyClothingFromRoblox`, `CreateAssetCopiedFromRoblox`, `ApplicationsEnabled`, `CreateInvitesEnabled`, `InvitesEnabled`, `ForumsEnabled`, `ForumPostingEnabled`.

### Two corrections made vs. the original exploration map (both verified in code)
1. **`Access` is stored as an integer** in `user_permission` (and `FeatureFlag` indices are cached) → removed enum values are **retired in place with ordinals preserved** (renumbering would corrupt stored staff permissions / cached flags).
2. **`ApplicationGuardMiddleware` is general bot/crawler protection** ("guard the web *application*"): robots.txt, crawler-UA blocking → captcha, unauthenticated access gating. It is **NOT** the account-application feature and was **kept**; only its two application-page allowlist entries were removed. The map had wrongly flagged it (and `ApplicationGuardMetrics`/`Captcha`) for deletion.

### DB drop migrations added (under `services/api/migrations/`)
- `20260630120000_dropForums.js` — `forum_post`, `forum_post_read` (reversible: recreates empty schema)
- `20260630120100_dropApplicationAndInvite.js` — `join_application`, `moderation_change_join_app`, `user_invite` (irreversible; `down` throws)

### Deferred (cosmetic, in soon-to-be-replaced Svelte admin → fold into Phase 6)
- Two dead `post.type === "ForumPost"` template branches in `TextPostEntryDesktop.svelte` / `TextPostMobile.svelte`.
- `/Forum` entries in the robots.txt disallow list inside `ApplicationGuardMiddleware`.

---

## ✅ Phase 1 — Config → env (complete & verified)

`next/config`'s `serverRuntimeConfig`/`publicRuntimeConfig` only resolve in the Pages Router (`getConfig()` returns null under App Router), so the App Router tree (`lib/apiClient.ts` already reads `process.env.NEXT_PUBLIC_API_FORMAT`) could never see them. Runtime config now flows through **environment variables**, readable from both routers.

**Design:** `config.json` stays the supported source. `next.config.js` reads it and maps it onto `process.env` *before* compilation — public values → `NEXT_PUBLIC_*` (inlined into the client bundle), secrets → server-only `BACKEND_*`. Real env vars win over `config.json` (`setIfUnset`), enabling env-only deploys. `lib/config.js` rebuilds the original `{serverRuntimeConfig, publicRuntimeConfig}` shape from env, so `lib/request.js`/`lib/getFlag.js` needed **no changes**.

| File | Change |
|------|--------|
| `next.config.js` | Removed `serverRuntimeConfig`/`publicRuntimeConfig`; maps `config.json` → `process.env` (public + secret), env vars take precedence |
| `lib/config.js` | Dropped `getConfig()`; builds config object from `process.env.NEXT_PUBLIC_*` / `BACKEND_*` |
| `pages/api/proxy.js` | `getConfig()` → `lib/config` import (aliased `appConfig` to avoid the `export const config` collision) |
| `pages/api/validate-and-add-cookie.js` | `getConfig()` → `lib/config` import |
| `test/proxy.test.js` | Mocks `lib/config` instead of `next/config` |
| `.env.local.example` (new) | Documents the env-var override path |

**Env var mapping:** `baseUrl`→`NEXT_PUBLIC_BASE_URL`, `apiFormat`→`NEXT_PUBLIC_API_FORMAT`, `proxyEnabled`→`NEXT_PUBLIC_PROXY_ENABLED`, `flags`→`NEXT_PUBLIC_FLAGS` (JSON); `csrfKey`→`BACKEND_CSRF_KEY`, `authorization`→`BACKEND_AUTHORIZATION`, `authorizationHeader`→`BACKEND_AUTHORIZATION_HEADER`.

**Verified:** `next build` clean (compiles, lints, types); jest green; `velina.lol` apiFormat **inlined** into client chunks (`app/layout`, `pages/_app`) — proving config now reaches the App Router; secrets confirmed **not** inlined (`BACKEND_CSRF_KEY` stays a runtime `process.env` lookup → `undefined` in browser, no value leaked). No `next/config` imports remain.

---

## ✅ Phase 2 — Routes + re-skin + Chat (complete & verified)

All five named routes converted to App Router and re-skinned to 2020 tokens. Per user direction, the two heavy pages (`/home`, `/develop`) got a **full re-skin now** (not deferred to Phase 4): their data layers were migrated to **React Query** (reusing the existing isomorphic `services/*` functions) and their JSS/Bootstrap replaced with Tailwind.

| Route | New file(s) | Notes |
|-------|-------------|-------|
| `/404` | `app/not-found.tsx` | App Router global 404 (2020). Legacy `pages/404.js` **kept** — still imported by `components/userProfile` for banned users + serves the Pages-Router tree until Phase 7. |
| `/` | `app/page.tsx` | Client: authed → `router.replace('/home')`; logged-out → 2020 landing hero + Sign In CTA (`/login`). |
| `/download` | `app/download/page.tsx` | Flag-driven (`downloadPageEnabled`, `downloadGameClients`); cards re-skinned. |
| `/home` | `app/home/page.tsx` + `_components/{FriendsStrip,GameRows,Feed}.tsx` | Greeting+headshot, friends (presence + headshots), HomeSorts game rows (icons batched), feed iframe (behind `userFeedEnabled`). Legacy `Theme2016` wrapper dropped (theming is token-driven). |
| `/develop` | `app/develop/page.tsx` + `_constants.ts` + `_components/{Games,Clothing,Ads}SubPage.tsx` | My/Group tabs, group selector (filtered to `manageGroupGames`), asset-type nav via `?View=`; games/clothing(upload)/ads(bid) sub-pages. |

**Chat / SignalR:** `components/appShell/ChatMount.tsx` bridges the legacy `<Chat/>` into `app/providers.tsx` — `next/dynamic` `ssr:false` (it imports `@microsoft/signalr` + touches `window`), wrapped in the legacy `AuthenticationStore.Provider` (self-fetching), and gated on `useAuth().isAuthenticated` (legacy `_app` mounted it unconditionally → 401 spam while logged out). SignalR realtime stays behind the `useSignalCoreForRealTimeChat` flag (default off → polling); live hub verification needs the running .NET `/chat` hub.

**Supporting changes:** `lib/thumbnailMap.ts` (targetId→imageUrl helper for the batch thumbnail endpoints); `tailwind.config.ts` content glob fixed to include `components/appShell/**` (latent Phase 0 gap — Navbar/Footer token classes weren't being scanned).

**Verified:** `next build` green (6 App Router routes + legacy pages, no app/pages route conflicts); jest green; prod server (`next start`) SSR smoke test — `/ /home /develop /download` → 200, unknown path → 404 (`app/not-found`), `/download` "unavailable" + 404 "Page not found" render server-side, **no SSR 500s or errors in the server log**. (Data-bound rendering needs the backend; auth-gated pages render null on the server and resolve client-side.)

**Not cut over yet:** these routes are reachable in Next, but `.NET` still proxies `/`, `/home`, `/develop`, `/download` to Next already (none were in `BypassUrls`), so they serve the new App Router versions immediately on deploy. Legacy `pages/{index,home,develop,download}.js` removed.

---

## ✅ Phase 3 — Auth migration (complete & verified)

**Reality vs. the original plan:** the site is **Discord-only** — the JSON `/apisite/auth/v2/{login,signup}` endpoints are deliberately disabled, and there's no password signup. So "JSON login/signup" was moot. The real interactive surface is the Discord OAuth flow + choose-username + account-deletion. User chose **full migration**.

**Pages cut over to Next (`app/auth/*`, re-skinned 2020):** `login` (Discord CTA — not a password form), `home` (landing), `tos`, `privacy`, `credits`, `discord` (info), `choose-username` (interactive), `account-deletion` (interactive). Shared `_components/{AuthCard,DiscordButton}`.

**New .NET JSON endpoints** (`Controllers/v2/AuthFlows.cs`, under the already-bypassed `/apisite/`, faithful ports of the Razor `OnPost` logic incl. validation, race-check, rate-limit, password-gen, and the shared `SessionCookie` `.ROBLOSECURITY` creation):
- `GET  /apisite/auth/v2/discord/pending` — reads HttpOnly `es_discord_pending`, returns `suggestedUsername` (401 if expired).
- `POST /apisite/auth/v2/discord/choose-username` — creates the Discord-linked account + session.
- `POST /apisite/auth/v2/account-deletion` — verify username+password, per-IP daily rate limit, delete + reset avatar.
- CSRF: not bypassed → standard `rbxcsrf4` challenge-retry, which `lib/apiClient` handles automatically.

**Stayed on .NET (bypassed, unchanged):** Discord OAuth (`/auth/discord/login`, `/auth/discord/callback`), the bot-gate `/auth/captcha`, the ban page `/auth/notapproved`, the `/auth/ticket` stub, and the **owner/staff break-glass password login** — **relocated `/auth/login` → `/auth/break-glass`** (one-line `@page` change) so the user-facing `/auth/login` could become the Next Discord CTA without losing the only non-Discord way into the owner account. `/auth/signup` + `/auth/password-reset` kept on .NET too (pure server-side 302→Discord; no UI — Next's static `redirect()` is JS-driven and fragile behind the caching proxy).

**Cutover (`BypassUrls`):** dropped the `/auth/` catch-all; added granular bypasses for the 7 routes above. Everything else under `/auth/*` now proxies to Next. **Allowlist fixes:** `ApplicationGuardMiddleware.allowedUrls` was missing `/auth/credits` + `/auth/choose-username` (would 302→`/auth/home` in lockdown mode) — added, plus `/auth/break-glass`. `CsrfMiddleware` bypass gained `/auth/break-glass`.

**Logout/login wiring:** `AuthProvider` gained `logout()` (POST `/v2/logout` + invalidate auth query + → `/`); Navbar shows a "Log out" control; choose-username invalidates `AUTH_QUERY_KEY` on success then → `/home`.

**Verified:** `.NET` + Next builds green; jest green; prod-server SSR smoke — all 8 `app/auth/*` pages 200 with correct ported content (Discord CTA, TOS, credits, landing). **Needs live-stack verification** (not runnable here without DB/Redis/Discord creds): end-to-end Discord signup → choose-username → session; break-glass login at the new `/auth/break-glass` URL; account-deletion happy/rate-limited paths.

⚠️ **Operator note:** the staff/owner break-glass password login moved from `/auth/login` to **`/auth/break-glass`**.

---

## ⏳ Remaining phases

| Phase | Scope | Size |
|-------|-------|------|
| **4 — Core SPA routes** | Convert catalog, games, users/*, My/*, Trade, Groups, search, messages, places/update; migrate stores → React Query; replace JSS per route. (`/home` + `/develop` already done in Phase 2.) | XL |
| **5 — Internal forms** | Migrate surviving `/internal/*` (create-place, place-update, report-abuse, membership, collectibles, age, updates) to `app/internal/*`. | M |
| **6 — Admin port** | Port the Svelte admin (~34 pages) to `app/admin/*` (client components), reuse `/admin-api/api/*`; flip `/admin` out of BypassUrls. Also clean the deferred forum cosmetics. | XL |
| **7 — Cleanup** | Delete Razor `Pages/Auth`+`Pages/Internal`, `_Layout.cshtml`, the admin bundle routes + `services/admin/`; prune BypassUrls; drop dead deps (jss, react-jss, bootstrap, unstated-next) and `theme.js`/`buttonStyles.js`/`_document.js`. | S–M |

---

## Key mechanism (used throughout)
`services/Roblox/Roblox.Website/Middleware/FrontendProxyMiddleware.cs` → **`BypassUrls`**: any prefix-matched path stays on .NET; everything else proxies to Next. Removing an entry cuts a route over to Next; re-adding it is instant rollback. Restart/flush .NET on each cutover (it caches proxied HTML/JS).

## Verification not yet run
- Apply the 3 DB drop migrations against a throwaway Postgres (`cd services/api && npx knex migrate:latest`) and confirm rollback behavior.
- End-to-end smoke test (Discord signup → open registration, bans still hit `/auth/notapproved`, removed routes 404).
