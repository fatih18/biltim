#!/bin/bash

echo "⚠️  This script will use sudo to aggressively clean all dependencies."
echo "Please close your IDE before continuing!"
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "🧹 Aggressively cleaning all node_modules with sudo..."
sudo rm -rf node_modules
sudo rm -rf apps/*/node_modules
sudo rm -rf packages/*/node_modules
sudo rm -rf utilities/*/node_modules
sudo rm -rf managers/*/node_modules
sudo rm -rf hooks/*/node_modules
sudo rm -rf configs/node_modules

echo "🗑️  Cleaning Bun global cache..."
sudo rm -rf ~/.bun/install/cache

echo "🔄 Clearing Bun package manager cache..."
bun pm cache rm

echo "🔒 Removing lockfile..."
rm -f bun.lockb

echo "🔨 Removing all .bun directories..."
find . -name ".bun" -type d -exec sudo rm -rf {} + 2>/dev/null || true

echo "🧼 Removing TypeScript build caches..."
find . -name "*.tsbuildinfo" -type f -delete 2>/dev/null || true
find . -name ".turbo" -type d -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "📦 Installing fresh packages from root..."
bun install --force

echo ""
echo "✅ Done! Package conflicts should be resolved."
echo "⚡ You can now open your IDE and restart TypeScript server."
echo "   (Cmd+Shift+P > TypeScript: Restart TS Server)"
