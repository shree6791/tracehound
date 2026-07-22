import { handleInvestigate } from '../services/investigateHandler';
import { Env } from '../models';
import { json, methodNotAllowed } from '../infra/http';

export function health(): Response {
  return json({ ok: true, ts: Date.now(), role: 'app' });
}

export async function investigateRoute(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return methodNotAllowed();
  return handleInvestigate(request, env);
}

export function notFound(): Response {
  return new Response('Not Found', { status: 404 });
}
