# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# 1) deps: install ALL deps (incl. dev, needed to compile TS) — cached layer.
#    This layer only invalidates when package.json/package-lock.json change,
#    so day-to-day code changes rebuild fast in CI.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# 2) build: generate the Prisma client, compile TS, then prune dev deps.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerate the Prisma client from prisma/schema.prisma so it always matches
# the current schema, even though the generated output is checked into git.
RUN npx prisma generate

RUN npm run build

# Drop devDependencies now that dist/ exists — smaller node_modules to copy
# into the final image, without needing a second `npm ci`.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# 3) runtime: minimal final image, non-root user, only what's needed to run.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

RUN apk add --no-cache openssl ca-certificates \
    && addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json

USER app

EXPOSE 3000

# Uses the app's own /health/live endpoint — same one you'll eventually point
# k8s liveness/readiness probes at.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/health/live',timeout:3000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# NOTE: entry point is dist/src/main.js, not dist/main.js — see chat notes.
CMD ["node", "dist/src/main.js"]