"""Refresh coordinator — warm startup and manual triggers.

Phase 2: On startup, kick off immediate background refreshes so prices
are populated before the first user request arrives.  These run in the
background (asyncio.create_task) so they never block server startup.
"""
import asyncio
import logging
from data_assets.models.db import SessionLocal
from data_assets.services.price_service import refresh_crypto_prices, refresh_stock_prices
from data_assets.repositories.job_run_repo import start_job_run, complete_job_run

logger = logging.getLogger(__name__)


async def _run_crypto():
    async with SessionLocal() as db:
        run = await start_job_run(db, "manual_or_warm_crypto_prices")
        result = await refresh_crypto_prices(db)
        await complete_job_run(db, run, status="success", **result)
    logger.info("[warm_startup] crypto prices refreshed: %d", result["success_count"])


async def _run_stocks():
    async with SessionLocal() as db:
        run = await start_job_run(db, "manual_or_warm_stock_prices")
        result = await refresh_stock_prices(db)
        await complete_job_run(db, run, status="success", **result)
    logger.info("[warm_startup] stock/ETF prices refreshed: %d", result["success_count"])


def warm_startup_refresh() -> None:
    """Schedule immediate price refreshes as background tasks.

    Call this during FastAPI lifespan after the DB is ready.
    Does NOT block — each refresh runs in the background.
    """
    asyncio.create_task(_run_crypto())
    asyncio.create_task(_run_stocks())
    logger.info("[warm_startup] price refresh tasks queued")


async def manual_refresh(asset_type: str | None = None) -> dict:
    """Manually trigger a refresh — used by the admin/refresh endpoint."""
    from data_assets.services.history_service import refresh_daily_candles

    if asset_type == "crypto":
        asyncio.create_task(_run_crypto())
        triggered = ["crypto"]
    elif asset_type in ("stock", "etf"):
        asyncio.create_task(_run_stocks())
        triggered = ["stock", "etf"]
    elif asset_type == "candles":
        async def _run_candles():
            async with SessionLocal() as db:
                run = await start_job_run(db, "manual_daily_candles")
                result = await refresh_daily_candles(db)
                await complete_job_run(db, run, status="success", **result)
        asyncio.create_task(_run_candles())
        triggered = ["candles"]
    else:
        asyncio.create_task(_run_crypto())
        asyncio.create_task(_run_stocks())
        triggered = ["crypto", "stock", "etf"]

    return {"triggered": triggered}
