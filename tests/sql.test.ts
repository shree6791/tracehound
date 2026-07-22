import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildFetchErrorsSql,
  buildFetchLatencySql,
  buildServiceSignalsSql,
  serviceFilterClause,
} from '../agent/src/services/sql.ts';
import { ANALYTICS_DATASET, ANALYTICS_COLUMNS } from '../agent/src/config/index.ts';

describe('agent Analytics Engine SQL', () => {
  it('fetch_errors filters by status and optional service', () => {
    const sql = buildFetchErrorsSql(15, serviceFilterClause('payment-service'));
    assert.match(sql, new RegExp(`FROM ${ANALYTICS_DATASET}`));
    assert.match(sql, new RegExp(`${ANALYTICS_COLUMNS.status} = 'error'`));
    assert.match(sql, /payment-service/);
    assert.match(sql, /INTERVAL '15' MINUTE/);
    assert.doesNotMatch(sql, /;/); // AE SQL API: single statement, no trailing junk
  });

  it('fetch_errors omits service clause when unset', () => {
    const sql = buildFetchErrorsSql(10, serviceFilterClause(undefined));
    assert.doesNotMatch(sql, /AND blob4 =/);
  });

  it('fetch_latency aggregates avg/max/count', () => {
    const sql = buildFetchLatencySql(30);
    assert.match(sql, /avg\(/);
    assert.match(sql, /max\(/);
    assert.match(sql, /count\(\)/);
    assert.match(sql, /GROUP BY/);
  });

  it('fetch_errors includes first_seen and last_seen', () => {
    const sql = buildFetchErrorsSql(15, serviceFilterClause('payment-service'));
    assert.match(sql, /min\(timestamp\) AS first_seen/);
    assert.match(sql, /max\(timestamp\) AS last_seen/);
  });

  it('service_signals includes first_seen and last_seen', () => {
    const sql = buildServiceSignalsSql('order-service', 15);
    assert.match(sql, /min\(timestamp\) AS first_seen/);
    assert.match(sql, /max\(timestamp\) AS last_seen/);
  });
});
