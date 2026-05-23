"""Lightweight internal Data Operations API."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.admin_auth import require_admin_secret
from data_assets.models.asset import Asset, AssetPrice, AssetSource, JobRun
from data_assets.models.db import get_db, SessionLocal
from data_assets.providers.kraken import kraken_provider
from data_assets.providers.yfinance import yfinance_provider
from data_assets.refresh.coordinator import manual_refresh
from data_assets.repositories.asset_repo import get_asset_by_symbol, get_primary_source
from data_assets.repositories.job_run_repo import complete_job_run, start_job_run
from data_assets.repositories.price_repo import get_latest_price, upsert_price
from data_assets.utils.format import age_minutes

router = APIRouter(prefix="/admin/data", dependencies=[Depends(require_admin_secret)])


class AssetCreate(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=120)
    asset_type: str = Field(..., pattern="^(stock|etf|crypto)$")
    provider: str = Field(..., pattern="^(yfinance|kraken)$")
    provider_symbol: Optional[str] = None
    enabled: bool = True
    production_enabled: bool = True


class AssetPatch(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    asset_type: Optional[str] = Field(None, pattern="^(stock|etf|crypto)$")
    provider: Optional[str] = Field(None, pattern="^(yfinance|kraken)$")
    provider_symbol: Optional[str] = Field(None, min_length=1, max_length=40)
    enabled: Optional[bool] = None
    production_enabled: Optional[bool] = None
    metadata: Optional[dict] = None


def _serialize_run(run: JobRun) -> dict:
    duration = None
    if run.started_at and run.completed_at:
        duration = round((run.completed_at - run.started_at).total_seconds(), 3)
    return {
        "id": run.id,
        "job_name": run.job_name,
        "status": run.status,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
        "duration_seconds": duration,
        "asset_count": run.asset_count,
        "success_count": run.success_count,
        "failure_count": run.failure_count,
        "error_message": run.error_message,
    }


async def _serialize_asset(db: AsyncSession, asset: Asset) -> dict:
    source = await get_primary_source(db, asset)
    price = await get_latest_price(db, asset.id)
    age = age_minutes(price.timestamp) if price else None
    if price is None:
        refresh_status = "missing"
    elif age is not None and age > 24 * 60:
        refresh_status = "stale"
    else:
        refresh_status = "fresh"

    return {
        "symbol": asset.symbol,
        "name": asset.display_name,
        "type": asset.asset_type,
        "provider": source.source_name if source else asset.default_source,
        "provider_symbol": source.source_symbol if source else None,
        "enabled": asset.is_active,
        "production_enabled": asset.production_enabled,
        "last_updated_at": price.timestamp.isoformat() if price and price.timestamp else None,
        "price": price.price if price else None,
        "refresh_status": refresh_status,
    }


@router.get("/runs")
async def list_runs(
    status: Optional[str] = Query(None),
    job_name: Optional[str] = Query(None),
    failed_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(JobRun).order_by(desc(JobRun.started_at)).limit(limit)
    if failed_only:
        stmt = stmt.where(JobRun.status == "failed")
    elif status:
        stmt = stmt.where(JobRun.status == status)
    if job_name:
        stmt = stmt.where(JobRun.job_name == job_name)

    result = await db.execute(stmt)
    runs = [_serialize_run(run) for run in result.scalars().all()]
    return {"total": len(runs), "runs": runs}


@router.get("/assets")
async def list_admin_assets(
    enabled_only: bool = Query(False),
    production_only: bool = Query(False),
    stale_only: bool = Query(False),
    provider: Optional[str] = Query(None),
    asset_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Asset).order_by(Asset.asset_type, Asset.symbol)
    if enabled_only:
        stmt = stmt.where(Asset.is_active == True)
    if production_only:
        stmt = stmt.where(Asset.production_enabled == True)
    if asset_type:
        stmt = stmt.where(Asset.asset_type == asset_type.lower())

    result = await db.execute(stmt)
    rows = []
    for asset in result.scalars().all():
        serialized = await _serialize_asset(db, asset)
        if provider and serialized["provider"] != provider:
            continue
        if stale_only and serialized["refresh_status"] == "fresh":
            continue
        rows.append(serialized)

    return {"total": len(rows), "assets": rows, "checked_at": datetime.utcnow().isoformat()}


@router.post("/refresh")
async def trigger_admin_refresh(asset_type: Optional[str] = Query(None)):
    result = await manual_refresh(asset_type)
    return {**result, "at": datetime.utcnow().isoformat()}


@router.post("/assets")
async def add_asset(payload: AssetCreate, db: AsyncSession = Depends(get_db)):
    symbol = payload.symbol.upper().strip()
    existing = await get_asset_by_symbol(db, symbol)
    if existing:
        raise HTTPException(status_code=409, detail=f"Asset '{symbol}' already exists")

    source_symbol = (payload.provider_symbol or symbol).upper().strip()
    asset = Asset(
        symbol=symbol,
        display_name=payload.name.strip(),
        asset_type=payload.asset_type,
        is_active=payload.enabled,
        production_enabled=payload.production_enabled,
        default_source=payload.provider,
    )
    db.add(asset)
    await db.flush()
    db.add(AssetSource(
        asset_id=asset.id,
        source_name=payload.provider,
        source_symbol=source_symbol,
        tradable=payload.provider == "kraken",
    ))
    await db.commit()
    await db.refresh(asset)
    return await _serialize_asset(db, asset)


@router.patch("/assets/{symbol}")
async def update_asset(symbol: str, payload: AssetPatch, db: AsyncSession = Depends(get_db)):
    asset = await get_asset_by_symbol(db, symbol)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{symbol}' not found")

    if payload.name is not None:
        asset.display_name = payload.name.strip()
    if payload.asset_type is not None:
        asset.asset_type = payload.asset_type
    if payload.enabled is not None:
        asset.is_active = payload.enabled
    if payload.production_enabled is not None:
        asset.production_enabled = payload.production_enabled
    if payload.metadata is not None:
        asset.metadata_json = json.dumps(payload.metadata)

    source = await get_primary_source(db, asset)
    if payload.provider is not None:
        asset.default_source = payload.provider
        if source is None or source.source_name != payload.provider:
            source = AssetSource(
                asset_id=asset.id,
                source_name=payload.provider,
                source_symbol=(payload.provider_symbol or asset.symbol).upper(),
                tradable=payload.provider == "kraken",
            )
            db.add(source)
    if source and payload.provider_symbol is not None:
        source.source_symbol = payload.provider_symbol.upper().strip()

    await db.commit()
    await db.refresh(asset)
    return await _serialize_asset(db, asset)


async def _refresh_one_asset(symbol: str) -> dict:
    async with SessionLocal() as db:
        asset = await get_asset_by_symbol(db, symbol)
        if not asset:
            raise HTTPException(status_code=404, detail=f"Asset '{symbol}' not found")
        source = await get_primary_source(db, asset)
        if not source:
            raise HTTPException(status_code=400, detail=f"Asset '{asset.symbol}' has no primary source")

        run = await start_job_run(db, f"refresh_asset_{asset.symbol}")
        try:
            provider = kraken_provider if source.source_name == "kraken" else yfinance_provider
            quote = provider.get_quote(source.source_symbol)
            if not quote:
                await complete_job_run(
                    db,
                    run,
                    status="failed",
                    asset_count=1,
                    success_count=0,
                    failure_count=1,
                    error_message="Provider returned no quote.",
                )
                raise HTTPException(status_code=502, detail="Provider returned no quote")

            await upsert_price(db, asset.id, source.source_name, quote)
            await complete_job_run(db, run, status="success", asset_count=1, success_count=1, failure_count=0)
            return await _serialize_asset(db, asset)
        except HTTPException:
            raise
        except Exception as exc:
            await db.rollback()
            await complete_job_run(
                db,
                run,
                status="failed",
                asset_count=1,
                success_count=0,
                failure_count=1,
                error_message=str(exc),
            )
            raise HTTPException(status_code=500, detail="Asset refresh failed") from exc


@router.post("/assets/{symbol}/refresh")
async def refresh_asset(symbol: str):
    return await _refresh_one_asset(symbol.upper())
