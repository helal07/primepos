# syntax=docker/dockerfile:1.6
# ---------------------------------------------------------------------------
# Stage 1 — Vite build (React frontend lives at repo root /src)
# ---------------------------------------------------------------------------
FROM oven/bun:1.1 AS frontend
WORKDIR /app
COPY package.json bun.lockb* bun.lock* package-lock.json* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
# Stage 2 — Runtime: static Nginx site
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY backend/docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]