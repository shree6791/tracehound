from dataclasses import dataclass


@dataclass
class Span:
    trace_id: str
    span_id: str
    parent_span_id: str
    service: str
    operation: str
    duration_ms: float
    status: str
    error_message: str | None
    timestamp_ms: int
