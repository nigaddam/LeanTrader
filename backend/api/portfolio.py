"""Portfolio aggregation endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Query
import krakenex

from trading.credentials import get_kraken_credentials, mask_key

router = APIRouter()


ASSET_META = {
    # Fiat / stablecoins
    "ZUSD": {"symbol": "USD",  "name": "US Dollar Cash", "type": "cash",   "pair": None},
    "USD":  {"symbol": "USD",  "name": "US Dollar Cash", "type": "cash",   "pair": None},
    "USDC": {"symbol": "USDC", "name": "USD Coin",       "type": "stable", "pair": "USDCUSD"},
    "USDT": {"symbol": "USDT", "name": "Tether",         "type": "stable", "pair": "USDTUSD"},
    "DAI":  {"symbol": "DAI",  "name": "Dai",            "type": "stable", "pair": "DAIUSD"},
    # Bitcoin
    "XXBT": {"symbol": "BTC", "name": "Bitcoin",  "type": "crypto", "pair": "XXBTZUSD"},
    "XBT":  {"symbol": "BTC", "name": "Bitcoin",  "type": "crypto", "pair": "XXBTZUSD"},
    # Ethereum
    "XETH": {"symbol": "ETH", "name": "Ethereum", "type": "crypto", "pair": "XETHZUSD"},
    "ETH":  {"symbol": "ETH", "name": "Ethereum", "type": "crypto", "pair": "XETHZUSD"},
    # Other top assets
    "SOL":  {"symbol": "SOL",  "name": "Solana",   "type": "crypto", "pair": "SOLUSD"},
    "XXRP": {"symbol": "XRP",  "name": "XRP",      "type": "crypto", "pair": "XXRPZUSD"},
    "XRP":  {"symbol": "XRP",  "name": "XRP",      "type": "crypto", "pair": "XXRPZUSD"},
    "ADA":  {"symbol": "ADA",  "name": "Cardano",  "type": "crypto", "pair": "ADAUSD"},
    "DOT":  {"symbol": "DOT",  "name": "Polkadot", "type": "crypto", "pair": "DOTUSD"},
    "LINK": {"symbol": "LINK", "name": "Chainlink","type": "crypto", "pair": "LINKUSD"},
    "XLTC": {"symbol": "LTC",  "name": "Litecoin", "type": "crypto", "pair": "XLTCZUSD"},
    "LTC":  {"symbol": "LTC",  "name": "Litecoin", "type": "crypto", "pair": "XLTCZUSD"},
    "XDGE": {"symbol": "DOGE", "name": "Dogecoin", "type": "crypto", "pair": "XDGUSD"},
    "DOGE": {"symbol": "DOGE", "name": "Dogecoin", "type": "crypto", "pair": "XDGUSD"},
    "AVAX": {"symbol": "AVAX", "name": "Avalanche","type": "crypto", "pair": "AVAXUSD"},
    "MATIC":{"symbol": "MATIC","name": "Polygon",  "type": "crypto", "pair": "MATICUSD"},
    # Other
    "CC":   {"symbol": "CC",   "name": "Canton",   "type": "crypto", "pair": "CCUSD"},
}


def _asset_meta(code: str) -> dict:
    if code in ASSET_META:
        return ASSET_META[code]
    symbol = code
    if len(code) in (4, 5) and code[0] in {"X", "Z"}:
        symbol = code[1:]
    return {"symbol": symbol, "name": "Kraken asset", "type": "asset", "pair": f"{symbol}USD"}


def _last_price_usd(pair: str | None) -> tuple[float | None, str | None]:
    if not pair:
        return 1.0, None
    response = krakenex.API().query_public("Ticker", {"pair": pair})
    errors = response.get("error") or []
    if errors:
        return None, ", ".join(errors)
    try:
        return float(next(iter(response["result"].values()))["c"][0]), None
    except Exception as exc:
        return None, str(exc)


def _ohlc_daily_closes(pair: str, days: int) -> tuple[list[dict], str | None]:
    # Kraken REST OHLC returns up to 720 recent candles. For deeper history,
    # TODO: use Kraken downloadable historical CSV data.
    response = krakenex.API().query_public("OHLC", {"pair": pair, "interval": 1440})
    errors = response.get("error") or []
    if errors:
        return [], ", ".join(errors)
    result = response.get("result", {})
    series = next((value for key, value in result.items() if key != "last"), [])
    points = []
    for candle in series[-days:]:
        timestamp = int(candle[0])
        points.append({
            "date": datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat(),
            "close": float(candle[4]),
        })
    return points, None


def _portfolio_history(holdings: list[dict], days: int, cash_usd: float) -> tuple[list[dict], list[str]]:
    errors = []
    crypto_holdings = [h for h in holdings if h.get("price_pair")]
    if not crypto_holdings:
        return [], []

    values_by_date: dict[str, float] = {}
    initialized_dates: set[str] = set()
    for holding in crypto_holdings:
        closes, error = _ohlc_daily_closes(holding["price_pair"], days)
        if error:
            errors.append(f"{holding['ticker']}: {error}")
            continue
        for point in closes:
            if point["date"] not in initialized_dates:
                values_by_date[point["date"]] = cash_usd
                initialized_dates.add(point["date"])
            values_by_date[point["date"]] += holding["balance"] * point["close"]

    history = [
        {"date": date, "value_usd": round(value, 2)}
        for date, value in sorted(values_by_date.items())
    ]
    return history, errors


@router.get("/portfolio/kraken")
async def get_kraken_portfolio(range: str = Query("7D", pattern="^(7D|30D)$")):
    """Return a product-friendly view of the connected Kraken account."""
    credentials = get_kraken_credentials()
    if not credentials:
        return {
            "connected": False,
            "source": "",
            "key_preview": "",
            "total_value_usd": 0.0,
            "cash_usd": 0.0,
            "holdings": [],
            "unpriced_assets": [],
            "updated_at": datetime.utcnow().isoformat(),
        }

    client = krakenex.API(key=credentials.api_key, secret=credentials.api_secret)
    response = client.query_private("Balance")
    errors = response.get("error") or []
    if errors:
        return {
            "connected": True,
            "source": credentials.source,
            "key_preview": mask_key(credentials.api_key),
            "error": ", ".join(errors),
            "total_value_usd": 0.0,
            "cash_usd": 0.0,
            "holdings": [],
            "unpriced_assets": [],
            "updated_at": datetime.utcnow().isoformat(),
        }

    holdings = []
    total_value_usd = 0.0
    cash_usd = 0.0
    unpriced_assets = []

    for code, raw_amount in response.get("result", {}).items():
        amount = float(raw_amount)
        if amount <= 0:
            continue
        meta = _asset_meta(code)
        price_usd, price_error = _last_price_usd(meta["pair"])
        value_usd = round(amount * price_usd, 2) if price_usd is not None else None
        if value_usd is not None:
            total_value_usd += value_usd
            if meta["symbol"] == "USD":
                cash_usd += value_usd
        else:
            unpriced_assets.append(meta["symbol"])
        holdings.append({
            "asset_code": code,
            "kraken_code": code,
            "external_code": code,
            "symbol": meta["symbol"],
            "ticker": meta["symbol"],
            "name": meta["name"],
            "asset_name": meta["name"],
            "type": meta["type"],
            "amount": amount,
            "balance": amount,
            "price_usd": price_usd,
            "value_usd": value_usd,
            "estimated_value": value_usd,
            "source": "Kraken",
            "price_pair": meta["pair"],
            "price_error": price_error,
        })

    holdings.sort(key=lambda h: (h["symbol"] != "USD", -(h["value_usd"] or 0), h["symbol"]))
    for holding in holdings:
        holding["allocation"] = (
            round(((holding["value_usd"] or 0) / total_value_usd) * 100, 2)
            if total_value_usd > 0 else 0.0
        )

    history_days = 7 if range == "7D" else 30
    history, history_errors = _portfolio_history(holdings, history_days, cash_usd)

    return {
        "connected": True,
        "source": credentials.source,
        "key_preview": mask_key(credentials.api_key),
        "range": range,
        "total_value_usd": round(total_value_usd, 2),
        "cash_usd": round(cash_usd, 2),
        "crypto_value_usd": round(total_value_usd - cash_usd, 2),
        "holdings_count": len(holdings),
        "holdings": holdings,
        "history": history,
        "history_errors": history_errors,
        "unpriced_assets": unpriced_assets,
        "updated_at": datetime.utcnow().isoformat(),
    }
