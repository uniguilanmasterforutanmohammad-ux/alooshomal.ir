# =============================================================================
#  Shared server-level settings + proxy locations for alooshomal.ir.
#
#  Included by both the :80 and :443 server blocks in 01-alooshomal.conf.
#  Every directive here is valid in `server` context.
# =============================================================================

server_tokens off;

# Allow avatar / cover-image uploads to reach the API.
client_max_body_size 25m;

access_log /var/log/nginx/alooshomal.access.log;
error_log  /var/log/nginx/alooshomal.error.log;

# ---- ACME (Let's Encrypt) challenge, served from the shared webroot ---------
location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    default_type "text/plain";
    access_log off;
}

# ---- Next.js route handlers under /api/proxy/* are served by the web app ----
location ^~ /api/proxy/ {
    set $web_upstream web:3000;
    proxy_pass http://$web_upstream$uri$is_args$args;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $alooshomal_proto;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Connection        "";
}

# ---- NestJS API (everything else under /api) --------------------------------
location /api/ {
    set $api_upstream api:4000;
    proxy_pass http://$api_upstream$uri$is_args$args;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $alooshomal_proto;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Connection        "";
    proxy_read_timeout 60s;
}

# ---- Media (MinIO object storage) -------------------------------------------
# Object storage is proxied under /media/ so uploaded images are served from the
# same origin as the site (no extra DNS / CORS) and stay portable: moving media
# to a dedicated host later is just a DNS / upstream change.
location /media/ {
    set $minio_upstream minio:9000;
    rewrite ^/media/(.*)$ /$1 break;
    proxy_pass http://$minio_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $alooshomal_proto;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    access_log off;
}

# ---- Immutable Next.js build assets -----------------------------------------
location /_next/static/ {
    set $web_upstream web:3000;
    proxy_pass http://$web_upstream$uri$is_args$args;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $alooshomal_proto;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    access_log off;
}

# ---- Everything else -> Next.js web app -------------------------------------
location / {
    set $web_upstream web:3000;
    proxy_pass http://$web_upstream$uri$is_args$args;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $alooshomal_proto;
    proxy_set_header X-Forwarded-Host  $host;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_read_timeout 60s;
}
