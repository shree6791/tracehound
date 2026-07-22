import { investigate as runAgentLoop } from '../../../agent/src';
import { Env } from '../models';
import { json } from '../infra/http';

/** Parse body, run agent loop, return { answer } or { error }. */
export async function handleInvestigate(request: Request, env: Env): Promise<Response> {
  let body: { message?: unknown };
  try {
    body = (await request.json()) as { message?: unknown };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.message || typeof body.message !== 'string') {
    return json({ error: 'Missing or invalid "message" field' }, 400);
  }

  try {
    const answer = await runAgentLoop(env, body.message);
    return json({ answer });
  } catch (err) {
    console.error('[/investigate]', err);
    return json({ error: String(err) }, 502);
  }
}
