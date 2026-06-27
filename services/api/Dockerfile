# syntax=docker/dockerfile:1
# Velina database migrations (Knex) — DEP-1 / DEP-6.
# Run once, forward-only. Never runs rollbacks (a bad down() drops the wrong table — audit L8).
FROM node:22-bookworm-slim
WORKDIR /migrations

COPY package.json package-lock.json ./
RUN npm ci

COPY migrations ./migrations
COPY knexfile.js ./
COPY docker/migrate-entrypoint.sh /usr/local/bin/migrate-entrypoint.sh
# addGroups migration expects this directory to exist.
RUN chmod +x /usr/local/bin/migrate-entrypoint.sh && mkdir -p /migrations/public/images

ENTRYPOINT ["/usr/local/bin/migrate-entrypoint.sh"]
