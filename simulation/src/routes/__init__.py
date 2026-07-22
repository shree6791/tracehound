import json
import time
from typing import Any

from workers import Response
from services.checkout import run_checkout


def _json(data: dict, status: int = 200) -> Response:
    return Response.from_json(data, status=status)


async def health() -> Response:
    return _json({"ok": True, "ts": int(time.time() * 1000), "role": "simulation"})


async def checkout(env: Any) -> Response:
    return _json(await run_checkout(env))
