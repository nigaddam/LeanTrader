"""
Backtesting engine.
Fetches historical OHLCV data, runs strategy signals,
simulates $100 portfolio, and returns chart data + metrics.
"""
import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, Any
import json
from urllib.parse import urlencode
from urllib.request import urlopen


TICKER_MAP = {
    "BTC/USD": "BTC-USD",
    "ETH/USD": "ETH-USD",
    "SOL/USD": "SOL-USD",
}

KRAKEN_PAIR_MAP = {
    "BTC/USD": "XXBTZUSD",
    "ETH/USD": "XETHZUSD",
    "SOL/USD": "SOLUSD",
}

COINGECKO_ID_MAP = {
    "BTC/USD": "bitcoin",
    "ETH/USD": "ethereum",
    "SOL/USD": "solana",
}


def _period_to_days(period: str) -> int:
    """Convert simple yfinance-style periods into days."""
    period = (period or "5y").lower().strip()
    if period.endswith("y"):
        return int(period[:-1] or 1) * 365
    if period.endswith("mo"):
        return int(period[:-2] or 1) * 30
    if period.endswith("d"):
        return int(period[:-1] or 1)
    return 365


def fetch_ohlcv_from_kraken(ticker: str, period: str = "5y") -> pd.DataFrame:
    """Fetch daily OHLCV data from Kraken public API as a yfinance fallback."""
    import krakenex

    pair = KRAKEN_PAIR_MAP.get(ticker.upper(), ticker.replace("/", ""))
    since = int((datetime.utcnow() - timedelta(days=_period_to_days(period))).timestamp())
    rows = []
    last_seen = None

    api = krakenex.API()
    for _ in range(10):
        resp = api.query_public("OHLC", {"pair": pair, "interval": 1440, "since": since})
        if resp.get("error"):
            raise ValueError(f"Kraken OHLC error for {ticker}: {resp['error']}")

        result = resp.get("result", {})
        raw_rows = next((value for key, value in result.items() if key != "last"), [])
        if not raw_rows:
            break

        new_rows = [row for row in raw_rows if row[0] != last_seen]
        rows.extend(new_rows)

        last_seen = raw_rows[-1][0]
        next_since = int(result.get("last", last_seen))
        if next_since <= since:
            break
        since = next_since

        if len(raw_rows) < 720:
            break

    if not rows:
        raise ValueError(f"No data returned for {ticker}")

    df = pd.DataFrame(
        rows,
        columns=["timestamp", "open", "high", "low", "close", "vwap", "volume", "count"],
    )
    df["date"] = pd.to_datetime(df["timestamp"], unit="s")
    df = df.set_index("date")
    df = df[["open", "high", "low", "close", "volume"]].astype(float)
    df = df[~df.index.duplicated(keep="last")].sort_index().dropna()
    return df


def fetch_ohlcv_from_coingecko(ticker: str, period: str = "3y") -> pd.DataFrame:
    """Fetch daily close/volume data from CoinGecko as a public fallback."""
    coin_id = COINGECKO_ID_MAP.get(ticker.upper())
    if not coin_id:
        raise ValueError(f"CoinGecko does not support {ticker}")

    params = urlencode({
        "vs_currency": "usd",
        "days": _period_to_days(period),
        "interval": "daily",
    })
    url = f"https://api.coingecko.com/api/v3/coins/{coin_id}/market_chart?{params}"

    with urlopen(url, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))

    prices = payload.get("prices", [])
    volumes = payload.get("total_volumes", [])
    if not prices:
        raise ValueError(f"No CoinGecko data returned for {ticker}")

    volume_by_ts = {int(ts): volume for ts, volume in volumes}
    rows = []
    for ts, price in prices:
        date = pd.to_datetime(ts, unit="ms").normalize()
        rows.append({
            "date": date,
            "open": float(price),
            "high": float(price),
            "low": float(price),
            "close": float(price),
            "volume": float(volume_by_ts.get(int(ts), 0)),
        })

    df = pd.DataFrame(rows).set_index("date")
    df = df[~df.index.duplicated(keep="last")].sort_index().dropna()
    return df


def fetch_ohlcv(ticker: str, period: str = "5y") -> pd.DataFrame:
    """Fetch historical OHLCV data from yfinance, falling back to Kraken."""
    yf_ticker = TICKER_MAP.get(ticker.upper(), ticker)
    try:
        df = yf.download(yf_ticker, period=period, interval="1d", auto_adjust=True, progress=False)
    except Exception:
        df = pd.DataFrame()

    if df.empty:
        try:
            df = fetch_ohlcv_from_coingecko(ticker, period)
        except Exception:
            df = fetch_ohlcv_from_kraken(ticker, period)
        if df.empty:
            raise ValueError(f"No data returned for {ticker}")
        return df

    df.columns = [c.lower() for c in df.columns]
    df.index = pd.to_datetime(df.index)
    df = df.dropna()
    return df


