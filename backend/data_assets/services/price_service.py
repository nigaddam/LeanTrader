"""Price refresh service — orchestrates providers + repositories.

Each function fetches fresh quotes for a group of assets and persists
them.  Designed to be called by scheduler jobs or the warm-startup
coordinator; never called directly from router code.
"""
import logging
import os
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.repositories.asset_repo import list_assets_with_source, list_assets_multi_type_with_source
from data_assets.repositories.price_repo import upsert_price
from data_assets.providers.kraken import kraken_provider
from data_assets.providers.yfinance import yfinance_provider

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def refresh_production_only() -> bool:
    default = os.getenv("APP_ENV", "").lower() == "production"
    return _env_bool("ASSET_REFRESH_PRODUCTION_ONLY", default)


async def refresh_crypto_prices(db: AsyncSession) -> dict:
    """Fetch latest Kraken quotes for all active crypto assets."""
    rows = await list_assets_with_source(
        db,
        asset_type="crypto",
        source_name="kraken",
        production_only=refresh_production_only(),
    )
    refreshed = 0
    failures = 0
    for asset, src in rows:
        try:
            quote = kraken_provider.get_quote(src.source_symbol)
            if quote:
                await upsert_price(db, asset.id, "kraken", quote)
                await db.commit()
                refreshed += 1
        except Exception:
            failures += 1
            await db.rollback()
            logger.exception("refresh_crypto_prices failed for %s (%s)", asset.symbol, src.source_symbol)
    logger.info("refresh_crypto_prices: %d / %d updated", refreshed, len(rows))
    return {"asset_count": len(rows), "success_count": refreshed, "failure_count": failures}


async def refresh_stock_prices(db: AsyncSession) -> dict:
    """Fetch yfinance quotes for all active stock + ETF assets."""
    rows = await list_assets_multi_type_with_source(
        db,
        asset_types=["stock", "etf"],
        source_name="yfinance",
        production_only=refresh_production_only(),
    )
    refreshed = 0
    failures = 0
    for asset, src in rows:
        try:
            quote = yfinance_provider.get_quote(src.source_symbol)
            if quote:
                await upsert_price(db, asset.id, "yfinance", quote)
                await db.commit()
                refreshed += 1
        except Exception:
            failures += 1
            await db.rollback()
            logger.exception("refresh_stock_prices failed for %s (%s)", asset.symbol, src.source_symbol)
    logger.info("refresh_stock_prices: %d / %d updated", refreshed, len(rows))
    return {"asset_count": len(rows), "success_count": refreshed, "failure_count": failures}
