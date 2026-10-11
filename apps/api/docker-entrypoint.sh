#!/bin/sh
# ---------------------------------------------------------------------------
# API container entrypoint.
#
# Before applying the Prisma schema to the database (`prisma db push`), this
# script snapshots the database with `pg_dump` whenever the schema ACTUALLY
# changed. This guards against `--accept-data-loss` wiping real user data after
# a structural change (renamed tables/columns, dropped fields, ...).
#
# Behaviour:
#   - hashes prisma/schema.prisma
#   - if the hash differs from the last one seen, dumps the DB to $BACKUP_DIR
#   - skips the dump when the database has no user tables yet (fresh install)
#   - keeps only the last $BACKUP_KEEP dumps (default 20)
#   - then runs `prisma db push` and starts the app
# ---------------------------------------------------------------------------
set -e

BACKUP_DIR="${BACKUP_DIR:-/usr/src/app/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-20}"
SCHEMA_FILE="prisma/schema.prisma"
HASH_FILE="$BACKUP_DIR/.last-schema-hash"

log() { echo "[entrypoint] $*"; }

# ---------------------------------------------------------------------------
# 1) Snapshot the database only when the schema changed
# ---------------------------------------------------------------------------
if [ -n "${DATABASE_URL:-}" ] && [ -f "$SCHEMA_FILE" ]; then
  mkdir -p "$BACKUP_DIR"

  CURRENT_HASH="$(sha256sum "$SCHEMA_FILE" 2>/dev/null | cut -d' ' -f1 || echo unknown)"
  PREVIOUS_HASH="$(cat "$HASH_FILE" 2>/dev/null || echo none)"
  CLEAN_URL="$(printf '%s' "$DATABASE_URL" | sed 's/?.*$//')"

  if [ "$CURRENT_HASH" != "$PREVIOUS_HASH" ]; then
    TABLES="$(psql "$CLEAN_URL" -tAc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" \
      2>/dev/null || echo 0)"

    if [ "${TABLES:-0}" -gt 0 ]; then
      STAMP="$(date +%Y%m%d-%H%M%S)"
      OUT="$BACKUP_DIR/alooshomal_${STAMP}.sql"
      if pg_dump "$CLEAN_URL" > "$OUT" 2>/dev/null && [ -s "$OUT" ]; then
        gzip -f "$OUT"
        log "schema changed → database snapshot saved: ${OUT}.gz"
      else
        rm -f "$OUT"
        log "schema changed but snapshot failed (database unreachable?)"
      fi
    else
      log "schema changed but database is empty → no snapshot needed"
    fi

    # Retention: keep the most recent $BACKUP_KEEP dumps.
    if [ "$(ls -1 "$BACKUP_DIR"/alooshomal_*.sql.gz 2>/dev/null | wc -l)" -gt "$BACKUP_KEEP" ]; then
      ls -1t "$BACKUP_DIR"/alooshomal_*.sql.gz 2>/dev/null \
        | tail -n "+$((BACKUP_KEEP + 1))" \
        | while read -r old; do rm -f "$old"; done
    fi

    printf '%s' "$CURRENT_HASH" > "$HASH_FILE"
  else
    log "schema unchanged → skipping snapshot"
  fi
fi

# ---------------------------------------------------------------------------
# 2) Apply the schema and start the application
# ---------------------------------------------------------------------------
if command -v npx >/dev/null 2>&1; then
  npx prisma db push --skip-generate --accept-data-loss
fi

exec "$@"
