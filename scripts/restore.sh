#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Alooshomal — database restore.
#
# Restores a snapshot produced by ./scripts/backup.sh into the running
# PostgreSQL database.
#
# Usage:
#   ./scripts/restore.sh                       # restore the newest snapshot
#   ./scripts/restore.sh backups/alooshomal_20261011-090000.sql.gz
#   FORCE=1 ./scripts/restore.sh <file>        # skip the confirmation prompt
#
# WARNING: this replaces the current contents of the database with the snapshot.
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER="${DB_CONTAINER:-alooshomal-db}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"

info() { printf '▸ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
die()  { printf '✗ %s\n' "$*" >&2; exit 1; }

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source <(grep -E '^(POSTGRES_USER|POSTGRES_DB|POSTGRES_PASSWORD)=' .env); set +a
fi
DB_USER="${POSTGRES_USER:-alooshomal}"
DB_NAME="${POSTGRES_DB:-alooshomal}"

# ---------------------------------------------------------------------------
#  Pick the snapshot: explicit argument, or the newest one
# ---------------------------------------------------------------------------
SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  SRC="$(ls -1t "$BACKUP_DIR"/alooshomal_*.sql.gz 2>/dev/null | head -n1 || true)"
  [[ -n "$SRC" ]] || die "no snapshots found in $BACKUP_DIR"
  info "using newest snapshot: $(basename "$SRC")"
fi
[[ -f "$SRC" ]] || die "file not found: $SRC"

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  die "database container '$DB_CONTAINER' is not running"
fi

# ---------------------------------------------------------------------------
#  Confirm
# ---------------------------------------------------------------------------
if [[ "${FORCE:-0}" != "1" ]]; then
  printf 'This will REPLACE all data in database "%s". Continue? [y/N] ' "$DB_NAME"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]] || die "aborted"
fi

# ---------------------------------------------------------------------------
#  Restore (pipe decompressed SQL straight into psql)
# ---------------------------------------------------------------------------
info "restoring $(basename "$SRC") into '$DB_NAME'..."
gunzip -c "$SRC" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null
ok "restore complete"
