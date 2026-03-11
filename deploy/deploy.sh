#!/bin/bash
set -e

APP_DIR="/opt/doodledraw"
cd "$APP_DIR"

echo "=== Deploying DoodleDraw ==="

# Install dependencies
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# Build all packages (shared → web → server)
echo "Building..."
pnpm build

# Seed database (safe to re-run)
echo "Seeding database..."
pnpm db:seed || echo "Seed skipped or already done"

# Restart with PM2
echo "Restarting PM2..."
if pm2 describe doodledraw > /dev/null 2>&1; then
  pm2 restart doodledraw
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo ""
echo "=== Deploy Complete ==="
echo "App running at http://localhost:3001"
pm2 status
