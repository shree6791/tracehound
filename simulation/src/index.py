"""
Python simulation Worker — checkout chain, incident KV, Analytics Engine writes, cron.

Checkout traffic is produced by the minute cron (or optional POST /checkout for curl/debug).
"""

from urllib.parse import urlparse

from workers import WorkerEntrypoint, Response

from routes import health, checkout
from cron import run_cron


class Default(WorkerEntrypoint):
    async def fetch(self, request: object) -> Response:
        path = urlparse(str(request.url)).path  # type: ignore[attr-defined]
        method = str(request.method)  # type: ignore[attr-defined]

        if path == "/health":
            return await health()

        if path == "/checkout":
            if method != "POST":
                return Response("Method Not Allowed", status=405)
            return await checkout(self.env)

        return Response("Not Found", status=404)

    async def scheduled(self, controller, env, ctx) -> None:  # type: ignore[override]
        await run_cron(self.env)
