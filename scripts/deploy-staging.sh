#!/usr/bin/env bash
# Deploy Tracehound staging Workers (no simulation cron — avoids double incidents).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Sync shared config"
node scripts/sync-config.mjs

echo "==> Deploy simulation staging"
cd "$ROOT/simulation"
uv sync --all-groups
uv run pywrangler deploy --env staging

echo "==> Deploy app staging"
cd "$ROOT/app"
npm ci
npm run build:ui
npx wrangler deploy --env staging

echo "==> Done (staging)"
