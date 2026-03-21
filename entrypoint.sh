#!/bin/sh
set -e

echo "⏳ Regenerating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "⏳ Ensuring default tenant exists..."
node scripts/init-db.js

echo "✅ Database initialized"
echo "🚀 Starting application..."
exec "$@"
