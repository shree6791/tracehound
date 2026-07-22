#!/usr/bin/env node
/**
 * Smoke-test Analytics Engine SQL against live Cloudflare credentials.
 *
 * Usage (from repo root, with secrets in env or app/.dev.vars):
 *   CF_ACCOUNT_ID=... CF_ANALYTICS_TOKEN=... npm run smoke:ae
 *
 * Exits 0 on success, 1 on query failure. Skips (exit 0) if token missing
 * unless --require is passed.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const requireCreds = process.argv.includes('--require');

function loadDevVars() {
  const path = join(root, 'app/.dev.vars');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const cfg = JSON.parse(readFileSync(join(root, 'shared/config.json'), 'utf8'));
const fromFile = loadDevVars();
const accountId =
  process.env.CF_ACCOUNT_ID || fromFile.CF_ACCOUNT_ID || '559f54a62a7698817273ed53a2438672';
const token = process.env.CF_ANALYTICS_TOKEN || fromFile.CF_ANALYTICS_TOKEN;

if (!token) {
  const msg = 'CF_ANALYTICS_TOKEN not set — skip AE smoke (pass --require to fail)';
  if (requireCreds) {
    console.error(msg);
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}

const dataset = cfg.analyticsDataset;
const cols = cfg.analyticsColumns;
const sql = `
  SELECT
    ${cols.service} AS service,
    count() AS n
  FROM ${dataset}
  WHERE timestamp > NOW() - INTERVAL '60' MINUTE
  GROUP BY ${cols.service}
  LIMIT 10
`.trim();

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'text/plain',
  },
  body: sql,
});

const text = await res.text();
if (!res.ok) {
  console.error(`AE SQL failed ${res.status}:\n${text}\n\nQuery:\n${sql}`);
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(text);
} catch {
  console.error('AE SQL returned non-JSON:\n', text);
  process.exit(1);
}

console.log('AE SQL smoke OK');
console.log(JSON.stringify(parsed, null, 2).slice(0, 2000));
