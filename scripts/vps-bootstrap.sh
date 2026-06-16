#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Prime POS — VPS bootstrap (Ubuntu 22.04 / 24.04, Debian 12)
#
# Provisions a fresh VPS so the GitHub Actions deploy workflow
# (.github/workflows/deploy.yml) works out of the box:
#   - PHP 8.4 + FPM + extensions Laravel needs
#   - Composer 2
#   - Nginx (SPA + Laravel API vhost template)
#   - MySQL client + Redis client
#   - Deploy user with passwordless sudo limited to php-fpm + nginx reload
#   - SSH key authorised for that user
#   - Directory layout: /var/www/primepos/{frontend,backend}
#
# Usage (run as root):
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/scripts/vps-bootstrap.sh \
#     | DEPLOY_USER=deploy DOMAIN=app.example.com API_DOMAIN=api.example.com \
#       SSH_PUBLIC_KEY="ssh-ed25519 AAAA... you@laptop" bash
#
# Re-running is safe: every step is idempotent.
# ---------------------------------------------------------------------------
set -euo pipefail

: "${DEPLOY_USER:=deploy}"
: "${DOMAIN:=_}"                 # SPA hostname (or _ for default server)
: "${API_DOMAIN:=_}"             # Laravel API hostname (or _ for default)
: "${WS_DOMAIN:=}"               # Reverb websocket hostname (optional)
: "${SSH_PUBLIC_KEY:=}"          # public key for the deploy user (optional but recommended)
: "${PHP_VERSION:=8.4}"
: "${FRONTEND_DIR:=/var/www/primepos/frontend}"
: "${BACKEND_DIR:=/var/www/primepos/backend}"

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Must run as root (sudo bash $0)" >&2
  exit 1
fi

. /etc/os-release
log "Detected ${PRETTY_NAME:-unknown}"

# ---------------------------------------------------------------------------
log "1/9  APT base packages"
# ---------------------------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg lsb-release software-properties-common \
  unzip git rsync ufw cron supervisor \
  mysql-client redis-tools

# ---------------------------------------------------------------------------
log "2/9  PHP ${PHP_VERSION} (ondrej/php PPA on Ubuntu, sury on Debian)"
# ---------------------------------------------------------------------------
if [[ "${ID:-}" == "ubuntu" ]]; then
  if ! grep -rq "ondrej/php" /etc/apt/sources.list.d/ 2>/dev/null; then
    add-apt-repository -y ppa:ondrej/php
  fi
elif [[ "${ID:-}" == "debian" ]]; then
  if [[ ! -f /etc/apt/sources.list.d/sury-php.list ]]; then
    curl -fsSL https://packages.sury.org/php/apt.gpg \
      | gpg --dearmor -o /usr/share/keyrings/sury-php.gpg
    echo "deb [signed-by=/usr/share/keyrings/sury-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" \
      > /etc/apt/sources.list.d/sury-php.list
  fi
fi
apt-get update -y

apt-get install -y --no-install-recommends \
  "php${PHP_VERSION}-fpm" \
  "php${PHP_VERSION}-cli" \
  "php${PHP_VERSION}-common" \
  "php${PHP_VERSION}-mysql" \
  "php${PHP_VERSION}-mbstring" \
  "php${PHP_VERSION}-intl" \
  "php${PHP_VERSION}-bcmath" \
  "php${PHP_VERSION}-zip" \
  "php${PHP_VERSION}-gd" \
  "php${PHP_VERSION}-curl" \
  "php${PHP_VERSION}-xml" \
  "php${PHP_VERSION}-redis" \
  "php${PHP_VERSION}-opcache"

# Sensible php.ini tweaks for both CLI and FPM
for ini in "/etc/php/${PHP_VERSION}/fpm/php.ini" "/etc/php/${PHP_VERSION}/cli/php.ini"; do
  [[ -f "$ini" ]] || continue
  sed -i \
    -e 's/^;\?memory_limit\s*=.*/memory_limit = 512M/' \
    -e 's/^;\?upload_max_filesize\s*=.*/upload_max_filesize = 50M/' \
    -e 's/^;\?post_max_size\s*=.*/post_max_size = 50M/' \
    -e 's/^;\?max_execution_time\s*=.*/max_execution_time = 120/' \
    -e 's/^;\?date.timezone\s*=.*/date.timezone = Asia\/Dhaka/' \
    "$ini"
