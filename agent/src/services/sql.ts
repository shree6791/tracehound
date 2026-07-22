import {
  ANALYTICS_DATASET,
  ANALYTICS_COLUMNS,
} from '../config';

/** Build Analytics Engine SQL for agent tools — kept pure for unit tests. */

export function buildFetchErrorsSql(
  minutes: number,
  serviceFilter: string
): string {
  return `
          SELECT
            ${ANALYTICS_COLUMNS.service}       AS service,
            ${ANALYTICS_COLUMNS.errorMessage}  AS error_message,
            count() AS count,
            min(timestamp) AS first_seen,
            max(timestamp) AS last_seen
          FROM ${ANALYTICS_DATASET}
          WHERE ${ANALYTICS_COLUMNS.status} = 'error'
            ${serviceFilter}
            AND timestamp > NOW() - INTERVAL '${minutes}' MINUTE
          GROUP BY ${ANALYTICS_COLUMNS.service}, ${ANALYTICS_COLUMNS.errorMessage}
          ORDER BY count DESC
          LIMIT 50
        `.trim();
}

export function buildFetchLatencySql(minutes: number): string {
  return `
          SELECT
            ${ANALYTICS_COLUMNS.service}              AS service,
            avg(${ANALYTICS_COLUMNS.durationMs})       AS avg_ms,
            max(${ANALYTICS_COLUMNS.durationMs})       AS max_ms,
            count()                               AS call_count
          FROM ${ANALYTICS_DATASET}
          WHERE timestamp > NOW() - INTERVAL '${minutes}' MINUTE
          GROUP BY ${ANALYTICS_COLUMNS.service}
          ORDER BY avg_ms DESC
        `.trim();
}

/** Per-service error count + latency (tool: service_signals). */
export function buildServiceSignalsSql(service: string, minutes: number): string {
  return `
          SELECT
            count()                                       AS total_calls,
            countIf(${ANALYTICS_COLUMNS.status} = 'error')      AS error_count,
            avg(${ANALYTICS_COLUMNS.durationMs})                AS avg_ms,
            max(${ANALYTICS_COLUMNS.durationMs})                AS max_ms,
            min(timestamp) AS first_seen,
            max(timestamp) AS last_seen
          FROM ${ANALYTICS_DATASET}
          WHERE ${ANALYTICS_COLUMNS.service} = '${service}'
            AND timestamp > NOW() - INTERVAL '${minutes}' MINUTE
        `.trim();
}

export function serviceFilterClause(service: string | undefined): string {
  if (!service) return '';
  return `AND ${ANALYTICS_COLUMNS.service} = '${service}'`;
}
