/**
 * Files embedded into every full backup bundle. Keeping them in code (instead
 * of a static folder) means the production image — which only copies `dist`
 * and `prisma` — still ships a working restore script.
 */

export const RESTORE_SCRIPT = String.raw`#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Alooshomal — full restore (database + media) from this bundle.
#
#   FORCE=1 ./restore.sh
#
# Requires the running stack (db + minio containers). This REPLACES the current
# database contents and overwrites same-named media objects.
# ---------------------------------------------------------------------------
set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
DB_CONTAINER="\${DB_CONTAINER:-alooshomal-db}"
MINIO_CONTAINER="\${MINIO_CONTAINER:-alooshomal-minio}"
BUCKET="\${MINIO_BUCKET:-__BUCKET__}"

info() { printf '▸ %s\n' "$*"; }
ok()   { printf '✓ %s\n' "$*"; }
die()  { printf '✗ %s\n' "$*" >&2; exit 1; }

[[ -f "$BUNDLE_DIR/db.sql.gz" ]] || die "db.sql.gz not found next to this script"

if [[ -f "$BUNDLE_DIR/../.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source <(grep -E '^(POSTGRES_USER|POSTGRES_DB|MINIO_ROOT_USER|MINIO_ROOT_PASSWORD)=' "$BUNDLE_DIR/../.env"); set +a
fi
DB_USER="\${POSTGRES_USER:-alooshomal}"
DB_NAME="\${POSTGRES_DB:-alooshomal}"
MINIO_USER="\${MINIO_ROOT_USER:-alooshomal}"
MINIO_PASS="\${MINIO_ROOT_PASSWORD:-change_me_in_production}"

docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" || die "container '$DB_CONTAINER' is not running"

if [[ "\${FORCE:-0}" != "1" ]]; then
  printf 'This will REPLACE database "%s" and restore media into bucket "%s". Continue? [y/N] ' "$DB_NAME" "$BUCKET"
  read -r reply
  [[ "$reply" =~ ^[Yy]$ ]] || die "aborted"
fi

info "restoring database..."
gunzip -c "$BUNDLE_DIR/db.sql.gz" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 >/dev/null
ok "database restored"

if [[ -d "$BUNDLE_DIR/media/$BUCKET" ]]; then
  docker ps --format '{{.Names}}' | grep -qx "$MINIO_CONTAINER" || die "container '$MINIO_CONTAINER' is not running"
  info "restoring media..."
  docker exec "$MINIO_CONTAINER" rm -rf /tmp/alooshomal-restore 2>/dev/null || true
  docker cp "$BUNDLE_DIR/media/." "$MINIO_CONTAINER:/tmp/alooshomal-restore"
  docker exec "$MINIO_CONTAINER" sh -c \
    "mc alias set restore http://127.0.0.1:9000 '$MINIO_USER' '$MINIO_PASS' >/dev/null && mc mb --ignore-existing restore/$BUCKET >/dev/null && mc mirror --overwrite /tmp/alooshomal-restore/$BUCKET restore/$BUCKET >/dev/null"
  docker exec "$MINIO_CONTAINER" rm -rf /tmp/alooshomal-restore 2>/dev/null || true
  ok "media restored"
else
  info "bundle has no media folder — skipping media restore"
fi

ok "restore complete. Restart the API to drop cached sessions: docker restart alooshomal-api"
`;

export const RESTORE_README = `# بسته‌ی پشتیبان آلوشمال

این بسته شامل همه‌چیزِ لازم برای بازگرداندن سامانه است:

- \`db.sql.gz\` — دامپ کامل دیتابیس PostgreSQL (با \`--clean --if-exists\`)
- \`media/<bucket>/...\` — تمام فایل‌های آپلودشده (تصویر پروفایل، لوگو، پست، مدارک)
- \`manifest.json\` — تاریخ، حجم، هش SHA-256 و تعداد فایل‌ها
- \`SHA256SUMS\` — برای بررسی سالم‌بودن فایل‌ها
- \`restore.sh\` — اسکریپت بازیابی روی سرور دارای داکر

## بازیابی

۱) بسته را روی سرور مقصد (کنار \`docker-compose.yml\`) کپی و باز کنید:

\`\`\`bash
tar -xzf alooshomal_YYYYMMDD-HHMMSS.tar.gz -C ./restore-bundle
cd ./restore-bundle
sha256sum -c SHA256SUMS
\`\`\`

۲) با دسترسی root اجرا کنید (دیتابیس و رسانه‌ها جایگزین می‌شوند):

\`\`\`bash
FORCE=1 ./restore.sh
\`\`\`

۳) سرویس API را ری‌استارت کنید تا نشست‌های کش‌شده پاک شوند:

\`\`\`bash
docker restart alooshomal-api
\`\`\`

> اگر بسته را از پنل مدیر دانلود کرده‌اید، همین فایل‌ها داخل آن هستند و نیازی
> به هیچ ابزار اضافه‌ای نیست؛ فقط \`docker\` و \`mc\` (داخل کانتینر MinIO) لازم است.
`;