done

systemctl enable --now "php${PHP_VERSION}-fpm"

# ---------------------------------------------------------------------------
log "3/9  Composer 2"
# ---------------------------------------------------------------------------
if ! command -v composer >/dev/null; then
  EXPECTED_SIG="$(curl -fsSL https://composer.github.io/installer.sig)"
  php -r "copy('https://getcomposer.org/installer', '/tmp/composer-setup.php');"
  ACTUAL_SIG="$(php -r "echo hash_file('sha384', '/tmp/composer-setup.php');")"
  [[ "$EXPECTED_SIG" == "$ACTUAL_SIG" ]] || { echo "Composer signature mismatch"; exit 1; }
  php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
  rm -f /tmp/composer-setup.php
fi

# ---------------------------------------------------------------------------
log "4/9  Nginx"
# ---------------------------------------------------------------------------
apt-get install -y --no-install-recommends nginx
systemctl enable --now nginx

# ---------------------------------------------------------------------------
log "5/9  Deploy user: ${DEPLOY_USER}"
# ---------------------------------------------------------------------------
if ! id "${DEPLOY_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG www-data "${DEPLOY_USER}"

# Passwordless sudo limited to fpm + nginx reloads (used by deploy.yml)
cat > "/etc/sudoers.d/${DEPLOY_USER}-deploy" <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: /bin/systemctl reload php${PHP_VERSION}-fpm, /bin/systemctl reload nginx, /usr/bin/systemctl reload php${PHP_VERSION}-fpm, /usr/bin/systemctl reload nginx
EOF
chmod 440 "/etc/sudoers.d/${DEPLOY_USER}-deploy"
visudo -cf "/etc/sudoers.d/${DEPLOY_USER}-deploy" >/dev/null

if [[ -n "${SSH_PUBLIC_KEY}" ]]; then
  install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"
  touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  grep -qxF "${SSH_PUBLIC_KEY}" "/home/${DEPLOY_USER}/.ssh/authorized_keys" \
    || echo "${SSH_PUBLIC_KEY}" >> "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

# ---------------------------------------------------------------------------
log "6/9  Directory layout"
# ---------------------------------------------------------------------------
install -d -m 755 -o "${DEPLOY_USER}" -g www-data "${FRONTEND_DIR}"
install -d -m 755 -o "${DEPLOY_USER}" -g www-data "${BACKEND_DIR}"
install -d -m 775 -o "${DEPLOY_USER}" -g www-data \
  "${BACKEND_DIR}/storage" \
  "${BACKEND_DIR}/storage/app" \
  "${BACKEND_DIR}/storage/app/public" \
  "${BACKEND_DIR}/storage/app/private" \
  "${BACKEND_DIR}/storage/framework" \
  "${BACKEND_DIR}/storage/framework/cache" \
  "${BACKEND_DIR}/storage/framework/sessions" \
  "${BACKEND_DIR}/storage/framework/views" \
  "${BACKEND_DIR}/storage/logs" \
  "${BACKEND_DIR}/bootstrap/cache"

# ---------------------------------------------------------------------------
log "7/9  Nginx vhost: SPA + Laravel API"
# ---------------------------------------------------------------------------
VHOST="/etc/nginx/sites-available/primepos.conf"
cat > "$VHOST" <<NGINX
# ---------- SPA (React build served from ${FRONTEND_DIR}) ----------
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${FRONTEND_DIR};
    index index.html;

    client_max_body_size 50M;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Long cache for hashed assets
    location ~* \\.(?:js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico)\$ {
        expires 30d;
        access_log off;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
}

