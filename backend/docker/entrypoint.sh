#!/bin/sh
set -e
cd /var/www/html

# nginx spools large request bodies (file uploads) to disk; ensure the temp
# dirs exist and are writable by the worker user on every boot.
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/scgi /tmp/nginx/uwsgi
chown -R www-data:www-data /tmp/nginx
chmod -R 775 /tmp/nginx


if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force || true
fi

php artisan storage:link || true
php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\SuperadminSeeder --force
php artisan app:ensure-superadmin --reset-password

php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache  || true

exec "$@"