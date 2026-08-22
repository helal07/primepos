#!/bin/sh
set -e
cd /var/www/html

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