# ---------- Laravel API (served from ${BACKEND_DIR}/public) ----------
server {
    listen 80;
    listen [::]:80;
    server_name ${API_DOMAIN};

    root ${BACKEND_DIR}/public;
    index index.php;

    client_max_body_size 50M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \\.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php${PHP_VERSION}-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        fastcgi_read_timeout 120;
    }

    location ~ /\\.(?!well-known) {
        deny all;
    }
}
NGINX

if [[ -n "${WS_DOMAIN}" ]]; then
  cat >> "$VHOST" <<NGINX

# ---------- Reverb websocket proxy (wss://${WS_DOMAIN} → 127.0.0.1:8080) ----
server {
    listen 80;
    listen [::]:80;
    server_name ${WS_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 7d;
        proxy_send_timeout 7d;
    }
}
NGINX
fi

ln -sf "$VHOST" /etc/nginx/sites-enabled/primepos.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------------------------------------------------------------------------
log "8/10 Firewall (UFW)"
# ---------------------------------------------------------------------------
ufw allow OpenSSH        >/dev/null || true
ufw allow 'Nginx Full'   >/dev/null || true
ufw allow 8080/tcp       >/dev/null || true   # Laravel Reverb (websocket)
yes | ufw enable         >/dev/null || true

# ---------------------------------------------------------------------------
log "9/10 Laravel scheduler cron (runs as ${DEPLOY_USER})"
# ---------------------------------------------------------------------------
CRON_LINE="* * * * * cd ${BACKEND_DIR} && php artisan schedule:run >> /dev/null 2>&1"
( crontab -u "${DEPLOY_USER}" -l 2>/dev/null | grep -vF "artisan schedule:run" ; echo "${CRON_LINE}" ) \
  | crontab -u "${DEPLOY_USER}" -

# ---------------------------------------------------------------------------
log "10/10 Reverb websocket supervisor"
# ---------------------------------------------------------------------------
REVERB_CONF="/etc/supervisor/conf.d/primepos-reverb.conf"
cat > "$REVERB_CONF" <<SUPERVISOR
[program:primepos-reverb]
process_name=%(program_name)s
command=php ${BACKEND_DIR}/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=${DEPLOY_USER}
redirect_stderr=true
stdout_logfile=${BACKEND_DIR}/storage/logs/reverb.log
stopwaitsecs=10
SUPERVISOR

supervisorctl reread >/dev/null || true
supervisorctl update >/dev/null || true
supervisorctl restart primepos-reverb >/dev/null 2>&1 || true

# Grant the deploy user passwordless reload for the reverb supervisor entry
# so the post-deploy SSH step can bounce it after a release.
SUDO_REVERB="/etc/sudoers.d/${DEPLOY_USER}-reverb"
cat > "${SUDO_REVERB}" <<SUDOERS
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/bin/supervisorctl restart primepos-reverb
SUDOERS
chmod 0440 "${SUDO_REVERB}"

cat <<DONE

============================================================
 VPS bootstrap complete.

 Next steps:
   1. Add these GitHub Actions secrets:
        SSH_HOST          = <this server's IP or hostname>
        SSH_PORT          = 22
        SSH_USERNAME      = ${DEPLOY_USER}
        SSH_PRIVATE_KEY   = <private key matching the public key above>
        SSH_TARGET_DIR    = ${FRONTEND_DIR}/
        SSH_BACKEND_DIR   = ${BACKEND_DIR}

   2. Create ${BACKEND_DIR}/.env (copy from backend/.env.example and fill in DB creds).
      The deploy workflow excludes .env from rsync, so it persists across deploys.

   3. Push to main — GitHub Actions will build the SPA, install vendor,
      rsync both halves, run migrations, and reload php${PHP_VERSION}-fpm + nginx.

   4. Realtime (Reverb): set REVERB_* env vars in ${BACKEND_DIR}/.env, then
      front the websocket with nginx on a public hostname (e.g. ws.example.com)
      pointing to http://127.0.0.1:8080 with the Upgrade/Connection headers
      set. Set VITE_REVERB_HOST in your build env to that hostname.
      Supervisor is already running 'php artisan reverb:start' as
      'primepos-reverb' on port 8080.
============================================================
DONE