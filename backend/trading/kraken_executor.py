"""
Kraken order execution engine.
Handles live order placement and position monitoring.
"""
import os
import krakenex
import json
from datetime import datetime


def get_kraken_client():
    return krakenex.API(
        key=os.getenv("KRAKEN_API_KEY", ""),
        secret=os.getenv("KRAKEN_API_SECRET", "")
    )


def place_market_order(ticker: str, side: str, amount_usd: float) -> dict:
    """
    Place a market order on Kraken.
    side: 'buy' or 'sell'
    amount_usd: amount in USD
    """
    k = get_kraken_client()
    pair_map = {"BTC/USD": "XXBTZUSD", "ETH/USD": "XETHZUSD"}
    pair = pair_map.get(ticker.upper(), ticker.replace("/", ""))

    # Get current price to calculate volume
    ticker_resp = k.query_public("Ticker", {"pair": pair})
    price = float(list(ticker_resp["result"].values())[0]["c"][0])
    volume = amount_usd / price

    order_data = {
        "pair": pair,
        "type": side,
        "ordertype": "market",
        "volume": round(volume, 8),
    }

    if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true":
        # Sandbox: simulate order
        return {
            "order_id": f"sandbox_{int(datetime.utcnow().timestamp())}",
            "side": side,
            "volume": volume,
            "price": price,
            "status": "filled",
            "sandbox": True,
        }

    resp = k.query_private("AddOrder", order_data)
    if resp.get("error"):
        raise ValueError(f"Kraken order error: {resp['error']}")

    return {
        "order_id": resp["result"]["txid"][0],
        "side": side,
        "volume": volume,
        "price": price,
        "status": "pending",
        "sandbox": False,
    }


def get_balance() -> dict:
    k = get_kraken_client()
    resp = k.query_private("Balance")
    if resp.get("error"):
        return {}
    return {k: float(v) for k, v in resp.get("result", {}).items() if float(v) > 0}
