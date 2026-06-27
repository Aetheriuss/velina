# Velina — Deployment Guide

A practical, copy‑paste guide to take Velina live at **velina.lol** on your **Unraid** box, fronted by a
**Cloudflare Tunnel**. Three machines are involved:

| Machine | Role |
|---|---|
| **Dev box** (this WSL2 machine) | builds the container images and pushes them to a registry |
| **Unraid server** | runs the Docker stack (backend, frontend, Postgres, Redis, validator, cloudflared) |
| **Windows VM** (optional, Phase 4) | runs the game engine `RCCService.exe` + game‑server for thumbnails and live games |

---

## 0. How traffic actually flows (read this first — it answers your questions)

You were right to question "the backend is the only accessible thing." That sentence is about **which
container is wired to the tunnel**, not about what users can reach. Here is the real picture:

```
                          ┌──────────────── Unraid (private docker net: velina-net) ─────────────────┐
 Browser ──HTTPS──▶ Cloudflare edge ──tunnel──▶ cloudflared ──▶ roblox-backend:5000  ◀── SOLE ingress │
 (velina.lol)        (TLS/WAF/DDoS)             (outbound only)        │                               │
                                                                       ├─ GET page/_next/* ─▶ roblox-frontend:3000
                                                                       ├─ /apisite/ /auth/ /api/ … handled here
                                                                       ├─ SQL ─▶ postgres:5432   (never exposed)
                                                                       ├─ cache ─▶ redis:6379     (never exposed)
                                                                       └─ asset checks ─▶ asset-validator:4300 (never exposed)
                          └─────────────────────────────────────────────────────────────────────────┘
```

**Is the website accessible? Yes.** The .NET backend *is* the website's front door. For page requests it
**proxies to the Next.js frontend** (its `FrontendProxyMiddleware`), and it serves the API/auth/admin/chat
routes itself. So `https://velina.lol/` returns the full 2016 site; the frontend container simply doesn't
need its own public door because the backend fronts it. One ingress = one tunnel route, one place for
TLS/CSP/WAF, and Postgres/Redis/validator have **no** public surface at all. That single-front-door design
is the security win — not a limitation.

**What about players connecting to a game?** That is a genuinely separate path and the one open question:

- The game client connects to a **game server in the Windows VM**, not to the web stack.
- Behind **Starlink CGNAT you have no public IP**, so the *only* way inbound traffic reaches home is the
  Cloudflare Tunnel — and a tunnel carries **HTTP/WebSocket only**.
- The join flow (`/game/join.ashx`) hands the client a `WebsocketAddress`, which strongly suggests this
  recreation tunnels game traffic over **WebSocket**. **If that's true, live games work**: add a second
  tunnel route `game.velina.lol → ws://<vm-ip>:3189` and you're done (Phase 4, §7 below).
- **If any game traffic turns out to be raw UDP/RakNet**, an HTTP tunnel can't carry it — you'd need
  Cloudflare **Spectrum** (paid TCP/UDP), a small public **VPS relay**, or players on **WARP/VPN**.