def simulate_portfolio(df: pd.DataFrame, initial_capital: float = 100.0) -> pd.DataFrame:
    """
    Simulate portfolio value based on signals.
    Signal: 1 = buy (enter), -1 = sell (exit), 0 = hold
    """
    capital = initial_capital
    position = 0.0       # BTC held
    portfolio_values = []
    trades = []

    for i, (date, row) in enumerate(df.iterrows()):
        price = row["close"]
        signal = row.get("signal", 0)

        # Execute signal
        if signal == 1 and position == 0 and capital > 0:
            # BUY
            position = capital / price
            capital = 0
            trades.append({"date": str(date.date()), "action": "buy", "price": round(price, 2)})

        elif signal == -1 and position > 0:
            # SELL
            capital = position * price
            position = 0
            trades.append({"date": str(date.date()), "action": "sell", "price": round(price, 2)})

        # Portfolio value = cash + btc value
        portfolio_value = capital + (position * price)
        portfolio_values.append({
            "date": str(date.date()),
            "value": round(portfolio_value, 2),
            "signal": int(signal),
            "price": round(price, 2),
        })

    df["portfolio_value"] = [p["value"] for p in portfolio_values]
    return df, portfolio_values, trades


def calculate_metrics(portfolio_values: list, initial_capital: float) -> Dict[str, Any]:
    """Calculate performance metrics from portfolio value series."""
    values = [p["value"] for p in portfolio_values]

    if not values or len(values) < 2:
        return {}

    final_value = values[-1]
    total_return_pct = ((final_value - initial_capital) / initial_capital) * 100

    # Daily returns
    returns = pd.Series(values).pct_change().dropna()

    # Sharpe Ratio (annualized, assuming 0% risk-free rate)
    sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0

    # Max Drawdown
    peak = pd.Series(values).cummax()
    drawdown = (pd.Series(values) - peak) / peak
    max_drawdown_pct = drawdown.min() * 100

    return {
        "initial_capital": round(initial_capital, 2),
        "final_value": round(final_value, 2),
        "total_return_pct": round(total_return_pct, 2),
        "sharpe_ratio": round(sharpe, 3),
        "max_drawdown_pct": round(max_drawdown_pct, 2),
        "period_days": len(values),
    }


def run_backtest_for_strategy(
    strategy_code: str,
    ticker: str = "BTC/USD",
    period: str = "5y",
    initial_capital: float = 100.0
) -> Dict[str, Any]:
    """
    Main backtesting function.
    
    Args:
        strategy_code: Python code string containing a strategy class
        ticker: Asset pair e.g. 'BTC/USD'
        period: History period e.g. '5y', '2y', '1y'
        initial_capital: Starting capital in USD
    
    Returns:
        dict with 'metrics', 'chart_data', and 'trades'
    """
    # 1. Fetch data
    df = fetch_ohlcv(ticker, period)

    # 2. Execute the strategy code to get the class
    namespace = {"pd": pd, "np": np}
    exec(strategy_code, namespace)

    # Find the strategy class (first class defined in code)
    strategy_class = None
    for name, obj in namespace.items():
        if isinstance(obj, type) and hasattr(obj, "generate_signals"):
            strategy_class = obj
            break

    if strategy_class is None:
        raise ValueError("No strategy class with generate_signals() found in generated code")

    # 3. Instantiate and run
    strategy = strategy_class()
    df = strategy.generate_signals(df)

    if "signal" not in df.columns:
        raise ValueError("Strategy generate_signals() must return DataFrame with 'signal' column")

    # 4. Simulate portfolio
    df, portfolio_values, trades = simulate_portfolio(df, initial_capital)

    # 5. Calculate metrics
    metrics = calculate_metrics(portfolio_values, initial_capital)
    metrics["num_trades"] = len(trades)
    if trades:
        buy_trades = [t for t in trades if t["action"] == "buy"]
        sell_trades = [t for t in trades if t["action"] == "sell"]
        metrics["num_buys"] = len(buy_trades)
        metrics["num_sells"] = len(sell_trades)

    return {
        "metrics": metrics,
        "chart_data": portfolio_values,
        "trades": trades,
    }
