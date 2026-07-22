/** JSON response helper for HTTP routes. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', { status: 405 });
}
