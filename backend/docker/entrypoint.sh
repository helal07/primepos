#!/bin/sh
set -e
cd /var/www/html

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force || true
fi

php artisan storage:link || true
php artisan migrate --force || true
php artisan db:seed --class=Database\\Seeders\\SuperadminSeeder --force || true
php artisan app:ensure-superadmin || true

php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache  || true

exec "$@"