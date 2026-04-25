"""Backtest API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, Backtest, Strategy
from strategies.backtester import run_backtest_for_strategy
import json

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_id: int
    ticker: str = "BTC/USD"
    period: str = "5y"
    initial_capital: float = 100.0


@router.post("/backtest")
async def create_backtest(request: BacktestRequest, db: AsyncSession = Depends(get_db)):
    strat = await db.get(Strategy, request.strategy_id)
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")

    try:
        results = run_backtest_for_strategy(
            strat.code, request.ticker, request.period, request.initial_capital
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")

    bt = Backtest(
        strategy_id=request.strategy_id,
        ticker=request.ticker,
        initial_capital=request.initial_capital,
        final_value=results["metrics"]["final_value"],
        metrics=json.dumps(results["metrics"]),
        chart_data=json.dumps(results["chart_data"]),
    )
    db.add(bt)
    await db.commit()
    await db.refresh(bt)

    return {
        "backtest_id": bt.id,
        "strategy_name": strat.name,
        **results
    }


@router.get("/backtest/{backtest_id}")
async def get_backtest(backtest_id: int, db: AsyncSession = Depends(get_db)):
    bt = await db.get(Backtest, backtest_id)
    if not bt:
        raise HTTPException(status_code=404, detail="Backtest not found")
    return {
        "id": bt.id,
        "strategy_id": bt.strategy_id,
        "ticker": bt.ticker,
        "metrics": bt.get_metrics(),
        "chart_data": bt.get_chart_data(),
        "created_at": bt.created_at,
    }
