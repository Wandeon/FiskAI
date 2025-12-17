#!/bin/sh
set -e

echo "🔄 Running Drizzle migrations..."

# Run Drizzle migrations (do not rely on node_modules/.bin being present in Next standalone output)
if ! node ./node_modules/drizzle-kit/bin.cjs migrate --config=drizzle.config.ts; then
  echo "❌ Drizzle migrations failed"
  exit 1
fi

echo "✅ Drizzle migrations completed successfully"

# Start the application
echo "🚀 Starting application..."
exec node server.js
