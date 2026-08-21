##
ARG NODE_VERSION=24-alpine

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
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate

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

ENV NODE_ENV=dev

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=app:app /app/src/generated/prisma ./src/generated/prisma

#  Install Prisma CLI globally so it's available after prune
RUN npm install -g prisma

# NEW: Regenerate Prisma client in the runtime image
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" prisma generate

#  Copy entrypoint
COPY --chown=app:app docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||3000,path:'/health/live',timeout:3000},r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]