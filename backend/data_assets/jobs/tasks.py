"""APScheduler job functions — thin wrappers that open a DB session and call services."""
import logging
from data_assets.models.db import SessionLocal
from data_assets.services.price_service import refresh_crypto_prices, refresh_stock_prices
from data_assets.services.history_service import refresh_daily_candles
from data_assets.repositories.job_run_repo import start_job_run, complete_job_run
from data_assets.seed.seeder import seed_assets

logger = logging.getLogger(__name__)


async def job_refresh_crypto_prices():
    logger.info("[job] refresh_crypto_prices started")
    run = None
    try:
        async with SessionLocal() as db:
            run = await start_job_run(db, "refresh_crypto_prices")
            result = await refresh_crypto_prices(db)
            await complete_job_run(db, run, status="success", **result)
        logger.info("[job] refresh_crypto_prices done — %d updated", result["success_count"])
    except Exception as exc:
        logger.exception("[job] refresh_crypto_prices failed")
        if run:
            async with SessionLocal() as db:
                await complete_job_run(db, run, status="failed", error_message=str(exc))


async def job_refresh_stock_prices():
    logger.info("[job] refresh_stock_prices started")
    run = None
    try:
        async with SessionLocal() as db:
            run = await start_job_run(db, "refresh_stock_prices")
            result = await refresh_stock_prices(db)
            await complete_job_run(db, run, status="success", **result)
        logger.info("[job] refresh_stock_prices done — %d updated", result["success_count"])
    except Exception as exc:
        logger.exception("[job] refresh_stock_prices failed")
        if run:
            async with SessionLocal() as db:
                await complete_job_run(db, run, status="failed", error_message=str(exc))


async def job_refresh_daily_candles():
    logger.info("[job] refresh_daily_candles started")
    run = None
    try:
        async with SessionLocal() as db:
            run = await start_job_run(db, "refresh_daily_candles")
            result = await refresh_daily_candles(db)
            await complete_job_run(db, run, status="success", **result)
        logger.info("[job] refresh_daily_candles done — %d new candles", result["success_count"])
    except Exception as exc:
        logger.exception("[job] refresh_daily_candles failed")
        if run:
            async with SessionLocal() as db:
                await complete_job_run(db, run, status="failed", error_message=str(exc))


async def job_refresh_asset_universe():
    logger.info("[job] refresh_asset_universe started")
    run = None
    try:
        async with SessionLocal() as db:
            run = await start_job_run(db, "refresh_asset_universe")
            n = await seed_assets(db)
            await complete_job_run(
                db,
                run,
                status="success",
                asset_count=n,
                success_count=n,
                failure_count=0,
            )
        logger.info("[job] refresh_asset_universe done — %d new assets", n)
    except Exception as exc:
        logger.exception("[job] refresh_asset_universe failed")
        if run:
            async with SessionLocal() as db:
                await complete_job_run(db, run, status="failed", error_message=str(exc))
