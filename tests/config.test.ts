import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('shared/config.json', () => {
  const cfg = JSON.parse(readFileSync(join(root, 'shared/config.json'), 'utf8'));

  it('has four ordered services', () => {
    assert.deepEqual(cfg.serviceNames, [
      'api-gateway',
      'order-service',
      'payment-service',
      'inventory-service',
    ]);
  });

  it('analytics columns map blob/double slots', () => {
    assert.equal(cfg.analyticsColumns.service, 'blob4');
    assert.equal(cfg.analyticsColumns.status, 'blob6');
    assert.equal(cfg.analyticsColumns.errorMessage, 'blob7');
    assert.equal(cfg.analyticsColumns.durationMs, 'double1');
  });

  it('has latency for every service', () => {
    for (const name of cfg.serviceNames) {
      assert.ok(cfg.serviceLatency[name], `missing latency for ${name}`);
      assert.ok(cfg.serviceLatency[name].max >= cfg.serviceLatency[name].min);
    }
  });

  it('has failure modes used by the simulation', () => {
    for (const mode of ['latency_spike', 'error_burst', 'cascading_timeout']) {
      assert.ok(cfg.failureParams[mode], `missing ${mode}`);
    }
  });

  it('keeps agent loop inside free-tier budget', () => {
    assert.ok(cfg.agent.maxIterations <= 6);
    assert.ok(cfg.agent.investigateDeadlineMs <= 25000);
    assert.ok(cfg.agent.investigateDeadlineMs >= 10000);
  });
});
