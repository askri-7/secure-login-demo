#!/bin/sh
set -e


echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
npx prisma db seed            # ← fixed: reads seed command from prisma.config.ts

echo "🚀 Starting application..."
exec node dist/src/main.js