#!/usr/bin/env bash
# Analysis AI — Verification Script
# Runs lint, type check, unit tests, and build. Exits non-zero if anything fails.
#
# On Windows (Git Bash / WSL), this delegates to verify.ps1.
# On Linux/macOS, runs natively.

set -euo pipefail

# Detect Windows and delegate to PowerShell if available
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  if command -v powershell.exe &> /dev/null; then
    powershell.exe -ExecutionPolicy Bypass -File "$SCRIPT_DIR/verify.ps1"
    exit $?
  fi
fi

echo ""
echo "==========================================="
echo "  Analysis AI - Verification Pipeline"
echo "==========================================="
echo ""

# Navigate to apps/web workspace
cd "$(dirname "$0")/../apps/web" || { echo "apps/web not found"; exit 1; }

# Track overall status
FAILED=0

# Step 1: ESLint
echo ">> Step 1/4: ESLint..."
if npm run lint; then
  echo "  OK ESLint passed"
else
  echo "  !! ESLint failed"
  FAILED=1
fi
echo ""

# Step 2: TypeScript type check
echo ">> Step 2/4: TypeScript type check..."
if npx tsc --noEmit; then
  echo "  OK Type check passed"
else
  echo "  !! Type check failed"
  FAILED=1
fi
echo ""

# Step 3: Unit tests
echo ">> Step 3/4: Unit tests..."
if npm run test; then
  echo "  OK Unit tests passed"
else
  echo "  !! Unit tests failed"
  FAILED=1
fi
echo ""

# Step 4: Production build
echo ">> Step 4/4: Production build..."
if npm run build; then
  echo "  OK Build passed"
else
  echo "  !! Build failed"
  FAILED=1
fi
echo ""

# Summary
echo "==========================================="
if [ $FAILED -eq 0 ]; then
  echo "  ALL CHECKS PASSED"
else
  echo "  SOME CHECKS FAILED"
fi
echo "==========================================="

exit $FAILED
