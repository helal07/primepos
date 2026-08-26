#!/bin/sh
set -e
cd /var/www/html

# nginx spools large request bodies (file uploads) to disk; ensure the temp
# dirs exist and are writable by the worker user on every boot.
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/scgi /tmp/nginx/uwsgi
chown -R www-data:www-data /tmp/nginx
chmod -R 775 /tmp/nginx

# Uploads live on a persistent volume at storage/app/uploads. Create the roots,
# fix ownership and force-recreate the public/storage symlink on every boot so a
# freshly mounted volume is always reachable at /storage/<bucket>/<path>.
mkdir -p storage/app/uploads/public storage/app/uploads/private storage/app/public storage/app/private/uploads
chown -R www-data:www-data storage/app || true
chmod -R 775 storage/app || true

rm -rf public/storage || true
php artisan storage:link || true

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force || true
fi

php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\SuperadminSeeder --force
php artisan app:ensure-superadmin --reset-password

# One-time (idempotent) copy of pre-volume uploads into the volume-backed roots.
php artisan app:migrate-uploads || true
chown -R www-data:www-data storage/app/uploads || true

php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache  || true

exec "$@"
