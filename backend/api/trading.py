"""Trading (deploy/positions) API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, LiveStrategy
import os

router = APIRouter()


class DeployRequest(BaseModel):
    strategy_id: int
    amount_usd: float = 100.0


@router.post("/deploy")
async def deploy_strategy(request: DeployRequest, db: AsyncSession = Depends(get_db)):
    """Deploy a strategy to live Kraken trading."""
    sandbox = os.getenv("KRAKEN_SANDBOX", "true").lower() == "true"

    live = LiveStrategy(
        strategy_id=request.strategy_id,
        ticker="BTC/USD",
        amount_usd=request.amount_usd,
        is_active=True,
    )
    db.add(live)
    await db.commit()
    await db.refresh(live)

    return {
        "live_strategy_id": live.id,
        "mode": "SANDBOX" if sandbox else "LIVE",
        "status": "deployed",
        "message": f"Strategy deployed. Polling every {os.getenv('POLL_INTERVAL_SECONDS', 300)}s."
    }


@router.delete("/deploy/{live_id}")
async def stop_strategy(live_id: int, db: AsyncSession = Depends(get_db)):
    """Stop a running live strategy."""
    live = await db.get(LiveStrategy, live_id)
    if not live:
        raise HTTPException(status_code=404, detail="Live strategy not found")
    live.is_active = False
    from datetime import datetime
    live.stopped_at = datetime.utcnow()
    await db.commit()
    return {"status": "stopped", "live_strategy_id": live_id}


@router.get("/positions")
async def get_positions():
    """Get current Kraken positions and balance."""
    try:
        import krakenex
        k = krakenex.API(
            key=os.getenv("KRAKEN_API_KEY", ""),
            secret=os.getenv("KRAKEN_API_SECRET", "")
        )
        resp = k.query_private("Balance")
        if resp.get("error"):
            return {"error": str(resp["error"]), "balance": {}}
        balance = {k: float(v) for k, v in resp.get("result", {}).items() if float(v) > 0}
        return {"balance": balance, "positions": []}
    except Exception as e:
        return {"error": str(e), "balance": {}, "positions": []}
