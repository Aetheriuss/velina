# syntax=docker/dockerfile:1
# Velina frontend (Next.js 14 / React 18, App Router) — unified UI migration.
#
# IMPORTANT (RISK-FE-2): next.config.js reads config.json at BUILD time and maps it onto env vars;
# the NEXT_PUBLIC_* values (incl. the public domain + flags) are inlined into the client bundle.
# config.json is gitignored — it MUST exist in the build context (the RUN below enforces this).
# Rebuild this image whenever the domain or flags change.
#
# Multi-stage: the build stage has the full dependency tree; the runtime stage ships only
# the standalone output (`output: 'standalone'` in next.config.js) — the traced server,
# static assets, and config.json. This keeps the pushed image small and splits it into
# several layers, so an interrupted `docker push` loses less progress (completed layers
# are skipped on retry).
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# App source + the required (gitignored) config.json.
COPY . .
RUN test -f config.json || { echo "ERROR: services/2016-roblox-main/config.json is required at build time (copy from config.example.json and set baseUrl/apiFormat + csrfKey)"; exit 1; }

ENV NODE_ENV=production
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# The standalone server reads HOSTNAME/PORT; exec-form CMD means no shell sets HOSTNAME.
ENV HOSTNAME=0.0.0.0 PORT=3000

# Stable layers first (public assets, static chunks) so unchanged ones dedupe on push.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/.next/standalone ./
# docker-start.js replicates the config.json -> env mapping that `next start` did via
# next.config.js (the standalone server.js does not load next.config.js at runtime).
COPY --from=build /app/config.json /app/docker-start.js ./

EXPOSE 3000
# Only reachable on the internal velina-net; proxied by roblox-backend.
CMD ["node", "docker-start.js"]
