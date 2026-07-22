"""Sentry envelope POST — no-ops if SENTRY_DSN unset."""

import json
import time
import uuid
from typing import Any
from urllib.parse import urlparse

import httpx


async def report_sentry_error(
    env: Any, service: str, message: str, trace_id: str
) -> None:
    dsn = getattr(env, "SENTRY_DSN", None)
    if not dsn:
        print(f"[sentry] DSN not set — dropping error: [{service}] {message}")
        return

    try:
        dsn_str = str(dsn)
        parsed = urlparse(dsn_str)
        project_id = parsed.path.lstrip("/")
        sentry_key = parsed.username
        event_id = uuid.uuid4().hex

        envelope = "\n".join([
            json.dumps({"sent_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "dsn": dsn_str}),
            json.dumps({"type": "event"}),
            json.dumps({
                "event_id": event_id, "timestamp": time.time(),
                "platform": "python", "level": "error", "message": message,
                "tags": {"service": service, "trace_id": trace_id},
            }),
        ])

        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"https://{parsed.hostname}/api/{project_id}/envelope/",
                headers={
                    "X-Sentry-Auth": f"Sentry sentry_version=7, sentry_key={sentry_key}, sentry_client=tracehound-simulation/0.1",
                    "Content-Type": "application/x-sentry-envelope",
                },
                content=envelope,
            )
    except Exception as e:
        print(f"[sentry] failed to send error event: {e}")
