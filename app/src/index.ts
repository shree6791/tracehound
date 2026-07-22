/**
 * App Worker entry — HTTP routing only.
 */

import { Env } from './models';
import { health, investigateRoute, notFound } from './routes';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);

    switch (pathname) {
      case '/health':
        return health();
      case '/investigate':
        return investigateRoute(request, env);
      default:
        return notFound();
    }
  },
};
