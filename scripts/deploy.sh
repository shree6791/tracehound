#!/usr/bin/env bash
# Deploy Tracehound to Cloudflare: sync config → simulation → app (+ UI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Sync shared config"
node scripts/sync-config.mjs

echo "==> Deploy simulation (Python Worker)"
cd "$ROOT/simulation"
uv sync --all-groups
uv run pywrangler deploy

echo "==> Deploy app (TypeScript Worker + UI)"
cd "$ROOT/app"
npm ci
npm run deploy

echo "==> Done"
echo "    https://tracehound.shree6791.workers.dev"
