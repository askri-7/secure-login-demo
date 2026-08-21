#!/bin/sh
set -e

echo "⏳ Waiting for Postgres to be ready..."
# Simple retry loop — Prisma migrate will fail if DB isn't accepting connections yet
until npx prisma db execute --stdin </dev/null 2>/dev/null; do
  echo "  Postgres is unavailable — sleeping 1s"
  sleep 1
done

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed            # ← fixed: reads seed command from prisma.config.ts

echo "🚀 Starting application..."
exec node dist/src/main.js