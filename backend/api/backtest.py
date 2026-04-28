"""Backtest API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, Backtest, LightningPayment, Strategy
from trading.lightning_credentials import get_alby_tokens
from strategies.backtester import run_backtest_for_strategy
import json

router = APIRouter()


class BacktestRequest(BaseModel):
    strategy_id: int
    ticker: str = "BTC/USD"
    period: str = "5y"
    initial_capital: float = 100.0
    session_id: str = ""


def derive_trades_from_chart(chart_data: list) -> list:
    """Recreate trade markers from saved daily chart data."""
    trades = []
    in_position = False
    for row in chart_data or []:
        signal = row.get("signal", 0)
        if signal == 1 and not in_position:
            trades.append({"date": row.get("date"), "action": "buy", "price": row.get("price")})
            in_position = True
        elif signal == -1 and in_position:
            trades.append({"date": row.get("date"), "action": "sell", "price": row.get("price")})
            in_position = False
    return trades


@router.post("/backtest")
async def create_backtest(request: BacktestRequest, db: AsyncSession = Depends(get_db)):
    strat = await db.get(Strategy, request.strategy_id)
    if not strat:
        raise HTTPException(status_code=404, detail="Strategy not found")

    if get_alby_tokens():
        db.add(LightningPayment(
            session_id=request.session_id or strat.session_id or "",
            amount_sats=10,
            type="backtest_fee",
        ))

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
    strategy = await db.get(Strategy, bt.strategy_id)
    chart_data = bt.get_chart_data()
    return {
        "id": bt.id,
        "strategy_id": bt.strategy_id,
        "strategy_name": strategy.name if strategy else f"Strategy #{bt.strategy_id}",
        "ticker": bt.ticker,
        "metrics": bt.get_metrics(),
        "chart_data": chart_data,
        "trades": derive_trades_from_chart(chart_data),
        "created_at": bt.created_at,
    }


@router.get("/backtests")
async def list_backtests(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Backtest).order_by(Backtest.created_at.desc()).limit(30))
    backtests = result.scalars().all()

    rows = []
    for bt in backtests:
        strategy = await db.get(Strategy, bt.strategy_id)
        metrics = bt.get_metrics()
        rows.append({
            "id": bt.id,
            "strategy_id": bt.strategy_id,
            "strategy_name": strategy.name if strategy else f"Strategy #{bt.strategy_id}",
            "ticker": bt.ticker,
            "final_value": bt.final_value,
            "total_return_pct": metrics.get("total_return_pct"),
            "created_at": bt.created_at,
        })
    return rows
