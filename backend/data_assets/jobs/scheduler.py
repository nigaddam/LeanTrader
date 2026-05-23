"""APScheduler lifecycle management for the data-assets platform."""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def create_scheduler() -> AsyncIOScheduler:
    """Build and return a configured scheduler (not yet started)."""
    global _scheduler
    from data_assets.jobs.tasks import (
        job_refresh_crypto_prices,
        job_refresh_stock_prices,
        job_refresh_daily_candles,
        job_refresh_asset_universe,
    )

    if _scheduler and _scheduler.running:
        logger.info("Asset refresh scheduler already running; reusing existing scheduler.")
        return _scheduler
    if _scheduler and _scheduler.get_jobs():
        logger.info("Asset refresh scheduler already configured; reusing existing scheduler.")
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")

    _scheduler.add_job(
        job_refresh_crypto_prices,
        IntervalTrigger(hours=1),
        id="crypto_prices",
        replace_existing=True,
    )
    _scheduler.add_job(
        job_refresh_stock_prices,
        IntervalTrigger(hours=1),
        id="stock_prices",
        replace_existing=True,
    )
    _scheduler.add_job(
        job_refresh_daily_candles,
        CronTrigger(hour=1, minute=0),
        id="daily_candles",
        replace_existing=True,
    )
    _scheduler.add_job(
        job_refresh_asset_universe,
        CronTrigger(hour=2, minute=0),
        id="asset_universe",
        replace_existing=True,
    )

    return _scheduler


def get_scheduler() -> AsyncIOScheduler | None:
    return _scheduler


def get_status() -> dict:
    if not _scheduler:
        return {"running": False, "jobs": []}
    return {
        "running": _scheduler.running,
        "jobs": [
            {
                "id":       j.id,
                "next_run": j.next_run_time.isoformat() if j.next_run_time else None,
            }
            for j in _scheduler.get_jobs()
        ],
    }
