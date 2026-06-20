#!/usr/bin/env bash
set -e

echo "==========================================="
echo "  Render Build — Analysis AI"
echo "==========================================="

# Restore cached .next build cache for faster builds
if [[ -d "$XDG_CACHE_HOME/next" ]]; then
  echo "Restoring .next/cache from XDG cache"
  mkdir -p apps/web/.next
  rsync -a "$XDG_CACHE_HOME/next/" apps/web/.next/cache
else
  echo "No cached .next/cache found (cold build)"
fi

echo "Building web app..."
npm run build -w apps/web

echo "Saving .next/cache to XDG cache"
rsync -a apps/web/.next/cache/ "$XDG_CACHE_HOME/next"

echo "Build complete"
