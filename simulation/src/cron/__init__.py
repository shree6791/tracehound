import asyncio
import random
from typing import Any

from config import SYNTHETIC_CHECKOUT_MIN, SYNTHETIC_CHECKOUT_MAX
from services.incidents import tick_incident_schedule
from services.checkout import run_checkout


async def run_cron(env: Any) -> None:
    count = random.randint(SYNTHETIC_CHECKOUT_MIN, SYNTHETIC_CHECKOUT_MAX)
    await asyncio.gather(
        tick_incident_schedule(env),
        *[run_checkout(env) for _ in range(count)],
    )
