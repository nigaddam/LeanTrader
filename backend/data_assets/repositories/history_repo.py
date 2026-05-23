"""AssetOHLCV read/write queries."""
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.asset import AssetOHLCV
from data_assets.providers.base import OHLCVCandle


async def get_candles(
    db: AsyncSession,
    asset_id: int,
    since: datetime,
    interval: str = "1d",
) -> list[AssetOHLCV]:
    r = await db.execute(
        select(AssetOHLCV)
        .where(
            AssetOHLCV.asset_id == asset_id,
            AssetOHLCV.interval == interval,
            AssetOHLCV.timestamp >= since,
        )
        .order_by(AssetOHLCV.timestamp)
    )
    return list(r.scalars().all())


async def upsert_candles(
    db: AsyncSession,
    asset_id: int,
    source: str,
    candles: list[OHLCVCandle],
    interval: str = "1d",
) -> int:
    """Insert new candles only (skip duplicates). Returns count added."""
    r = await db.execute(
        select(AssetOHLCV.timestamp).where(
            AssetOHLCV.asset_id == asset_id,
            AssetOHLCV.interval == interval,
        )
    )
    known_ts = {row[0] for row in r.all()}
    added = 0
    for c in candles:
        if c.timestamp not in known_ts:
            db.add(AssetOHLCV(
                asset_id=asset_id,
                interval=interval,
                source=source,
                timestamp=c.timestamp,
                open=c.open, high=c.high, low=c.low, close=c.close, volume=c.volume,
            ))
            known_ts.add(c.timestamp)
            added += 1
    return added


def period_to_since(period: str) -> datetime:
    days = {"1m": 30, "3m": 90, "6m": 180, "1y": 365, "2y": 730, "3y": 1095}.get(period, 365)
    return datetime.utcnow() - timedelta(days=days)
