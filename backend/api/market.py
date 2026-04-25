"""Market data API endpoints."""
from fastapi import APIRouter, HTTPException, Query

from strategies.backtester import fetch_ohlcv

router = APIRouter()

SUPPORTED_TICKERS = {"BTC/USD", "ETH/USD", "SOL/USD"}


@router.get("/assets/history")
async def get_asset_history(ticker: str = Query("BTC/USD"), period: str = Query("3y")):
    """Return daily OHLCV history for the supported MVP assets."""
    symbol = ticker.upper()
    if symbol not in SUPPORTED_TICKERS:
        raise HTTPException(status_code=400, detail="Supported tickers: BTC/USD, ETH/USD, SOL/USD")

    try:
        df = fetch_ohlcv(symbol, period)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to fetch history for {symbol}: {exc}")

    prices = []
    for date, row in df.iterrows():
        prices.append({
            "date": str(date.date()),
            "open": round(float(row["open"]), 4),
            "high": round(float(row["high"]), 4),
            "low": round(float(row["low"]), 4),
            "close": round(float(row["close"]), 4),
            "volume": round(float(row.get("volume", 0)), 4),
        })

    return {
        "symbol": symbol,
        "period": period,
        "prices": prices,
    }
