"""Asset listing / detail service — pure business logic, no HTTP concerns."""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.asset import Asset, AssetPrice, AssetSource
from data_assets.repositories.asset_repo import (
    list_active_assets,
    get_asset_by_symbol,
    get_primary_source,
    get_all_sources,
)
from data_assets.repositories.price_repo import get_latest_price
from data_assets.repositories.history_repo import get_candles, period_to_since
from data_assets.providers.kraken import kraken_provider
from data_assets.providers.yfinance import yfinance_provider
from data_assets.utils.format import age_minutes, is_fresh


def serialize_asset(
    asset: Asset,
    price_row: Optional[AssetPrice] = None,
    source_row: Optional[AssetSource] = None,
) -> dict:
    age = age_minutes(price_row.timestamp) if price_row else None
    return {
        "id":              asset.id,
        "symbol":          asset.symbol,
        "display_name":    asset.display_name,
        "asset_type":      asset.asset_type,
        "is_active":       asset.is_active,
        "production_enabled": asset.production_enabled,
        "default_source":  asset.default_source,
        "logo_url":        asset.logo_url,
        "tradable":        source_row.tradable if source_row else False,
        "price":           price_row.price          if price_row else None,
        "change_24h_pct":  price_row.change_24h_pct if price_row else None,
        "volume_24h":      price_row.volume_24h     if price_row else None,
        "market_cap":      price_row.market_cap     if price_row else None,
        "high_24h":        price_row.high_24h       if price_row else None,
        "low_24h":         price_row.low_24h        if price_row else None,
        "price_source":    price_row.source         if price_row else None,
        "price_updated_at": price_row.timestamp.isoformat() if price_row and price_row.timestamp else None,
        "price_age_minutes": age,
        "price_fresh":     is_fresh(price_row.timestamp) if price_row else False,
    }


async def get_asset_list(
    db: AsyncSession,
    asset_type: Optional[str] = None,
    tradable: Optional[bool] = None,
) -> list[dict]:
    assets = await list_active_assets(db, asset_type)
    rows = []
    for asset in assets:
        price = await get_latest_price(db, asset.id)
        src   = await get_primary_source(db, asset)
        serialized = serialize_asset(asset, price, src)
        if tradable is not None and serialized["tradable"] != tradable:
            continue
        rows.append(serialized)
    return rows


async def get_asset_detail(db: AsyncSession, symbol: str) -> Optional[dict]:
    asset = await get_asset_by_symbol(db, symbol)
    if not asset:
        return None
    price = await get_latest_price(db, asset.id)
    src   = await get_primary_source(db, asset)
    all_sources = [
        {"source_name": s.source_name, "source_symbol": s.source_symbol, "tradable": s.tradable}
        for s in await get_all_sources(db, asset.id)
    ]
    return {**serialize_asset(asset, price, src), "sources": all_sources}


async def search_assets(db: AsyncSession, query: str, limit: int = 20) -> list[dict]:
    needle = query.strip().lower()
    assets = await list_active_assets(db)
    matches = [
        a for a in assets
        if needle in a.symbol.lower() or needle in a.display_name.lower()
    ]
    rows = []
    for asset in matches[:limit]:
        price = await get_latest_price(db, asset.id)
        src   = await get_primary_source(db, asset)
        rows.append(serialize_asset(asset, price, src))
    return rows


async def get_asset_history(
    db: AsyncSession,
    symbol: str,
    period: str = "1y",
) -> Optional[dict]:
    """Return OHLCV candles for the given period, falling back to live fetch if DB is empty."""
    asset = await get_asset_by_symbol(db, symbol)
    if not asset:
        return None

    since = period_to_since(period)
    candles = await get_candles(db, asset.id, since)

    if not candles:
        src = await get_primary_source(db, asset)
        if src:
            provider = kraken_provider if src.source_name == "kraken" else yfinance_provider
            days = (datetime.utcnow() - since).days
            live = provider.get_ohlcv(src.source_symbol, days=days)
            return {
                "symbol": asset.symbol,
                "period": period,
                "prices": _format_candles(live),
                "source": src.source_name,
                "cached": False,
                "updated_at": datetime.utcnow().isoformat(),
            }
        return {"symbol": asset.symbol, "period": period, "prices": [], "cached": False, "updated_at": None}

    return {
        "symbol":     asset.symbol,
        "period":     period,
        "prices":     _format_candles(candles),
        "source":     candles[0].source if candles else None,
        "cached":     True,
        "updated_at": candles[-1].timestamp.isoformat() if candles else None,
    }


def _format_candles(candles) -> list[dict]:
    return [
        {
            "date":   c.timestamp.date().isoformat() if hasattr(c, "timestamp") else c.timestamp.date().isoformat(),
            "open":   round(c.open, 6),
            "high":   round(c.high, 6),
            "low":    round(c.low, 6),
            "close":  round(c.close, 6),
            "volume": round(c.volume, 2),
        }
        for c in candles
    ]
