#!/bin/sh
set -e

echo "⏳ Running Prisma migrations..."
npx prisma migrate deploy

echo "🌱 Seeding database..."
node prisma/seed.js

echo "🚀 Starting application..."
exec node dist/src/main.js