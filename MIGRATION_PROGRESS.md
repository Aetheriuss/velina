# Unified Next.js Migration — Progress

Migrating Velina's three-headed UI (Next.js `2016-roblox-main` + .NET Razor pages + Svelte `admin`) into **one modern Next.js App Router app**, re-themed from 2016 to **2020-era Roblox styling (light + dark)**, backed by the existing .NET JSON API. Also removing redundant features along the way.

- **Branch:** `feature/unified-nextjs-2020`
- **Plan file:** `~/.claude/plans/create-a-plan-to-drifting-harp.md`
- **Status:** Phase 0 ✅ · Phase R ✅ · Phases 1–7 pending
- **Build health:** `.NET` 0 errors · Next frontend builds (30 pages)

---

## Commits so far

| Commit | Summary |
|--------|---------|
| `e2d54dd` | Phase 0 scaffold + remove forums & clothing-stealer |
| `61e53a2` | Phase R: remove account-application, invite, social-verification, Twitter (UI + flow) |
| `13a6231` | Phase R complete: dead code, enums, DB drop migrations |

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

**Deferred to Phase 2/3:** mounting `<Chat/>` (SignalR) into the shell (auth-dependent).

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

## ⏳ Remaining phases

| Phase | Scope | Size |
|-------|-------|------|
| **1 — Config → env** | Replace `serverRuntimeConfig`/`publicRuntimeConfig` with env vars in `next.config.js`, `lib/config.js`, `lib/request.js`, `lib/getFlag.js`, `pages/api/proxy.js`. **Hard prerequisite** for App Router data pages. | S |
| **2 — Low-risk routes + theming proof** | Convert `/404`, `/download`, `/develop`, `/`, `/home` to App Router, re-skinned; mount `<Chat/>`, verify SignalR. | M |
| **3 — Auth migration** | Split the `"/auth/"` BypassUrls catch-all into granular prefixes; add JSON Discord `choose-username` + JSON login/signup; build `app/auth/*` (login, signup, discord, captcha, TOS/privacy/credits, password-reset, account-deletion) with `credentials:'include'` POSTs; invalidate the auth query on login. **Highest risk.** | L |
| **4 — Core SPA routes** | Convert catalog, games, users/*, My/*, Trade, Groups, search, messages, places/update; migrate stores → React Query; replace JSS per route. | XL |
| **5 — Internal forms** | Migrate surviving `/internal/*` (create-place, place-update, report-abuse, membership, collectibles, age, updates) to `app/internal/*`. | M |
| **6 — Admin port** | Port the Svelte admin (~34 pages) to `app/admin/*` (client components), reuse `/admin-api/api/*`; flip `/admin` out of BypassUrls. Also clean the deferred forum cosmetics. | XL |
| **7 — Cleanup** | Delete Razor `Pages/Auth`+`Pages/Internal`, `_Layout.cshtml`, the admin bundle routes + `services/admin/`; prune BypassUrls; drop dead deps (jss, react-jss, bootstrap, unstated-next) and `theme.js`/`buttonStyles.js`/`_document.js`. | S–M |

---

## Key mechanism (used throughout)
`services/Roblox/Roblox.Website/Middleware/FrontendProxyMiddleware.cs` → **`BypassUrls`**: any prefix-matched path stays on .NET; everything else proxies to Next. Removing an entry cuts a route over to Next; re-adding it is instant rollback. Restart/flush .NET on each cutover (it caches proxied HTML/JS).

## Verification not yet run
- Apply the 3 DB drop migrations against a throwaway Postgres (`cd services/api && npx knex migrate:latest`) and confirm rollback behavior.
- End-to-end smoke test (Discord signup → open registration, bans still hit `/auth/notapproved`, removed routes 404).
