#!/bin/sh
set -e

echo "⏳ Running database schema push..."

# Use --url to bypass prisma.config.ts (which requires TypeScript runtime)
# DATABASE_URL is injected by docker-compose into this container
until node_modules/.bin/prisma db push \
  --schema=./prisma/schema.prisma \
  --url="$DATABASE_URL" \
  --skip-generate \
  --accept-data-loss; do
  echo "⏳ Database not ready, retrying in 3s..."
  sleep 3
done

echo "✅ Database schema synced"
echo "🚀 Starting Next.js server..."
exec node server.js