- This unknown is **RISK‑GAMEWS**. It must be verified before relying on live games. **Thumbnail rendering
  is unaffected** (it's backend↔VM over your LAN), and **the whole website + economy works without the VM.**

**Bottom line:** Steps 1–6 give you a fully working public website + accounts + economy. Live games are
Step 7 (Phase 4) and gated on RISK‑GAMEWS.

---

## 1. Prerequisites

- **Dev box:** Docker + compose v2 (you have it), this repo checked out, a GitHub account.
- **Unraid:** Docker enabled (built‑in), the **Docker Compose Manager** plugin (Community Apps) or the
  `docker compose` CLI, and internet egress (for the tunnel + image pulls).
- **Cloudflare:** the **velina.lol** domain added to your Cloudflare account (nameservers pointed at CF).
- **(Optional, Phase 4)** a **Windows VM** on Unraid (KVM) on a LAN the Docker host can reach.

---

## 2. Generate secrets & config (on the dev box)

```bash
cd ~/projects/velina

# 2a. Generate every shared secret (DB password, CSRF, game-server tokens, etc.)
bash deploy/generate-secrets.sh > secrets.txt && chmod 600 secrets.txt
cat secrets.txt        # you'll paste these into the files below
```

Create the four gitignored config files (all are templated by `secrets.txt`):

1. **`.env`** (repo root) — `cp deploy/.env.example .env`, then fill in `POSTGRES_PASSWORD`,
   `ASSET_VALIDATION_AUTHORIZATION`, and set `VELINA_REGISTRY=ghcr.io/<your-github-username-lowercase>`.
   Leave `VELINA_CONFIG_DIR`/`VELINA_DATA_DIR` as the Unraid paths (they're used on Unraid, but the file
   must parse here too for builds).
2. **`services/Roblox/Roblox.Website/appsettings.json`** — **copy the committed template**
   `appsettings.example.json` (it has every key in the right shape; the authoritative source is
   `Program.cs`). This template was boot‑tested against the real .NET 10 image + Postgres/Redis, so it
   starts as‑is once you fill the `REPLACE_WITH_*` placeholders from `secrets.txt`:
   ```bash
   cp services/Roblox/Roblox.Website/appsettings.example.json \
      services/Roblox/Roblox.Website/appsettings.json   # then edit (on Unraid it lives in $VELINA_CONFIG_DIR)
   ```
   The template already sets the Docker‑topology values: `Postgres` (Host=postgres), `Redis`=`redis:6379`,
   `BaseUrl`=`https://velina.lol`, `Frontend:BaseUrl`=`http://roblox-frontend:3000`,
   `AssetValidation:BaseUrl`=`http://asset-validator:4300`, `TrustedProxyNetworks`=`["172.30.0.0/16"]`
   (the P0‑7 fix — must match the compose subnet), and `Directories:*` under `/data`. You must set:
   - all `REPLACE_WITH_*` secrets (from `secrets.txt`) — the `AssetValidation` one must equal the `.env`
     `ASSET_VALIDATION_AUTHORIZATION`; the `Render`/`Rcc` ones must equal the VM's game‑server `authorization`.
   - **`Render:BaseUrl`** → `ws://<windows-vm-ip>:3189` once the VM exists. Leaving the `CHANGE_ME` host is
     harmless — the backend just retries the render WS in the background (verified in the boot test); the
     website is unaffected.
   - **Gotchas the boot test surfaced (don't skip):**
     - **`Twitter:Bearer` must be NON‑empty** or the app crashes at boot (it's only used for the optional
       Twitter‑verification flow). The template ships a harmless non‑empty placeholder — leave it unless you
       use Twitter verification.
     - **`Package*AssetId` / `SignupAssetIds` / `SignupAvatarAssetIds`** are `0`/empty in the template so it
       boots, but avatars/signup won't be correct until you set them to **real seeded catalog asset IDs**.
     - **`OwnerUserId`** = `1` works with the standard seed; for the M23 hardening, provision a different
       staff account out‑of‑band (signup closed) and set that id instead.
3. **`services/Roblox/Roblox.Website/game-servers.json`** — copy `game-servers.example.json` (an empty
   `{"GameServers":[]}` list is fine until Phase 4).

> **Content bundles:** the dirs `Directories:AdminBundle`, `EconomyChatBundle`, `XmlTemplates`, `JsonData`
> and `public/` hold app content, not user data. The app **boots** with them empty, but the admin panel,
> economy chat, and asset‑creation XML won't work until you populate them under `$VELINA_DATA_DIR` (build
> `services/admin` → AdminBundle; copy `services/api/public/*` → public/JsonData/XmlTemplates as applicable).
4. **`services/2016-roblox-main/config.json`** — `cp config.example.json config.json`, then set
   `publicRuntimeConfig.backend.baseUrl = "https://velina.lol"` and
   `apiFormat = "https://velina.lol/apisite/{0}{1}"` (path form), and `serverRuntimeConfig.backend.csrfKey`
   = the frontend CSRF key from `secrets.txt`. **This is baked at build time (RISK‑FE‑2) — rebuild the image
   if you change it.**

> Keep `secrets.txt` and all four files OUT of git (they already are). On Unraid, the appsettings/game-servers/
> cloudflared files live under `$VELINA_CONFIG_DIR` at mode `0600`.

### 2a. Discord OAuth (the only public login/registration)

Velina uses **Discord** as the sole sign-up/login method (the legacy username/password + cookie-import
flows are disabled; only a staff break-glass password login on `/auth/login` remains). Set it up once:

1. Go to <https://discord.com/developers/applications> → **New Application**.
2. **OAuth2 → General**: copy the **Client ID** and **Client Secret**.
3. **OAuth2 → Redirects**: add exactly `https://velina.lol/auth/discord/callback` (must match
   `Discord:RedirectUri` in `appsettings.json` character-for-character).
4. Put the values in `appsettings.json`:
   ```json
   "Discord": {
     "ClientId": "<your client id>",
     "ClientSecret": "<your client secret>",
     "RedirectUri": "https://velina.lol/auth/discord/callback"
   }
   ```
No extra scopes are needed (only `identify`). Flow: visitor clicks **Continue with Discord** on `/login`
→ Discord → back to `/auth/discord/callback` → existing accounts log straight in; brand-new ones pick a
username once at `/auth/choose-username`, then the account is created (auto-approved) and logged in. One
Velina account per Discord id is enforced by a DB unique index.

> **Owner break-glass:** the owner/staff account (the out-of-band `OwnerUserId`) can still log in with a
> password at `/auth/login` if Discord OAuth is ever misconfigured. Everyone else is Discord-only.

---

## 3. Get the images onto Unraid

Pick **one** of three options. **Option A (GHCR) is recommended** — it's "from GitHub," and updates become a
one‑line `pull`.

### Option A — GitHub Container Registry (recommended)

There is no way to pull a *built* image straight from a GitHub repo, but **GHCR** (`ghcr.io`) is GitHub's own
registry. You build here and push there; Unraid pulls.

**On the dev box** — log in once with a Personal Access Token (scope `write:packages`):
```bash
echo $CR_PAT | docker login ghcr.io -u <your-github-username> --password-stdin
# (create CR_PAT at github.com → Settings → Developer settings → Tokens (classic), write:packages)
```
Then build + push all four images:
```bash
cd ~/projects/velina
bash deploy/build-and-push.sh      # builds backend/frontend/validator/migrations, pushes to $VELINA_REGISTRY
```
Make the packages pullable from Unraid — either **make them public** (github.com → your profile → Packages →
each `velina-*` → Package settings → Change visibility → Public), **or** `docker login ghcr.io` on Unraid too
(a `read:packages` PAT).

**On Unraid:**
```bash
cd /mnt/user/appdata/velina        # where you'll keep the compose + .env (see Step 5)
docker compose -f docker-compose.prod.yml --env-file .env pull
```

### Option B — `docker save` / `docker load` (no registry)

Build here, ship tarballs, load on Unraid (good if you don't want a registry; images are ~0.8–1.2 GB each):
```bash
# dev box
bash deploy/build-and-push.sh    # builds the images locally (the push step will fail without login — that's fine,
                                 #  or comment out the push line); OR: docker compose -f docker-compose.prod.yml build
docker save ghcr.io/<you>/velina-backend:latest ghcr.io/<you>/velina-frontend:latest \
            ghcr.io/<you>/velina-asset-validator:latest ghcr.io/<you>/velina-migrations:latest \
  | gzip > velina-images.tar.gz
# copy velina-images.tar.gz to Unraid (SMB share, or: scp velina-images.tar.gz root@unraid:/mnt/user/appdata/velina/)
# Unraid:
gunzip -c /mnt/user/appdata/velina/velina-images.tar.gz | docker load
```

### Option C — build on Unraid (no registry, no transfer)

Clone the repo on Unraid and build there (Unraid has Docker + internet). Simplest if you don't mind the box
doing the build:
```bash
# Unraid
git clone <repo-url> /mnt/user/appdata/velina/src
cd /mnt/user/appdata/velina/src
# put .env + the four config files in place (Step 2), with services/2016-roblox-main/config.json present
docker compose -f docker-compose.prod.yml --env-file .env build
```

---

## 4. Set up the Cloudflare Tunnel

Run these **on the dev box** (or anywhere with `cloudflared`); they produce a `credentials.json` you'll copy
to Unraid.

```bash
cloudflared tunnel login                 # opens a browser; authorize the velina.lol zone
cloudflared tunnel create velina         # prints a TUNNEL UUID and writes ~/.cloudflared/<UUID>.json
cloudflared tunnel route dns velina velina.lol
```

Build the tunnel config from the template:
```bash
cp deploy/cloudflared/config.example.yml ./config.yml
# edit config.yml: set `tunnel:` to the UUID above (the ingress already points at roblox-backend:5000)
```
You'll place `config.yml` + the `<UUID>.json` (renamed to `credentials.json`) under
`$VELINA_CONFIG_DIR/cloudflared/` on Unraid (next step). WebSockets (SignalR chat) ride the tunnel
automatically — no extra flag.

> **Simpler alternative — token mode:** in the Cloudflare Zero Trust dashboard create a tunnel, copy its
> token, and instead of mounting config.yml/credentials.json, set `TUNNEL_TOKEN=...` on the `cloudflared`
> service and change its command to `tunnel --no-autoupdate run`. Then define the public hostname
> (`velina.lol → http://roblox-backend:5000`) in the dashboard. Either mode is fine.

---

## 5. Bring up the stack on Unraid

On Unraid, create the layout and drop the files in place:
```bash
mkdir -p /mnt/user/appdata/velina/config/cloudflared
# Create ALL data dirs the backend touches. The ones marked (boot) are wrapped in a
# PhysicalFileProvider at startup and the app CRASHES if they don't exist.
mkdir -p /mnt/user/appdata/velina/data/{assets,storage,thumbnails,groupicons,xmltemplates,jsondata,adminbundle,economychatbundle}
mkdir -p /mnt/user/appdata/velina/data/public/UnsecuredContent   # (boot)
mkdir -p /mnt/user/appdata/velina/data/public/img                # (boot)
# also boot-critical: thumbnails, groupicons, economychatbundle (created above)
cd /mnt/user/appdata/velina

# copy these from the dev box (SMB/scp):
#   docker-compose.prod.yml                 -> /mnt/user/appdata/velina/
#   .env                                    -> /mnt/user/appdata/velina/.env   (VELINA_CONFIG_DIR/VELINA_DATA_DIR must be the Unraid paths)
#   appsettings.json, game-servers.json     -> /mnt/user/appdata/velina/config/
#   config.yml, credentials.json            -> /mnt/user/appdata/velina/config/cloudflared/
chmod -R 600 /mnt/user/appdata/velina/config
```
(If you used Option C, the compose file is already in `…/velina/src`; run commands from there. Otherwise you
only need `docker-compose.prod.yml` + `.env` on Unraid since images are pre‑pulled/loaded.)

Start it:
```bash
docker compose -f docker-compose.prod.yml --env-file .env pull   # Option A only; skip for B/C
docker compose -f docker-compose.prod.yml --env-file .env up -d
docker compose -f docker-compose.prod.yml logs -f migrations     # watch the one-shot migrations finish (exit 0)
docker compose -f docker-compose.prod.yml ps                     # backend should become healthy (give it ~90s)
```
Order is handled for you: Postgres/Redis become healthy → `migrations` runs once (forward‑only) → backend
starts → cloudflared connects.

> **One‑instance rule:** run exactly **one** `roblox-backend` (the compose pins `replicas: 1`). Its
> CSRF/session/game‑server keys are per‑process, so **every backend restart logs all users out** for now —
> deploy at quiet times and don't add a health‑driven restart loop.

---

## 6. Smoke test (do this before announcing the site)

```bash
curl -I https://velina.lol/                       # 1) home page renders (served via backend→frontend proxy)
curl -s https://velina.lol/apisite/...            # 2) an /apisite/ route is handled by .NET
# 3) sign up / log in in a browser → confirm the session cookie is HttpOnly + Secure and survives navigation
# 4) open chat → confirm SignalR negotiates and a message round-trips (WS over the tunnel)
```
From **outside** your network, confirm the internal services are unreachable (they have no published ports):
`postgres:5432`, `redis:6379`, `asset-validator:4300`, `roblox-backend:5000` must all be **refused/timeout**.
Also confirm Swagger is gone (`https://velina.lol/swagger` → 404 in prod).

**Go live private first:** put a Cloudflare Access policy (allow only your email) in front of velina.lol while
you test, then remove it to open to the public.

---

## 7. (Phase 4, optional) Windows VM — thumbnails + live games

This adds image/thumbnail rendering and (pending RISK‑GAMEWS) live games. The web stack already runs without it.

1. **Create a Windows VM** on Unraid (KVM), on a LAN the Docker host can reach (Unraid `br0`/macvlan).
2. **Get the files onto the VM** (pick one):
   - `git clone <repo-url> C:\velina` (RCCService.exe is committed, so this includes everything), **or**
   - copy just `services\game-server\` and `services\RCCService\` from the dev box via RDP/SMB.
3. **Run the setup script** (PowerShell, as the VM user). It writes `game-server/config.json`, installs +
   builds the game-server, and can launch everything:
   ```powershell
   cd C:\velina\deploy\windows-vm
   .\setup-gameserver.ps1 `
     -BackendUrl http://<backend-LAN-ip>:5000 `   # LAN callback, NOT velina.lol
     -RenderRccSecret <RENDER_RCC_SECRET from secrets.txt> `
     -BotSecret <BOT_SECRET from secrets.txt>
   # then, to run:
   .\setup-gameserver.ps1 -Start
   ```
4. **Wire the backend to the VM:** in `appsettings.json` set `Render:BaseUrl = ws://<vm-ip>:3189`, and make
   the backend's `:5000` reachable on the **LAN** so the VM's `/gs/*` + thumbnail‑upload callbacks land
   (LAN‑only; still no internet port forward). Restart the backend.
5. **Live games (RISK‑GAMEWS):** **first verify** whether the client↔game‑server transport is
   WebSocket‑over‑HTTPS. If yes: uncomment the `game.velina.lol` route in
   `deploy/cloudflared/config.example.yml` (point it at `ws://<vm-ip>:3189`), `cloudflared tunnel route dns
   velina game.velina.lol`, and ensure the join response hands clients that public WS URL. If the transport
   turns out to be raw UDP/RakNet, see §0 (Spectrum / VPS relay / WARP).

> Thumbnails work as soon as steps 1–4 are done. Treat the VM as untrusted (it executes place Lua):
> snapshot it and keep it on a restricted network segment.

---

## 8. Day‑2 operations

- **Update the site:** on the dev box `bash deploy/build-and-push.sh` (rebuilds + pushes), then on Unraid
  `docker compose … pull && docker compose … up -d`. Bump `VELINA_TAG` in `.env` if you want versioned,
  rollback‑able images instead of `latest`.
- **Migrations** run automatically on every `up` (one‑shot, forward‑only — never rolled back).
- **Backups:** the `pgdata` and `redisdata` named volumes hold the DB and sessions; back them up. Content/
  uploads live under `$VELINA_DATA_DIR` — back that up too.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f roblox-backend` (request logs show paths only,
  never query strings — security finding M20).
- **Restarts log users out** (one‑instance key caveat, §5) — schedule accordingly.

---

## Quick reference — what's public vs internal

| Exposed to the internet (via the tunnel) | Internal only (no public surface) |
|---|---|
| `velina.lol` → backend (which also serves the proxied website + chat WS) | postgres, redis, asset‑validator, the frontend container |
| *(Phase 4, if WS)* `game.velina.lol` → game‑server in the VM | the VM's backend callbacks (`/gs/*`, thumbnail upload) — LAN only |
