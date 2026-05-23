"""History (OHLCV candle) refresh service."""
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.repositories.asset_repo import list_all_with_primary_source
from data_assets.repositories.history_repo import upsert_candles
from data_assets.providers.kraken import kraken_provider
from data_assets.providers.yfinance import yfinance_provider
from data_assets.services.price_service import refresh_production_only

logger = logging.getLogger(__name__)


async def refresh_daily_candles(db: AsyncSession) -> dict:
    """Fetch and persist 365-day candle history for all active assets."""
    rows = await list_all_with_primary_source(db, production_only=refresh_production_only())
    total = 0
    failures = 0
    for asset, src in rows:
        try:
            provider = kraken_provider if src.source_name == "kraken" else yfinance_provider
            candles = provider.get_ohlcv(src.source_symbol, days=365)
            added = await upsert_candles(db, asset.id, src.source_name, candles)
            await db.commit()
            total += added
        except Exception:
            failures += 1
            await db.rollback()
            logger.exception("refresh_daily_candles failed for %s (%s)", asset.symbol, src.source_symbol)
    logger.info("refresh_daily_candles: %d new candles", total)
    return {"asset_count": len(rows), "success_count": total, "failure_count": failures}
