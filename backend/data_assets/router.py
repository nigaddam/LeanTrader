"""Data-assets public API — same routes as the old assets/router.py.

Route ordering is critical: exact paths must be declared BEFORE /{symbol}.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from data_assets.models.db import get_db
from data_assets.services.asset_service import (
    get_asset_list,
    get_asset_detail,
    search_assets,
    get_asset_history,
)
from data_assets.repositories.price_repo import get_latest_price
from data_assets.repositories.asset_repo import get_asset_by_symbol
from data_assets.refresh.coordinator import manual_refresh
from data_assets.jobs.scheduler import get_status as scheduler_status
from data_assets.utils.format import age_minutes
from data_assets.admin_auth import require_admin_secret

logger = logging.getLogger(__name__)
router = APIRouter()


# ── List / search ─────────────────────────────────────────────────────────────

@router.get("/assets")
async def list_assets(
    asset_type: Optional[str] = Query(None, description="stock | etf | crypto"),
    tradable:   Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    rows = await get_asset_list(db, asset_type=asset_type, tradable=tradable)
    oldest = min((r["price_updated_at"] for r in rows if r["price_updated_at"]), default=None)
    return {"total": len(rows), "assets": rows, "refreshed_at": oldest}


@router.get("/assets/search")
async def search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
):
    rows = await search_assets(db, query=q)
    return {"total": len(rows), "assets": rows, "query": q}


# ── Admin / ops endpoints ─────────────────────────────────────────────────────

@router.get("/assets/admin/status", dependencies=[Depends(require_admin_secret)])
async def refresh_status(db: AsyncSession = Depends(get_db)):
    from data_assets.dashboard.views import platform_status
    return await platform_status(db)


@router.post("/assets/admin/refresh", dependencies=[Depends(require_admin_secret)])
async def trigger_refresh(asset_type: Optional[str] = Query(None)):
    result = await manual_refresh(asset_type)
    return {**result, "at": datetime.utcnow().isoformat()}


# ── Single-asset endpoints (parameterised — MUST come after exact paths) ──────

@router.get("/assets/{symbol}")
async def get_asset(symbol: str, db: AsyncSession = Depends(get_db)):
    detail = await get_asset_detail(db, symbol)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Asset '{symbol}' not found")
    return detail


@router.get("/assets/{symbol}/quote")
async def get_quote(symbol: str, db: AsyncSession = Depends(get_db)):
    asset = await get_asset_by_symbol(db, symbol)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{symbol}' not found")
    price = await get_latest_price(db, asset.id)
    if not price:
        raise HTTPException(status_code=404, detail=f"No price data for '{symbol}' yet")
    return {
        "symbol":         asset.symbol,
        "price":          price.price,
        "change_24h_pct": price.change_24h_pct,
        "high_24h":       price.high_24h,
        "low_24h":        price.low_24h,
        "volume_24h":     price.volume_24h,
        "source":         price.source,
        "updated_at":     price.timestamp.isoformat(),
        "age_minutes":    age_minutes(price.timestamp),
    }


@router.get("/assets/{symbol}/history")
async def get_history(
    symbol: str,
    period: str = Query("1y", description="1m | 3m | 6m | 1y | 2y | 3y"),
    db: AsyncSession = Depends(get_db),
):
    result = await get_asset_history(db, symbol, period)
    if not result:
        raise HTTPException(status_code=404, detail=f"Asset '{symbol}' not found")
    return result
