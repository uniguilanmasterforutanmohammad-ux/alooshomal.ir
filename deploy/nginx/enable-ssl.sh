#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Issue a Let's Encrypt certificate with certbot (webroot method) and switch
# the containerized Nginx to also serve HTTPS on port 443.
#
# Run once on the server, after the site is reachable over HTTP:
#   sudo deploy/nginx/enable-ssl.sh
# ---------------------------------------------------------------------------
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_DIR="$SCRIPT_DIR/conf.d"
DOMAIN="${DOMAIN:-alooshomal.ir}"
EMAIL="${EMAIL:-admin@alooshomal.ir}"
WEBROOT="$SCRIPT_DIR/certbot/www"

if [ "$(id -u)" -ne 0 ]; then
  echo "error: run as root (needed for certbot and /etc/letsencrypt)" >&2
  exit 1
fi

mkdir -p "$WEBROOT"

echo "== 1/4 Installing certbot (if missing) =="
if ! command -v certbot >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq certbot
fi

echo "== 2/4 Requesting certificate for $DOMAIN =="
# Only ask for www.* when it actually resolves, otherwise LE rejects the
# whole request with an NXDOMAIN error for that name.
DOMAIN_ARGS=(-d "$DOMAIN")
if getent hosts "www.$DOMAIN" >/dev/null 2>&1; then
  DOMAIN_ARGS+=(-d "www.$DOMAIN")
else
  echo "note: www.$DOMAIN does not resolve; requesting $DOMAIN only."
fi

certbot certonly \
  --webroot -w "$WEBROOT" \
  "${DOMAIN_ARGS[@]}" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --keep-until-expiring --non-interactive

echo "== 3/4 Enabling the HTTPS server block =="
if [ ! -f "$CONF_DIR/02-alooshomal-ssl.conf" ]; then
  cp "$CONF_DIR/02-alooshomal-ssl.conf.template" "$CONF_DIR/02-alooshomal-ssl.conf"
fi

echo "== 4/4 Restarting nginx container =="
cd "$SCRIPT_DIR/../.."
docker compose -f docker-compose.prod.yml up -d nginx
docker exec alooshomal-nginx nginx -t

echo "Done. https://$DOMAIN should now answer directly from the origin."
