#!/usr/bin/env bash
#
# build-and-push.sh — build the 4 Velina images on this (dev) box and push them to a registry
# so the Unraid box can pull them. Run from the repo root.
#
# Prereqs on THIS machine:
#   - Docker + compose v2, logged in to the registry (see step "docker login" below).
#   - repo-root .env created (cp deploy/.env.example .env, then fill in — see generate-secrets.sh).
#     The compose file references required vars even at build time, so .env must exist.
#   - services/2016-roblox-main/config.json present with the PROD domain. The frontend bakes
#     publicRuntimeConfig (incl. the domain) at BUILD time (RISK-FE-2), so it must be the prod one.
#
# Registry: set VELINA_REGISTRY / VELINA_TAG in .env. Default is ghcr.io/aetheriuss.
# GHCR login (one time):
#   echo $CR_PAT | docker login ghcr.io -u <github-username> --password-stdin
#   (CR_PAT = a GitHub Personal Access Token with write:packages scope.)
#
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env"
BUILT_SERVICES="roblox-backend roblox-frontend asset-validator migrations"

[ -f .env ] || { echo "ERROR: repo-root .env missing. cp deploy/.env.example .env and fill it in."; exit 1; }
[ -f services/2016-roblox-main/config.json ] || {
  echo "ERROR: services/2016-roblox-main/config.json missing — the frontend bakes the domain at build time."
  echo "       cp services/2016-roblox-main/config.example.json services/2016-roblox-main/config.json and set the prod domain."
  exit 1; }

# Show where we're pushing so a typo'd registry is obvious before a long build.
set -a; . ./.env; set +a
echo "Registry : ${VELINA_REGISTRY:-ghcr.io/aetheriuss}"
echo "Tag      : ${VELINA_TAG:-latest}"
echo "Services : $BUILT_SERVICES"
echo

echo "==> building"
$COMPOSE build $BUILT_SERVICES

echo "==> pushing"
$COMPOSE push $BUILT_SERVICES

echo
echo "Done. On Unraid: docker compose -f docker-compose.prod.yml --env-file .env pull && ... up -d"
