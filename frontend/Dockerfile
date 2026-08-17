
ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# 1) build: install deps and produce the static production bundle.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# VITE_API_URL is left unset here on purpose -> falls back to "/api" in
# src/lib/api.ts. nginx below proxies /api/ to the backend, so this same
# built bundle works in compose, k8s, or on the Azure VM without a rebuild.
RUN npm run build

# ---------------------------------------------------------------------------
# 2) runtime: nginx serving the static files + reverse-proxying /api/.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Where the backend lives — resolved at container *start* via envsubst on
# the template below (nginx's own entrypoint does this automatically for
# files under /etc/nginx/templates/). Override per environment, no rebuild.
ENV BACKEND_HOST=backend
ENV BACKEND_PORT=3000

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

# Base image entrypoint handles envsubst + `nginx -g daemon off;` — no
# custom CMD/ENTRYPOINT needed.