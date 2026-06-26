# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted recreation of a 2016-era Roblox website ("economy simulator"). It is a polyglot monorepo: every service lives under `services/` and runs as a separate process. There is no single build or run command for the whole system — `services/runall.bat` (Windows) starts the user-facing services together, and the original step-by-step setup lives in the root `README.md`.

## Services and how they fit together

The **.NET `Roblox` solution is the core backend** and the entry point for almost all work. Everything else is a satellite it talks to.

| Dir | Stack | Role |
|-----|-------|------|
| `services/Roblox` | C# / .NET 6 (ASP.NET Core) | **Main backend.** Web API, Razor pages, SignalR chat, Swagger, and a reverse proxy to the frontend. Listens on `:5000`. |
| `services/2016-roblox-main` | Next.js 12 / React 17 | Main frontend (the 2016 Roblox UI). The .NET site proxies to it. |
| `services/api` | Node / TS / Express | **Legacy.** Now only holds the Knex Postgres **migrations** (`migrations/`) and `public/` static assets. See its `README.MD`. |
| `services/game-server` | Node / TS | Manages `RCCService` processes (game servers + thumbnail rendering) over WebSocket. |
| `services/RCCService` | Windows binary + content | The actual Roblox game/render engine. Run as `RCCService.exe -console -placeid:1818`. |
| `services/AssetValidationServiceV2` | Go / Fiber | Validates uploaded assets. |
| `services/admin` | Svelte / TS / Webpack | Admin panel SPA, built to a bundle the .NET site serves. |
| `services/web` | Node / Express | Dev helper: scrapes real roblox.com and rewrites URLs (`:3200`). |
| `services/asset-backup` | Node | SFTP asset backup script. |
| `services/table-generator` | Node | HTML table generator. |

**Request flow:** A request hits `Roblox.Website`. `FrontendProxyMiddleware` (`Roblox.Website/Middleware/`) forwards everything to the Next.js frontend *except* a hardcoded `BypassUrls` list (`/apisite/`, `/api/`, `/swagger/`, `/auth/`, various `/internal/` Razor routes). The API mimics roblox.com's structure — clients call `/apisite/{subdomain}/...` and controllers are organized by version (`Controllers/v1`, `v2`, `Internal`).

**Rendering / games:** `Roblox.Rendering.CommandHandler` opens a WebSocket to `game-server` (`Render:BaseUrl` in config), which spawns and manages `RCCService` instances.

**Data:** Postgres is the database; its schema is defined entirely by the Knex migrations in `services/api`. Redis backs caching and sessions.

## .NET solution layout (`services/Roblox`)

- `Roblox.Website` — controllers, middleware, Razor `Pages/`, SignalR `Hubs/`. Startup wiring is all in `Program.cs` (minimal hosting model, no `Startup.cs`).
- `Roblox.Services` — business logic and **all DB access** (Dapper + Npgsql). Models in `DbModels/`, grouped service classes (`Users/`, `Games/`, `Groups/`, `Assets/`, `Economy.cs`, etc.).
- `Roblox.Models` / `Roblox.Dto` — shared data shapes.
- `Roblox.Configuration` — static config holder, populated once at startup.
- `Roblox.Cache` (Redis), `Roblox.Rendering`, `Roblox.AbuseDetection`, `Roblox.EconomyChat`, `Roblox.Libraries`, `Roblox.Logging`, `Roblox.Metrics`, `Roblox.Exceptions`.

Two patterns to know before editing service code:
- **Service access:** never `new` a service. Use `Roblox.Services.ServiceProvider.GetOrCreate<T>()` (`Roblox.Services/Services/ServiceProvider.cs`), which caches thread-safe reusable services and threads transaction connections through a `parent`.
- **Database is effectively single-instance.** `Roblox.Services.Database` exposes a static connection guarded by a global `Mutex`. Several startup values (CSRF key, session secret, game-server token) are generated per-process with `Guid.NewGuid()` and carry `// TODO: would break if we ever load balance` — assume **one process only**; do not introduce horizontal scaling assumptions.

## Common commands

**Backend (.NET, run from `services/Roblox`):**
```bash
./dev.sh                      # dotnet watch run --project Roblox.Website --no-hot-reload
dotnet build Roblox.sln
dotnet test                                          # all unit tests (xUnit)
dotnet test Roblox.UnitTest/Roblox.UnitTest.csproj   # one test project
dotnet test --filter "FullyQualifiedName~ReadBadImage"  # one test
```
Integration tests are Docker-based (they use a throwaway Postgres/Redis so they can't corrupt a real DB):
```bash
cd Roblox.IntegrationTest && ./run.sh   # docker-compose build + migrations + integration_test
```

**Migrations (run from `services/api`, requires `config.json`):**
```bash
npx knex migrate:latest
npx knex migrate:make addSomethingTable
```

**Frontend (`services/2016-roblox-main`, requires `config.json`):**
```bash
npm run dev          # next dev
npm run build && npm run start
npm run test         # jest
npm run lint
```

**Other Node services:** `game-server` and `admin` use `npm run dev` / `npm run build`; `web` uses `npm run dev`. **Go:** `cd services/AssetValidationServiceV2 && go run main.go`.

Runtimes: Node 18, .NET 6, Go ≥1.18.

## Configuration (all gitignored — create before running)

| File | Notes |
|------|-------|
| `services/Roblox/Roblox.Website/appsettings.json` | Read in `Program.cs`; that file is the authoritative list of required keys (`Postgres`, `Redis`, `Directories:*`, `BaseUrl`, `HCaptcha:*`, `Render:*`, `OwnerUserId`, asset IDs, etc.). |
| `services/Roblox/Roblox.Website/game-servers.json` | `GameServers` list, read separately at startup. |
| `services/api/config.json` | Holds the `knex` block; consumed by `knexfile.js` for migrations. |
| `services/2016-roblox-main/config.json` | `serverRuntimeConfig` / `publicRuntimeConfig`; copy from `config.example.json`. |
| `services/game-server/config.json` | Validated against `IWebsiteConfiguration` in `src/helpers/Config.ts`. |

`OwnerUserId` in `appsettings.json` designates the staff/admin account (see `Roblox.Website/Filters/StaffFilter.cs`). The README's setup flow depends on specific seeded user IDs (owner = 1).
