"""Shared formatting helpers — no external deps."""
from datetime import datetime
from typing import Optional


def age_minutes(ts: Optional[datetime]) -> Optional[int]:
    if not ts:
        return None
    return int((datetime.utcnow() - ts).total_seconds() / 60)


def is_fresh(ts: Optional[datetime], threshold_minutes: int = 90) -> bool:
    a = age_minutes(ts)
    return a is not None and a < threshold_minutes


def fmt_compact(n) -> str:
    if n is None:
        return "—"
    v = float(n)
    if v >= 1e12:
        return f"${v / 1e12:.2f}T"
    if v >= 1e9:
        return f"${v / 1e9:.2f}B"
    if v >= 1e6:
        return f"${v / 1e6:.2f}M"
    return f"${v:,.2f}"
