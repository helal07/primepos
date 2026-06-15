# syntax=docker/dockerfile:1.6
# ---------------------------------------------------------------------------
# Stage 1 — Vite build (React frontend lives at repo root /src)
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS frontend
WORKDIR /app
COPY package.json bun.lockb* package-lock.json* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
ENV VITE_BACKEND=laravel
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2 — Composer install
# ---------------------------------------------------------------------------
FROM composer:2.7 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock* ./
RUN composer install \
      --no-dev --no-scripts --no-autoloader \
      --prefer-dist --ignore-platform-reqs

# ---------------------------------------------------------------------------
# Stage 3 — Runtime: Nginx + PHP-FPM 8.3 + mysql-client (for mysqldump)
# ---------------------------------------------------------------------------
FROM php:8.3-fpm-alpine AS runtime

RUN apk add --no-cache \
      nginx supervisor bash curl tzdata \
      mysql-client mariadb-connector-c \
      icu-dev libzip-dev oniguruma-dev libpng-dev libwebp-dev libjpeg-turbo-dev freetype-dev \
      $PHPIZE_DEPS \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j$(nproc) pdo_mysql mysqli bcmath intl zip gd opcache pcntl \
 && apk del $PHPIZE_DEPS \
 && rm -rf /var/cache/apk/*

ENV TZ=Asia/Dhaka
RUN cp /usr/share/zoneinfo/Asia/Dhaka /etc/localtime && echo "Asia/Dhaka" > /etc/timezone

WORKDIR /var/www/html

# Laravel app
COPY backend/ /var/www/html/
COPY --from=vendor /app/vendor /var/www/html/vendor

# React build → served by Laravel at /app/*
COPY --from=frontend /app/dist /var/www/html/public/app

# Composer autoload + cache
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer
RUN composer dump-autoload --optimize --no-dev \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

# Nginx + Supervisor
COPY backend/docker/nginx.conf /etc/nginx/nginx.conf
COPY backend/docker/supervisord.conf /etc/supervisord.conf
COPY backend/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]