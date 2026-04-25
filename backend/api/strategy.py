"""Strategy API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.db import get_db, Strategy

router = APIRouter()


@router.get("/strategy/{strategy_id}")
async def get_strategy(strategy_id: int, db: AsyncSession = Depends(get_db)):
    strat = await db.get(Strategy, strategy_id)
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {
        "id": strat.id,
        "name": strat.name,
        "type": strat.type,
        "parameters": strat.get_parameters(),
        "description": strat.description,
        "created_at": strat.created_at,
    }


@router.get("/strategy/{strategy_id}/code", response_class=PlainTextResponse)
async def get_strategy_code(strategy_id: int, db: AsyncSession = Depends(get_db)):
    strat = await db.get(Strategy, strategy_id)
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strat.code


@router.get("/strategies")
async def list_strategies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Strategy).order_by(Strategy.created_at.desc()).limit(20))
    strategies = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "type": s.type,
            "parameters": s.get_parameters(),
            "description": s.description,
            "created_at": s.created_at,
        }
        for s in strategies
    ]
