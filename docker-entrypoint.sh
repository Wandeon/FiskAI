#!/bin/sh
set -e

echo "🔄 Running Drizzle migrations..."

# Run Drizzle migrations
if ! npx drizzle-kit migrate --config=drizzle.config.ts; then
  echo "❌ Drizzle migrations failed"
  exit 1
fi

echo "✅ Drizzle migrations completed successfully"

# Start the application
echo "🚀 Starting application..."
exec node server.js
