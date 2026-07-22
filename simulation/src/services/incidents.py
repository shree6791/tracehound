import json
import random
import time
from typing import Any

from config import (
    SERVICE_NAMES,
    FAILURE_MODES,
    INCIDENT_KV_KEY,
    INCIDENT_DURATION_MS,
    INCIDENT_SPAWN_PROBABILITY,
)


def _pick(items: tuple) -> Any:
    return items[int(random.random() * len(items))]


async def tick_incident_schedule(env: Any) -> None:
    raw = await env.INCIDENTS_KV.get(INCIDENT_KV_KEY)
    if raw:
        incident = json.loads(str(raw))
        if int(time.time() * 1000) < incident["endsAtMs"]:
            return
        await env.INCIDENTS_KV.delete(INCIDENT_KV_KEY)

    if random.random() > INCIDENT_SPAWN_PROBABILITY:
        return

    now = int(time.time() * 1000)
    incident = {
        "service": _pick(SERVICE_NAMES),
        "mode": _pick(FAILURE_MODES),
        "startedAtMs": now,
        "endsAtMs": now + INCIDENT_DURATION_MS,
    }
    await env.INCIDENTS_KV.put(INCIDENT_KV_KEY, json.dumps(incident))
    print(f"[incidents] started: {incident['mode']} on {incident['service']}")


async def get_active_incident(env: Any, service_name: str) -> dict | None:
    raw = await env.INCIDENTS_KV.get(INCIDENT_KV_KEY)
    if not raw:
        return None
    incident = json.loads(str(raw))
    if incident["service"] != service_name:
        return None
    if int(time.time() * 1000) > incident["endsAtMs"]:
        return None
    return incident
