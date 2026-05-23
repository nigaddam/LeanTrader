"""Asset + AssetSource read queries — thin DB access layer."""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.asset import Asset, AssetSource


async def get_asset_by_symbol(db: AsyncSession, symbol: str) -> Optional[Asset]:
    r = await db.execute(select(Asset).where(Asset.symbol == symbol.upper()))
    return r.scalar_one_or_none()


async def list_active_assets(
    db: AsyncSession,
    asset_type: Optional[str] = None,
    production_only: bool = False,
) -> list[Asset]:
    stmt = select(Asset).where(Asset.is_active == True).order_by(Asset.asset_type, Asset.symbol)
    if production_only:
        stmt = stmt.where(Asset.production_enabled == True)
    if asset_type:
        stmt = stmt.where(Asset.asset_type == asset_type.lower())
    r = await db.execute(stmt)
    return list(r.scalars().all())


async def list_assets_with_source(
    db: AsyncSession,
    asset_type: str,
    source_name: str,
    production_only: bool = False,
) -> list[tuple[Asset, AssetSource]]:
    stmt = (
        select(Asset, AssetSource)
        .join(AssetSource, AssetSource.asset_id == Asset.id)
        .where(
            Asset.asset_type == asset_type,
            Asset.is_active == True,
            AssetSource.source_name == source_name,
        )
    )
    if production_only:
        stmt = stmt.where(Asset.production_enabled == True)
    r = await db.execute(stmt)
    return list(r.all())


async def list_assets_multi_type_with_source(
    db: AsyncSession,
    asset_types: list[str],
    source_name: str,
    production_only: bool = False,
) -> list[tuple[Asset, AssetSource]]:
    stmt = (
        select(Asset, AssetSource)
        .join(AssetSource, AssetSource.asset_id == Asset.id)
        .where(
            Asset.asset_type.in_(asset_types),
            Asset.is_active == True,
            AssetSource.source_name == source_name,
        )
    )
    if production_only:
        stmt = stmt.where(Asset.production_enabled == True)
    r = await db.execute(stmt)
    return list(r.all())


async def get_primary_source(db: AsyncSession, asset: Asset) -> Optional[AssetSource]:
    r = await db.execute(
        select(AssetSource).where(
            AssetSource.asset_id == asset.id,
            AssetSource.source_name == asset.default_source,
        )
    )
    return r.scalar_one_or_none()


async def get_all_sources(db: AsyncSession, asset_id: int) -> list[AssetSource]:
    r = await db.execute(select(AssetSource).where(AssetSource.asset_id == asset_id))
    return list(r.scalars().all())


async def list_all_with_primary_source(
    db: AsyncSession,
    production_only: bool = False,
) -> list[tuple[Asset, AssetSource]]:
    stmt = (
        select(Asset, AssetSource)
        .join(AssetSource, AssetSource.asset_id == Asset.id)
        .where(
            Asset.is_active == True,
            AssetSource.source_name == Asset.default_source,
        )
    )
    if production_only:
        stmt = stmt.where(Asset.production_enabled == True)
    r = await db.execute(stmt)
    return list(r.all())
