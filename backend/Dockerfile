# syntax=docker/dockerfile:1.6
# ---------------------------------------------------------------------------
# Stage 1 — Vite build (React frontend at repo root /src)
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS frontend
WORKDIR /app
COPY package.json bun.lockb* bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2 — Composer install (Laravel vendor)
# ---------------------------------------------------------------------------
FROM composer:2.7 AS vendor
WORKDIR /app
COPY backend/composer.json ./composer.json
COPY backend/composer.lock* ./
RUN composer install \
      --no-dev --no-interaction --prefer-dist \
      --no-scripts --no-autoloader --no-progress

# ---------------------------------------------------------------------------
# Stage 3 — Runtime: PHP-FPM 8.4 + Nginx + Supervisor
# ---------------------------------------------------------------------------
FROM php:8.4-fpm-alpine AS runtime

# System deps + PHP extensions
RUN apk add --no-cache \
      nginx supervisor bash curl git unzip tzdata \
      mysql-client icu-dev libzip-dev oniguruma-dev libpng-dev libxml2-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
         pdo pdo_mysql bcmath intl zip mbstring opcache pcntl exif gd \
    && cp /usr/share/zoneinfo/Asia/Dhaka /etc/localtime \
    && echo "Asia/Dhaka" > /etc/timezone

# Composer binary
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Laravel source
COPY backend/ /var/www/html/

# Vendor from composer stage
COPY --from=vendor /app/vendor /var/www/html/vendor

# Frontend build → merged into Laravel's public/ root so the SPA is served
# at the domain root (e.g. /login). Laravel's index.php / .htaccess remain
# intact; SpaController falls back to public/index.html for non-API routes.
COPY --from=frontend /app/dist/ /var/www/html/public/

# Re-run autoload + Laravel package discovery now that artisan exists
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev \
    && php artisan package:discover --ansi || true \
    && mkdir -p storage/framework/{cache/data,sessions,views,testing} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Nginx + supervisord + entrypoint
COPY backend/docker/nginx.conf       /etc/nginx/nginx.conf
COPY backend/docker/supervisord.conf /etc/supervisord.conf
COPY backend/docker/entrypoint.sh    /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /run/nginx /var/log/nginx

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]