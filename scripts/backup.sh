#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Alooshomal — database backup.
#
# Creates a gzip'd pg_dump snapshot of the running PostgreSQL database and
# keeps only the most recent snapshots.
#
# Usage:
#   ./scripts/backup.sh              # take a snapshot into ./backups
#   BACKUP_KEEP=50 ./scripts/backup.sh
#   ./scripts/backup.sh --list       # list existing snapshots
#
# The script talks to the database through the running `db` container, so it
# works the same in development and production.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER="${DB_CONTAINER:-alooshomal-db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-20}"

info() { printf '▸ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
die()  { printf '✗ %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
#  --list : show existing snapshots and exit
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--list" ]]; then
  if [[ ! -d "$BACKUP_DIR" ]]; then
    info "no backups yet ($BACKUP_DIR)"
    exit 0
  fi
  ls -1t "$BACKUP_DIR"/alooshomal_*.sql.gz 2>/dev/null || info "no backups yet"
  exit 0
fi

# ---------------------------------------------------------------------------
#  Resolve database credentials from .env (falling back to compose defaults)
# ---------------------------------------------------------------------------
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source <(grep -E '^(POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD)=' .env); set +a
fi
DB_USER="${POSTGRES_USER:-alooshomal}"
DB_NAME="${POSTGRES_DB:-alooshomal}"

# ---------------------------------------------------------------------------
#  Make sure the database container is up
# ---------------------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  die "database container '$DB_CONTAINER' is not running (docker compose up -d db)"
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/alooshomal_${STAMP}.sql"

# ---------------------------------------------------------------------------
#  Dump
# ---------------------------------------------------------------------------
info "dumping database '$DB_NAME' from '$DB_CONTAINER'..."
if ! docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists > "$OUT"; then
  rm -f "$OUT"
  die "pg_dump failed"
fi

if [[ ! -s "$OUT" ]]; then
  rm -f "$OUT"
  die "snapshot is empty — aborting"
fi

gzip -f "$OUT"
SIZE="$(du -h "${OUT}.gz" | cut -f1)"
ok "snapshot saved: ${OUT}.gz (${SIZE})"

# ---------------------------------------------------------------------------
#  Retention: keep only the newest $BACKUP_KEEP snapshots
# ---------------------------------------------------------------------------
COUNT="$(ls -1 "$BACKUP_DIR"/alooshomal_*.sql.gz 2>/dev/null | wc -l)"
if [[ "$COUNT" -gt "$BACKUP_KEEP" ]]; then
  ls -1t "$BACKUP_DIR"/alooshomal_*.sql.gz | tail -n "+$((BACKUP_KEEP + 1))" | while read -r old; do
    rm -f "$old"
    info "removed old snapshot: $(basename "$old")"
  done
fi

ok "done — $((COUNT > BACKUP_KEEP ? BACKUP_KEEP : COUNT)) snapshot(s) kept in $BACKUP_DIR"
