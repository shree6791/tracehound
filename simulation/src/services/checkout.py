import random
import time
import uuid
from typing import Any

from config import SERVICE_NAMES, SERVICE_LATENCY, FAILURE_PARAMS
from models import Span
from services.incidents import get_active_incident
from infra.analytics_writer import write_span
from infra.sentry import report_sentry_error


def _rand_between(min_val: float, max_val: float) -> float:
    return min_val + random.random() * (max_val - min_val)


async def _simulate_service(
    env: Any, service_name: str, trace_id: str, parent_span_id: str
) -> dict:
    span_id = str(uuid.uuid4())
    timestamp_ms = int(time.time() * 1000)

    status = "ok"
    error_message: str | None = None
    extra_latency_ms = 0.0

    incident = await get_active_incident(env, service_name)
    if incident:
        failure_params = FAILURE_PARAMS[incident["mode"]]
        mode = incident["mode"]

        if mode == "latency_spike":
            extra_latency_ms = _rand_between(
                failure_params["extra_latency_min"], failure_params["extra_latency_max"]
            )
        elif mode == "error_burst":
            if random.random() < failure_params["error_rate"]:
                status = "error"
                error_message = (
                    f"{service_name}: error_burst — upstream dependency intermittently refusing connections"
                )
        elif mode == "cascading_timeout":
            extra_latency_ms = _rand_between(
                failure_params["extra_latency_min"], failure_params["extra_latency_max"]
            )
            if random.random() < failure_params["error_rate"]:
                status = "error"
                error_message = (
                    f"{service_name}: cascading_timeout — connection pool exhausted, request timed out"
                )

    latency = SERVICE_LATENCY[service_name]
    duration_ms = round(
        _rand_between(latency["min"], latency["max"]) + extra_latency_ms
    )

    await write_span(env, Span(
        trace_id=trace_id,
        span_id=span_id,
        parent_span_id=parent_span_id,
        service=service_name,
        operation="request",
        duration_ms=float(duration_ms),
        status=status,
        error_message=error_message,
        timestamp_ms=timestamp_ms,
    ))

    if status == "error":
        await report_sentry_error(env, service_name, error_message or f"{service_name} error", trace_id)

    return {"span_id": span_id, "status": status}


async def run_checkout(env: Any) -> dict:
    trace_id = str(uuid.uuid4())
    prev_span_id = str(uuid.uuid4())

    for service_name in SERVICE_NAMES:
        result = await _simulate_service(env, service_name, trace_id, prev_span_id)
        prev_span_id = result["span_id"]
        if result["status"] == "error":
            return {"trace_id": trace_id, "status": "error"}

    return {"trace_id": trace_id, "status": "ok"}
