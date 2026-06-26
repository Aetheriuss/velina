#!/usr/bin/env bash
#
# generate-secrets.sh — generate all shared secrets for a Velina deployment (P0-1 / C1 / H15).
#
# The original README shipped the SAME csrfKey, game-server authorization, websiteBotAuth and
# DB password to every operator, so every install ran with publicly-known keys. Run this once
# per deployment and paste the values into the indicated config locations. Treat any value that
# ever appeared in the README or git history as COMPROMISED — rotate it.
#
# Some secrets MUST be identical across services (the backend and the thing it authenticates to
# compare the same string). Those are grouped below; do not generate them separately.
#
# Usage:
#   bash deploy/generate-secrets.sh            # print to stdout
#   bash deploy/generate-secrets.sh > secrets.txt && chmod 600 secrets.txt
#
set -euo pipefail

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required but not found on PATH" >&2
  exit 1
fi

# Hex tokens: 256-bit, no special characters (safe in headers, URL query, JSON, Lua).
tok()  { openssl rand -hex 32; }
# Longer secret for the HMAC-SHA512 session JWT.
jwt()  { openssl rand -hex 64; }
# DB password: alphanumeric only, so it can't break the semicolon-delimited Npgsql string.
dbpw() { openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 40; }

DB_PASSWORD=$(dbpw)
RENDER_RCC_SECRET=$(tok)        # shared: Render:Authorization == RccAuthorization == game-server authorization
BOT_SECRET=$(tok)               # shared: BotAuthorization == game-server websiteBotAuth
GAME_SERVER_AUTHORIZATION=$(tok)
ASSET_VALIDATION_SECRET=$(tok)  # shared: AssetValidation:Authorization == validator ASSET_VALIDATION_AUTHORIZATION env
APP_GUARD_SECRET=$(tok)         # appsettings "Authorization" (admin/internal guard middleware)
JWT_SESSIONS_SECRET=$(jwt)
FRONTEND_CSRF_KEY=$(openssl rand -base64 64 | tr -d '\n')

cat <<EOF
=====================================================================
 Velina deployment secrets — generated $(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo now)
 Store these somewhere safe (e.g. /mnt/user/appdata/velina/config, mode 0600).
 Anyone with these values can fully compromise the deployment.
=====================================================================

# --- services/Roblox/Roblox.Website/appsettings.json ---
  "Postgres": "Host=postgres; Database=velina; Username=velina; Password=${DB_PASSWORD}; Maximum Pool Size=20",
  "Authorization": "${APP_GUARD_SECRET}",
  "GameServerAuthorization": "${GAME_SERVER_AUTHORIZATION}",
  "BotAuthorization": "${BOT_SECRET}",
  "RccAuthorization": "${RENDER_RCC_SECRET}",
  "Render": { "Authorization": "${RENDER_RCC_SECRET}", ... },
  "AssetValidation": { "Authorization": "${ASSET_VALIDATION_SECRET}", ... },
  "Jwt": { "Sessions": "${JWT_SESSIONS_SECRET}" }

# --- services/2016-roblox-main/config.json (serverRuntimeConfig.backend) ---
  "csrfKey": "${FRONTEND_CSRF_KEY}"
  (or just run:  node services/2016-roblox-main/util/create_config.js)

# --- game-server config.json (inside the Windows VM) ---
  "authorization":  "${RENDER_RCC_SECRET}"     # MUST equal backend Render:Authorization + RccAuthorization
  "websiteBotAuth": "${BOT_SECRET}"            # MUST equal backend BotAuthorization

# --- AssetValidationServiceV2 environment (docker-compose / .env) ---
  ASSET_VALIDATION_AUTHORIZATION=${ASSET_VALIDATION_SECRET}   # MUST equal backend AssetValidation:Authorization

# --- Postgres container (docker-compose / .env) ---
  POSTGRES_PASSWORD=${DB_PASSWORD}
  POSTGRES_USER=velina
  POSTGRES_DB=velina

# --- services/api/config.json (knex, for migrations) ---
  "user": "velina", "password": "${DB_PASSWORD}", "database": "velina"

=====================================================================
 NOTE: create a least-privilege, NON-superuser Postgres role for "velina"
 (the README's default used the postgres superuser — finding H15).
=====================================================================
EOF
