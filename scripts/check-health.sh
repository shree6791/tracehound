#!/usr/bin/env bash
# Hit public health endpoints. Usage: ./scripts/check-health.sh [base-url]
set -euo pipefail
BASE="${1:-https://tracehound.shree6791.workers.dev}"

echo "==> GET $BASE/health"
curl -fsS "$BASE/health"
echo

echo "==> GET $BASE/ (UI)"
code=$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/")
test "$code" = "200"
echo "UI $code"
echo "OK"
