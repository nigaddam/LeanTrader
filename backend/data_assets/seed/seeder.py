"""Seed the asset universe into the DB — idempotent, safe on every startup."""
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from data_assets.models.asset import Asset, AssetSource
from data_assets.seed.universe import ASSET_UNIVERSE

logger = logging.getLogger(__name__)


async def seed_assets(db: AsyncSession) -> int:
    """Insert missing assets and sources. Returns count of NEW assets inserted."""
    inserted = 0
    for entry in ASSET_UNIVERSE:
        result = await db.execute(select(Asset).where(Asset.symbol == entry["symbol"]))
        asset = result.scalar_one_or_none()

        if asset is None:
            asset = Asset(
                symbol=entry["symbol"],
                display_name=entry["display_name"],
                asset_type=entry["asset_type"],
                default_source=entry["default_source"],
                is_active=entry.get("enabled", True),
                production_enabled=entry.get("production_enabled", True),
            )
            db.add(asset)
            await db.flush()
            inserted += 1
        else:
            asset.display_name = entry["display_name"]
            asset.asset_type = entry["asset_type"]
            asset.default_source = entry["default_source"]
            asset.is_active = entry.get("enabled", True)
            asset.production_enabled = entry.get("production_enabled", True)

        for src in entry.get("sources", []):
            existing = await db.execute(
                select(AssetSource).where(
                    AssetSource.asset_id == asset.id,
                    AssetSource.source_name == src["source_name"],
                )
            )
            source = existing.scalar_one_or_none()
            if source is None:
                db.add(AssetSource(
                    asset_id=asset.id,
                    source_name=src["source_name"],
                    source_symbol=src["source_symbol"],
                    tradable=src.get("tradable", False),
                ))
            else:
                source.source_symbol = src["source_symbol"]
                source.tradable = src.get("tradable", False)

    await db.commit()
    if inserted:
        logger.info("Seeded %d new assets into the asset universe.", inserted)
    return inserted
