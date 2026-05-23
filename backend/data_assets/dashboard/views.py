"""Internal data-platform monitoring endpoints.

Mounted under /api/data/... — not user-facing.
Phase 4 will expand this into a richer HTML dashboard.
"""
import logging
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.db import get_db
from data_assets.repositories.asset_repo import list_active_assets
from data_assets.repositories.price_repo import get_latest_price
from data_assets.repositories.job_run_repo import recent_job_runs
from data_assets.jobs.scheduler import get_status as scheduler_status
from data_assets.utils.format import age_minutes
from data_assets.admin_auth import require_admin_secret

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/data/status", dependencies=[Depends(require_admin_secret)])
async def platform_status(db: AsyncSession = Depends(get_db)):
    """Returns per-asset-type price freshness stats and scheduler health."""
    assets = await list_active_assets(db)
    type_stats: dict[str, dict] = {}

    for asset in assets:
        t = asset.asset_type
        if t not in type_stats:
            type_stats[t] = {"count": 0, "with_price": 0, "oldest_minutes": None, "newest_minutes": None}
        type_stats[t]["count"] += 1

        price = await get_latest_price(db, asset.id)
        if price:
            type_stats[t]["with_price"] += 1
            age = age_minutes(price.timestamp)
            if type_stats[t]["oldest_minutes"] is None or age > type_stats[t]["oldest_minutes"]:
                type_stats[t]["oldest_minutes"] = age
            if type_stats[t]["newest_minutes"] is None or age < type_stats[t]["newest_minutes"]:
                type_stats[t]["newest_minutes"] = age

    jobs = await recent_job_runs(db, limit=10)

    return {
        "type_stats":      type_stats,
        "scheduler":       scheduler_status(),
        "recent_job_runs": [
            {
                "id": run.id,
                "job_name": run.job_name,
                "status": run.status,
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "completed_at": run.completed_at.isoformat() if run.completed_at else None,
                "asset_count": run.asset_count,
                "success_count": run.success_count,
                "failure_count": run.failure_count,
                "error_message": run.error_message,
            }
            for run in jobs
        ],
        "checked_at":      datetime.utcnow().isoformat(),
    }
