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
# Every public domain served by this origin. The first one is the certificate's
# primary name, and therefore the /etc/letsencrypt/live/<name> path referenced
# by 02-alooshomal-ssl.conf.template. Add a domain here once its DNS points at
# this server and it is listed in the nginx `server_name`s, then re-run the
# script: `--expand` grows the existing certificate instead of issuing a second
# one, so the nginx config never has to change.
DOMAINS="${DOMAINS:-alooshomal.ir shomalicard.ir}"
DOMAIN="${DOMAIN:-${DOMAINS%% *}}"
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

echo "== 2/4 Requesting certificate for: $DOMAINS =="
# Only ask for www.* when it actually resolves, otherwise LE rejects the whole
# request with an NXDOMAIN error for that name.
DOMAIN_ARGS=()
for domain in $DOMAINS; do
  DOMAIN_ARGS+=(-d "$domain")
  if getent hosts "www.$domain" >/dev/null 2>&1; then
    DOMAIN_ARGS+=(-d "www.$domain")
  else
    echo "note: www.$domain does not resolve; requesting $domain only."
  fi
done

certbot certonly \
  --webroot -w "$WEBROOT" \
  --cert-name "$DOMAIN" \
  --expand \
  "${DOMAIN_ARGS[@]}" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --keep-until-expiring --non-interactive

echo "== 3/4 Enabling the HTTPS server block =="
# The template is the source of truth for this generated file; refresh it on
# every run so a newly added `server_name` (e.g. a second domain) takes effect
# even when the HTTPS block already exists.
cp "$CONF_DIR/02-alooshomal-ssl.conf.template" "$CONF_DIR/02-alooshomal-ssl.conf"

echo "== 4/4 Restarting nginx container =="
cd "$SCRIPT_DIR/../.."
docker compose -f docker-compose.prod.yml up -d nginx
docker exec alooshomal-nginx nginx -t
docker exec alooshomal-nginx nginx -s reload

echo "Done. https://$DOMAIN (and the other names in DOMAINS) should now answer directly from the origin."
