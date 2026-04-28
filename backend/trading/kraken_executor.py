"""
Kraken order execution engine.
Handles live order placement and position monitoring.
"""
import os
import krakenex
import json
from datetime import datetime
from trading.credentials import get_kraken_credentials, has_kraken_credentials

PAIR_MAP = {"BTC/USD": "XXBTZUSD", "ETH/USD": "XETHZUSD", "SOL/USD": "SOLUSD"}


def get_kraken_client():
    credentials = get_kraken_credentials()
    return krakenex.API(
        key=credentials.api_key if credentials else "",
        secret=credentials.api_secret if credentials else ""
    )


def get_current_price(ticker: str) -> float:
    """Fetch the current Kraken last-trade price for a supported pair."""
    k = krakenex.API()
    pair = PAIR_MAP.get(ticker.upper(), ticker.replace("/", ""))
    ticker_resp = k.query_public("Ticker", {"pair": pair})
    if ticker_resp.get("error"):
        raise ValueError(f"Kraken ticker error: {ticker_resp['error']}")
    return float(list(ticker_resp["result"].values())[0]["c"][0])


def place_market_order(ticker: str, side: str, amount_usd: float) -> dict:
    """
    Place a market order on Kraken.
    side: 'buy' or 'sell'
    amount_usd: amount in USD
    """
    k = get_kraken_client()
    pair = PAIR_MAP.get(ticker.upper(), ticker.replace("/", ""))

    # Get current price to calculate volume
    price = get_current_price(ticker)
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

    if not has_kraken_credentials():
        raise ValueError("Kraken is not connected. Connect Kraken before placing live orders.")

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
