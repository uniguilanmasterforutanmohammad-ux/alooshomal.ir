#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Refresh the ArvanCloud real-IP block for the containerized Nginx.
#
# ArvanCloud's edge IP ranges change occasionally. Run this on the server to
# regenerate deploy/nginx/conf.d/00-arvancloud-real-ip.conf from the official
# list, then it reloads the nginx container.
#
# Usage (from the deploy directory, e.g. /var/www/alooshomal.ir):
#   ./deploy/nginx/sync-arvancloud-ips.sh
#   ./deploy/nginx/sync-arvancloud-ips.sh /custom/path/00-arvancloud-real-ip.conf
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_FILE="${1:-$SCRIPT_DIR/conf.d/00-arvancloud-real-ip.conf}"
IP_URL="https://www.arvancloud.ir/ips.txt"

echo "Fetching ArvanCloud IP ranges from $IP_URL ..."
IPS="$(curl -fsSL "$IP_URL" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$')"

if [ -z "$IPS" ]; then
  echo "error: no IP ranges returned by ArvanCloud" >&2
  exit 1
fi

mkdir -p "$(dirname "$CONF_FILE")"

{
  echo "# --- Real visitor IP behind ArvanCloud"
  echo "# ArvanCloud proxies requests, so \$remote_addr is an edge node, not the visitor."
  echo "# The real IP arrives in the \"ar-real-ip\" header."
  echo "# Source of ranges: https://www.arvancloud.ir/ips.txt  (refresh occasionally)."
  echo "# Regenerate this block with: deploy/nginx/sync-arvancloud-ips.sh"
  while read -r ip; do
    [ -n "$ip" ] && echo "set_real_ip_from $ip;"
  done <<< "$IPS"
  echo "real_ip_header ar-real-ip;"
  echo "real_ip_recursive on;"
} > "$CONF_FILE"

echo "Wrote $(grep -c '^set_real_ip_from' "$CONF_FILE") ranges to $CONF_FILE"

# Validate and reload the containerized nginx if the compose project is running.
if docker ps --format '{{.Names}}' | grep -q '^alooshomal-nginx$'; then
  docker exec alooshomal-nginx nginx -t
  docker exec alooshomal-nginx nginx -s reload
  echo "Reloaded alooshomal-nginx."
else
  echo "note: alooshomal-nginx is not running; reload skipped."
fi

echo "Done."
