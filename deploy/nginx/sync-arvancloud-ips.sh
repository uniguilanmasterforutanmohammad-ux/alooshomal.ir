#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Refresh the ArvanCloud real-IP block inside alooshomal.ir.conf.
#
# ArvanCloud's edge IP ranges change occasionally. Run this on the server to
# regenerate the `set_real_ip_from ...` lines from the official list, then it
# reloads Nginx.
#
# Usage (as root):
#   ./sync-arvancloud-ips.sh /etc/nginx/sites-available/alooshomal.ir.conf
# ---------------------------------------------------------------------------
set -euo pipefail

CONF_FILE="${1:-/etc/nginx/sites-available/alooshomal.ir.conf}"
IP_URL="https://www.arvancloud.ir/ips.txt"
START_MARK="# --- Real visitor IP behind ArvanCloud"
END_MARK="real_ip_recursive on;"

if [ ! -f "$CONF_FILE" ]; then
  echo "error: config file not found: $CONF_FILE" >&2
  exit 1
fi

echo "Fetching ArvanCloud IP ranges from $IP_URL ..."
IPS="$(curl -fsSL "$IP_URL" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$')"

if [ -z "$IPS" ]; then
  echo "error: no IP ranges returned by ArvanCloud" >&2
  exit 1
fi

BLOCK="$(mktemp)"
{
  echo "$START_MARK"
  echo "# ArvanCloud proxies requests, so \$remote_addr is an edge node, not the visitor."
  echo "# The real IP arrives in the \"ar-real-ip\" header."
  echo "# Source of ranges: https://www.arvancloud.ir/ips.txt  (refresh occasionally)."
  while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done <<< "$IPS"
  echo "real_ip_header ar-real-ip;"
  echo "real_ip_recursive on;"
} > "$BLOCK"

BACKUP="${CONF_FILE}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CONF_FILE" "$BACKUP"

# Replace everything between START_MARK and END_MARK (inclusive) with the new block.
awk -v start="$START_MARK" -v end="$END_MARK" -v blockfile="$BLOCK" '
  index($0, start) && !done {
    while ((getline line < blockfile) > 0) print line
    close(blockfile)
    done = 1
    skip = 1
  }
  skip && index($0, end) { skip = 0; next }
  skip { next }
  { print }
' "$CONF_FILE" > "${CONF_FILE}.tmp"

mv "${CONF_FILE}.tmp" "$CONF_FILE"
rm -f "$BLOCK"

echo "Updated ArvanCloud ranges (backup: $BACKUP)"
nginx -t && systemctl reload nginx
echo "Done."
