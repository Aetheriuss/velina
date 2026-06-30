# Velina — Docker / Cloudflare Tunnel deployment

Production stack for `velina.lol` on Unraid, behind a Cloudflare Tunnel (no inbound ports;
CGNAT-friendly). See `../DEPLOYMENT_PLAN.md` for the full rationale. game-server + RCCService run
in a separate **Windows VM** (plan §6), not in this compose.

## What's here

| File | Purpose |
|---|---|
| `../docker-compose.prod.yml` | The stack: postgres, redis, migrations (one-shot), asset-validator, roblox-frontend, roblox-backend, cloudflared |
| `generate-secrets.sh` | Generates all secrets mapped to their config locations (run first) |
| `.env.example` | Copy to repo-root `.env` |
| `cloudflared/config.example.yml` | Copy to `$VELINA_CONFIG_DIR/cloudflared/config.yml` |
| Per-service `Dockerfile`s | `services/{Roblox,2016-roblox-main,AssetValidationServiceV2,api}/Dockerfile` |

## One-time setup

1. **Generate secrets** and store them safely:
   ```bash
   bash deploy/generate-secrets.sh
   ```

2. **`.env`** (repo root): `cp deploy/.env.example .env` and fill in `POSTGRES_PASSWORD`,
   `ASSET_VALIDATION_AUTHORIZATION`, `VELINA_CONFIG_DIR`, `VELINA_DATA_DIR`.

3. **Backend config** in `$VELINA_CONFIG_DIR` (mode 0600):
   - `appsettings.json` — authoritative key list is `services/Roblox/Roblox.Website/Program.cs`.
     Set (in addition to the generated secrets):
     - `BaseUrl` = `https://velina.lol`, `CdnBaseUrl` = `` (or a CDN origin)
     - **`Frontend:BaseUrl`** = `http://roblox-frontend:3000`  *(DEP-3)*
     - **`TrustedProxyNetworks`** = `["172.30.0.0/16"]`  *(must match the compose subnet — P0-7)*
     - `AssetValidation:BaseUrl` = `http://asset-validator:4300`
     - `Render:BaseUrl` = `ws://<windows-vm-ip>:3189` (Phase 4)
     - `Directories:*` all under `/data` (e.g. `/data/assets`, `/data/thumbnails`, …)
     - `Postgres` = `Host=postgres; Database=velina; Username=velina; Password=<...>; Maximum Pool Size=20`
     - `Redis` = `redis:6379`
   - `game-servers.json` — the `GameServers` list.
   - `cloudflared/config.yml` + `cloudflared/credentials.json` (see `cloudflared/config.example.yml`).

4. **Data dir** `$VELINA_DATA_DIR` (`/data` in-container): create the subdirs your `Directories:*`
   point at, and populate static content (public assets, XML templates, JSON data, admin bundle,
   economy-chat bundle). These survive image rebuilds.
   - **Required:** seed `Directories:JsonData` with `avatar-colors.json`, or every avatar
     render/redraw 500s (`AvatarMetadata.GetColors()` reads `<JsonData>/avatar-colors.json`):
     ```bash
     mkdir -p "$VELINA_DATA_DIR/jsondata"
     cp services/Roblox/Roblox.Libraries/Json/avatar-colors.json "$VELINA_DATA_DIR/jsondata/"
     ```
   - **Required:** seed `Directories:Public` with the repo's static `public/` assets, or anything
     that reads `<Public>/...` 500s — e.g. admin **Create Game** / place creation reads
     `<Public>/Baseplate.rbxl` (`AssetsService.CreatePlace`, `FileNotFoundException` otherwise), and
     the `img/` + `UnsecuredContent` static-file routes (`Program.cs`) serve from here too:
     ```bash
     mkdir -p "$VELINA_DATA_DIR/public"
     cp -r services/api/public/. "$VELINA_DATA_DIR/public/"
     ```

5. **Postgres role**: create a least-privilege, **non-superuser** `velina` role (finding H15).

## Bring up

```bash
# build + start everything (migrations run once, forward-only, before the backend starts)
docker compose -f docker-compose.prod.yml up -d --build

# logs
docker compose -f docker-compose.prod.yml logs -f roblox-backend cloudflared
```

The backend is the **sole** ingress; only `cloudflared` talks to the internet (outbound). No
service publishes a host port. Run **exactly one** backend instance (plan §7) — do not scale, and
avoid health-driven restart loops (every restart logs all users out until the per-process secrets
are persisted, which is P1-2).

## Smoke test (plan §8)

After go-live (start private/allowlisted in Cloudflare Access first):
1. `https://velina.lol/` renders the Next home page.
2. `/apisite/*` + `/auth/*` handled by the backend; `/swagger/` is **404** in prod.
3. Login sets `HttpOnly`+`Secure` cookie; session survives navigation.
4. Chat SignalR negotiates and a WS message round-trips through the tunnel.
5. From outside, the internal services are unreachable (no published ports).
6. 18+ asset with the `RbxTempBypassFor18PlusAssets` header → no bypass.

## Notes / still TODO before relying on everything

- **game-server / live games** are Phase 4 (Windows VM). Resolve **RISK-GAMEWS** (is game transport
  WebSocket-over-HTTPS?) before exposing `game.velina.lol`.
- **.NET 10 / Next 14** upgrade is Phase 6 — the images currently target net6.0 / Next 12.
- Frontend config is baked at **build** time (RISK-FE-2): rebuild `roblox-frontend` on domain/flag change.
