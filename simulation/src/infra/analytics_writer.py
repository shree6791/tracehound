"""
Write span to Analytics Engine.

Blob order is fixed here (AE write binding). Must stay aligned with
shared/config.json analyticsColumns for the fields the agent queries:
  blob1=trace_id  blob2=span_id  blob3=parent_span_id  blob4=service
  blob5=operation blob6=status   blob7=error_message
  double1=duration_ms  index1=service

Note: generated ANALYTICS_COLUMNS is for the *read* path (agent SQL).
This writer uses positional blobs — changing the JSON map alone does not
change write layout; edit this array and the JSON together.
"""

from typing import Any

from js import Object
from pyodide.ffi import to_js as _pyodide_to_js

from models import Span


def _dict_to_js(python_dict: Any) -> Any:
    return _pyodide_to_js(python_dict, dict_converter=Object.fromEntries)


async def write_span(env: Any, span: Span) -> None:
    # writeDataPoint is sync — do not await.
    env.ANALYTICS.writeDataPoint(_dict_to_js({
        "blobs": [
            span.trace_id, span.span_id, span.parent_span_id,
            span.service, span.operation, span.status,
            span.error_message or "",
        ],
        "doubles": [span.duration_ms],
        "indexes": [span.service],
    }))
