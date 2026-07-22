import { AgentEnv } from '../models/env';
import { queryAnalytics } from '../infra/analytics';
import { SERVICE_NAMES, DEFAULT_QUERY_WINDOW_MINUTES } from '../config';
import {
  buildFetchErrorsSql,
  buildFetchLatencySql,
  buildServiceSignalsSql,
  serviceFilterClause,
} from './sql';

const VALID_SERVICES = new Set<string>(SERVICE_NAMES);
const SERVICE_LIST = SERVICE_NAMES.join(', ');

export const TOOL_DEFINITIONS = [
  {
    name: 'fetch_errors',
    description:
      'Fetch recent error spans grouped by service + error_message. Returns count, first_seen, last_seen. Use first_seen for incident start; last_seen to see if errors are still active.',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: `Service to filter by (optional). One of: ${SERVICE_LIST}.`,
        },
        minutes: {
          type: 'number',
          description: `Look-back window in minutes. Default: ${DEFAULT_QUERY_WINDOW_MINUTES}. This is NOT the incident duration.`,
        },
      },
    },
  },
  {
    name: 'fetch_latency',
    description:
      'Fetch avg/max latency (ms) and call_count per service. Compare against peers to spot latency_spike or cascading_timeout.',
    input_schema: {
      type: 'object',
      properties: {
        minutes: {
          type: 'number',
          description: `Look-back window in minutes. Default: ${DEFAULT_QUERY_WINDOW_MINUTES}.`,
        },
      },
    },
  },
  {
    name: 'service_signals',
    description:
      'For one service: total_calls, error_count, avg/max latency, first_seen, last_seen. Use to confirm whether errors and high latency co-occur (cascading_timeout vs error_burst vs latency_spike).',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: `Service to inspect. One of: ${SERVICE_LIST}.`,
        },
        minutes: {
          type: 'number',
          description: `Look-back window in minutes. Default: ${DEFAULT_QUERY_WINDOW_MINUTES}.`,
        },
      },
      required: ['service'],
    },
  },
] as const;

export async function runTool(
  env: AgentEnv,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  const minutes =
    typeof input.minutes === 'number' && input.minutes > 0
      ? input.minutes
      : DEFAULT_QUERY_WINDOW_MINUTES;

  try {
    switch (name) {
      case 'fetch_errors': {
        const rawService = input.service;
        const service =
          typeof rawService === 'string' && rawService && VALID_SERVICES.has(rawService)
            ? rawService
            : undefined;
        const sql = buildFetchErrorsSql(minutes, serviceFilterClause(service));
        return JSON.stringify(await queryAnalytics(env, sql));
      }

      case 'fetch_latency': {
        const sql = buildFetchLatencySql(minutes);
        return JSON.stringify(await queryAnalytics(env, sql));
      }

      case 'service_signals': {
        const service = input.service;
        if (typeof service !== 'string' || !VALID_SERVICES.has(service)) {
          return JSON.stringify({
            error: `Invalid or missing service. Must be one of: ${SERVICE_LIST}`,
          });
        }

        const sql = buildServiceSignalsSql(service, minutes);
        return JSON.stringify(await queryAnalytics(env, sql));
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}
