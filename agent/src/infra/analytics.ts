import { AgentEnv } from '../models/env';

/** Analytics Engine SQL HTTP API — read path (writes happen in simulation/). */
export async function queryAnalytics(env: AgentEnv, sql: string): Promise<unknown> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: sql,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Analytics Engine SQL error ${res.status}: ${text}`);
  }

  return res.json();
}
