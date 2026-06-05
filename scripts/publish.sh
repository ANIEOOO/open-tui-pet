#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
TAG="latest"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)  DRY_RUN=true; shift ;;
    --tag)      TAG="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: bash scripts/publish.sh [--dry-run] [--tag <tag>]"
      echo ""
      echo "Options:"
      echo "  --dry-run   Preview what would be published without actually publishing"
      echo "  --tag       npm dist-tag (default: latest)"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "==> Typecheck..."
npm run typecheck

echo "==> Build..."
npm run build

echo "==> Verifying dist/..."
if [ ! -f "dist/index.js" ]; then
  echo "ERROR: dist/index.js not found after build"
  exit 1
fi
if [ ! -d "dist/pets" ]; then
  echo "WARNING: dist/pets/ not found — bundled pets will be missing"
fi

if [ "$DRY_RUN" = true ]; then
  echo "==> Dry run — showing what would be published:"
  npm pack --dry-run
  echo ""
  echo "Dry run complete. No package was published."
else
  echo "==> Publishing to npm (tag: $TAG)..."
  npm publish --access public --tag "$TAG"
  echo ""
  echo "Published successfully!"
fi
