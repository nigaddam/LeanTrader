"""Trading (deploy/positions/live-strategies) API endpoints."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, LiveStrategy, LiveOrder, Strategy
import os

router = APIRouter()


class DeployRequest(BaseModel):
    strategy_id: int
    ticker: str = "BTC/USD"
    amount_usd: float = 100.0


# ── Deploy / stop ─────────────────────────────────────────────────────────────

@router.post("/deploy")
async def deploy_strategy(request: DeployRequest, db: AsyncSession = Depends(get_db)):
    """Deploy a strategy to live Kraken trading."""
    from trading.live_runner import start as runner_start

    strategy = await db.get(Strategy, request.strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    sandbox = os.getenv("KRAKEN_SANDBOX", "true").lower() == "true"

    live = LiveStrategy(
        strategy_id=request.strategy_id,
        ticker=request.ticker,
        amount_usd=request.amount_usd,
        is_active=True,
    )
    db.add(live)
    await db.commit()
    await db.refresh(live)

    runner_start(live.id, request.strategy_id, request.ticker, request.amount_usd)

    return {
        "live_strategy_id": live.id,
        "mode": "SANDBOX" if sandbox else "LIVE",
        "status": "deployed",
        "message": f"Strategy '{strategy.name}' deployed. Evaluating every {os.getenv('POLL_INTERVAL_SECONDS', 300)}s.",
    }


@router.delete("/deploy/{live_id}")
async def stop_strategy(live_id: int, db: AsyncSession = Depends(get_db)):
    """Stop a running live strategy."""
    from trading.live_runner import stop as runner_stop

    live = await db.get(LiveStrategy, live_id)
    if not live:
        raise HTTPException(status_code=404, detail="Live strategy not found")

    live.is_active = False
    live.stopped_at = datetime.utcnow()
    await db.commit()

    runner_stop(live_id)

    return {"status": "stopped", "live_strategy_id": live_id}


# ── List / detail ─────────────────────────────────────────────────────────────

@router.get("/live-strategies")
async def list_live_strategies(db: AsyncSession = Depends(get_db)):
    """List all live strategies (active and stopped)."""
    from trading.live_runner import is_running

    result = await db.execute(
        select(LiveStrategy).order_by(LiveStrategy.id.desc()).limit(50)
    )
    lives = result.scalars().all()

    rows = []
    for live in lives:
        strategy = await db.get(Strategy, live.strategy_id)
        rows.append({
            "id": live.id,
            "strategy_id": live.strategy_id,
            "strategy_name": strategy.name if strategy else f"Strategy #{live.strategy_id}",
            "ticker": live.ticker,
            "amount_usd": live.amount_usd,
            "is_active": live.is_active,
            "is_running": is_running(live.id),
            "last_signal": live.last_signal,
            "last_evaluated_at": live.last_evaluated_at,
            "total_pnl": live.total_pnl or 0.0,
            "started_at": live.started_at,
            "stopped_at": live.stopped_at,
            "mode": "SANDBOX" if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true" else "LIVE",
        })
    return rows


@router.get("/live-strategies/{live_id}")
async def get_live_strategy(live_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single live strategy with its recent orders."""
    from trading.live_runner import is_running

    live = await db.get(LiveStrategy, live_id)
    if not live:
        raise HTTPException(status_code=404, detail="Live strategy not found")

    strategy = await db.get(Strategy, live.strategy_id)

    result = await db.execute(
        select(LiveOrder)
        .where(LiveOrder.live_strategy_id == live_id)
        .order_by(LiveOrder.timestamp.desc())
        .limit(50)
    )
    orders = result.scalars().all()

    return {
        "id": live.id,
        "strategy_id": live.strategy_id,
        "strategy_name": strategy.name if strategy else f"Strategy #{live.strategy_id}",
        "ticker": live.ticker,
        "amount_usd": live.amount_usd,
        "is_active": live.is_active,
        "is_running": is_running(live.id),
        "last_signal": live.last_signal,
        "last_evaluated_at": live.last_evaluated_at,
        "total_pnl": live.total_pnl or 0.0,
        "started_at": live.started_at,
        "stopped_at": live.stopped_at,
        "mode": "SANDBOX" if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true" else "LIVE",
        "orders": [
            {
                "id": o.id,
                "side": o.side,
                "volume": o.volume,
                "price": o.price,
                "amount_usd": o.amount_usd,
                "status": o.status,
                "sandbox": o.sandbox,
                "timestamp": o.timestamp,
                "kraken_order_id": o.kraken_order_id,
            }
            for o in orders
        ],
    }


# ── Positions ─────────────────────────────────────────────────────────────────

@router.get("/positions")
async def get_positions():
    """Get current Kraken balance and positions."""
    try:
        import krakenex
        k = krakenex.API(
            key=os.getenv("KRAKEN_API_KEY", ""),
            secret=os.getenv("KRAKEN_API_SECRET", "")
        )
        resp = k.query_private("Balance")
        if resp.get("error"):
            return {"error": str(resp["error"]), "balance": {}}
        balance = {asset: float(v) for asset, v in resp.get("result", {}).items() if float(v) > 0}
        return {"balance": balance, "positions": []}
    except Exception as e:
        return {"error": str(e), "balance": {}, "positions": []}
