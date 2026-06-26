#!/bin/sh
# One-shot, forward-only Knex migrations (DEP-6). Generates knexfile's config.json from
# environment so the DB password stays out of any committed/baked file. Never runs rollbacks.
set -eu

: "${PGHOST:=postgres}"
: "${PGPORT:=5432}"
: "${PGUSER:=velina}"
: "${PGDATABASE:=velina}"
: "${PGPASSWORD:?PGPASSWORD must be set}"

cat > /migrations/config.json <<EOF
{
  "knex": {
    "client": "pg",
    "connection": {
      "host": "${PGHOST}",
      "port": ${PGPORT},
      "user": "${PGUSER}",
      "password": "${PGPASSWORD}",
      "database": "${PGDATABASE}"
    },
    "pool": { "min": 1, "max": 5 }
  }
}
EOF

echo "[migrate] waiting for postgres at ${PGHOST}:${PGPORT} ..."
i=0
until npx knex migrate:currentVersion >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 60 ]; then
    echo "[migrate] postgres not reachable / credentials wrong after ~120s; giving up" >&2
    exit 1
  fi
  sleep 2
done

echo "[migrate] running forward migrations (migrate:latest) ..."
npx knex migrate:latest
echo "[migrate] done."
