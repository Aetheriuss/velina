# syntax=docker/dockerfile:1
# Velina frontend (Next.js 14 / React 18, App Router) — unified UI migration.
#
# IMPORTANT (RISK-FE-2): next.config.js reads config.json at BUILD time and maps it onto env vars;
# the NEXT_PUBLIC_* values (incl. the public domain + flags) are inlined into the client bundle.
# config.json is gitignored — it MUST exist in the build context (the RUN below enforces this).
# Rebuild this image whenever the domain or flags change.
#
# Single-stage on purpose: `next start` needs the full dependency tree + .next + config.json.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# App source + the required (gitignored) config.json.
COPY . .
RUN test -f config.json || { echo "ERROR: services/2016-roblox-main/config.json is required at build time (copy from config.example.json and set baseUrl/apiFormat + csrfKey)"; exit 1; }

ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
# next start binds 0.0.0.0:3000 by default; only reachable on the internal velina-net.
CMD ["npm", "run", "start"]
