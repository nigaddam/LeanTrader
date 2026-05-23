"""AssetPrice read/write queries."""
from datetime import datetime
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.asset import AssetPrice
from data_assets.providers.base import PriceQuote


async def get_latest_price(db: AsyncSession, asset_id: int) -> Optional[AssetPrice]:
    r = await db.execute(
        select(AssetPrice)
        .where(AssetPrice.asset_id == asset_id)
        .order_by(desc(AssetPrice.timestamp))
        .limit(1)
    )
    return r.scalar_one_or_none()


async def get_price_by_source(db: AsyncSession, asset_id: int, source: str) -> Optional[AssetPrice]:
    r = await db.execute(
        select(AssetPrice).where(
            AssetPrice.asset_id == asset_id,
            AssetPrice.source == source,
        )
    )
    return r.scalar_one_or_none()


async def upsert_price(db: AsyncSession, asset_id: int, source: str, quote: PriceQuote) -> None:
    """Update existing price row or insert a new one — no commit; caller commits."""
    row = await get_price_by_source(db, asset_id, source)
    now = datetime.utcnow()
    if row:
        row.price          = quote.price
        row.change_24h_pct = quote.change_24h_pct
        row.volume_24h     = quote.volume_24h
        row.market_cap     = quote.market_cap
        row.high_24h       = quote.high_24h
        row.low_24h        = quote.low_24h
        row.timestamp      = now
    else:
        db.add(AssetPrice(
            asset_id=asset_id,
            source=source,
            price=quote.price,
            change_24h_pct=quote.change_24h_pct,
            volume_24h=quote.volume_24h,
            market_cap=quote.market_cap,
            high_24h=quote.high_24h,
            low_24h=quote.low_24h,
            timestamp=now,
        ))
