#!/bin/sh
set -e
cd /var/www/html

if [ -z "$APP_KEY" ]; then
  php artisan key:generate --force || true
fi

php artisan storage:link || true
php artisan migrate --force || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache  || true

# Ensure nginx (www-data) can read the SPA build copied in by Docker
if [ -d /var/www/html/public/app ]; then
  chown -R www-data:www-data /var/www/html/public/app || true
  find /var/www/html/public/app -type d -exec chmod 755 {} + || true
  find /var/www/html/public/app -type f -exec chmod 644 {} + || true
fi

exec "$@"