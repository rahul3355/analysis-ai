#!/usr/bin/env bash
set -e

echo "==========================================="
echo "  Render Build — Analysis AI"
echo "==========================================="

CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/next"
mkdir -p "$CACHE_DIR"

# Restore cached .next build cache for faster builds
if [[ -d "$CACHE_DIR" ]] && [[ -n "$(ls -A "$CACHE_DIR" 2>/dev/null)" ]]; then
  echo "Restoring .next/cache from $CACHE_DIR"
  mkdir -p apps/web/.next
  rsync -a "$CACHE_DIR/" apps/web/.next/cache
else
  echo "No cached .next/cache found (cold build)"
fi

echo "Building web app..."
npm run build -w apps/web

echo "Saving .next/cache to $CACHE_DIR"
mkdir -p "$CACHE_DIR"
rsync -a apps/web/.next/cache/ "$CACHE_DIR" 2>/dev/null || true

echo "Build complete"
