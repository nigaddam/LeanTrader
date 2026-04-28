"""
LangChain tools for the LeanTrade trading agent.
Each tool corresponds to a concrete action the agent can take.
"""
import json
import os
from langchain.tools import tool


# ─────────────────────────────────────────────
# Tool 1: Get Market Data
# ─────────────────────────────────────────────
@tool
def get_market_data(ticker: str) -> str:
    """
    Fetch current market data for a crypto asset.
    Use ticker format like 'BTC/USD', 'ETH/USD'.
    Returns current price, 24h change, volume, and basic stats.
    """
    try:
        import krakenex
        k = krakenex.API()
        # Convert BTC/USD → XXBTZUSD (Kraken format)
        pair_map = {
            "BTC/USD": "XXBTZUSD",
            "ETH/USD": "XETHZUSD",
            "SOL/USD": "SOLUSD",
        }
        pair = pair_map.get(ticker.upper(), ticker.replace("/", ""))
        resp = k.query_public("Ticker", {"pair": pair})

        if resp.get("error"):
            return f"Could not fetch data for {ticker}: {resp['error']}"

        data = list(resp["result"].values())[0]
        price = float(data["c"][0])
        open_price = float(data["o"])
        change_pct = ((price - open_price) / open_price) * 100
        volume = float(data["v"][1])  # 24h volume

        return json.dumps({
            "ticker": ticker,
            "price": round(price, 2),
            "change_24h_pct": round(change_pct, 2),
            "volume_24h": round(volume, 2),
            "high_24h": round(float(data["h"][1]), 2),
            "low_24h": round(float(data["l"][1]), 2),
            "trades_24h": int(data["t"][1]),
        })
    except Exception as e:
        # Fallback to yfinance if Kraken fails
        try:
            import yfinance as yf
            symbol_map = {"BTC/USD": "BTC-USD", "ETH/USD": "ETH-USD"}
            symbol = symbol_map.get(ticker.upper(), ticker.replace("/", "-"))
            ticker_obj = yf.Ticker(symbol)
            info = ticker_obj.fast_info
            hist = ticker_obj.history(period="2d")
            if not hist.empty:
                price = hist["Close"].iloc[-1]
                prev_close = hist["Close"].iloc[-2] if len(hist) > 1 else price
                change_pct = ((price - prev_close) / prev_close) * 100
                return json.dumps({
                    "ticker": ticker,
                    "price": round(price, 2),
                    "change_24h_pct": round(change_pct, 2),
                    "volume_24h": round(hist["Volume"].iloc[-1], 2),
                    "high_24h": round(hist["High"].iloc[-1], 2),
                    "low_24h": round(hist["Low"].iloc[-1], 2),
                    "source": "yfinance"
                })
        except Exception as e2:
            pass
        return f"Error fetching market data: {str(e)}"


# ─────────────────────────────────────────────
# Tool 2: Generate Strategy
# ─────────────────────────────────────────────
@tool
def generate_strategy(description: str, strategy_type: str = "rsi", parameters: str = "{}") -> str:
    """
    Generate a Python trading strategy class from a natural language description.
    strategy_type options: 'sma', 'rsi', 'bollinger', 'custom'
    parameters should be a JSON string like '{"period": 14, "overbought": 70, "oversold": 30}'
    Returns the strategy ID and Python code.
    """
    from openai import OpenAI
    from agent.prompts import STRATEGY_GENERATION_PROMPT

    params = json.loads(parameters) if isinstance(parameters, str) else parameters

    prompt = STRATEGY_GENERATION_PROMPT.format(
        description=description,
        parameters=json.dumps(params)
    )

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.2,
        max_tokens=2000,
        messages=[
            {"role": "system", "content": "You generate only complete, runnable Python trading strategy classes."},
            {"role": "user", "content": prompt},
        ],
    )

    code = response.choices[0].message.content.strip()
    # Strip markdown fences if present
    if code.startswith("```"):
        code = code.split("```")[1]
        if code.startswith("python"):
            code = code[6:]
        code = code.strip()

    # Save to DB (synchronous wrapper — agent runs in sync context)
    import asyncio
    from models.db import async_session, Strategy

    strategy_name = f"{strategy_type.upper()} Strategy ({', '.join(f'{k}={v}' for k, v in params.items())})"

    async def save():
        async with async_session() as db:
            strat = Strategy(
                name=strategy_name,
                type=strategy_type,
                code=code,
                parameters=json.dumps(params),
                description=description,
            )
            db.add(strat)
            await db.commit()
            await db.refresh(strat)
            return strat.id

    try:
        loop = asyncio.get_event_loop()
        strategy_id = loop.run_until_complete(save())
    except RuntimeError:
        strategy_id = asyncio.run(save())

    return json.dumps({
        "strategy_id": strategy_id,
        "name": strategy_name,
        "code": code,
        "message": f"Strategy generated and saved with ID {strategy_id}. Ready to backtest."
    })


# ─────────────────────────────────────────────
# Tool 3: Run Backtest
# ─────────────────────────────────────────────
@tool
def run_backtest(strategy_id: int, ticker: str = "BTC/USD", period: str = "5y") -> str:
    """
    Backtest a strategy against historical data.
    strategy_id: the ID returned by generate_strategy
    ticker: e.g. 'BTC/USD'
    period: '1y', '2y', '5y'
    Returns metrics and chart data showing $100 growth.
    """
    import asyncio
    from models.db import async_session, Strategy
    from strategies.backtester import run_backtest_for_strategy

    async def fetch_and_run():
        async with async_session() as db:
            strat = await db.get(Strategy, strategy_id)
            if not strat:
                return None, None
            return strat.code, strat.name

    try:
        loop = asyncio.get_event_loop()
        code, name = loop.run_until_complete(fetch_and_run())
    except RuntimeError:
        code, name = asyncio.run(fetch_and_run())

    if not code:
        return json.dumps({"error": f"Strategy {strategy_id} not found"})

    try:
        results = run_backtest_for_strategy(code, ticker, period, initial_capital=100.0)
        results["strategy_id"] = strategy_id
        results["strategy_name"] = name

        # Save backtest to DB
        async def save_backtest():
            async with async_session() as db:
                from models.db import Backtest
                bt = Backtest(
                    strategy_id=strategy_id,
                    ticker=ticker,
                    initial_capital=100.0,
                    final_value=results["metrics"]["final_value"],
                    metrics=json.dumps(results["metrics"]),
                    chart_data=json.dumps(results["chart_data"]),
                )
                db.add(bt)
                await db.commit()
                await db.refresh(bt)
                return bt.id

        try:
            loop = asyncio.get_event_loop()
            bt_id = loop.run_until_complete(save_backtest())
        except RuntimeError:
            bt_id = asyncio.run(save_backtest())

        results["backtest_id"] = bt_id
        return json.dumps(results, default=str)

    except Exception as e:
        return json.dumps({"error": f"Backtest failed: {str(e)}"})


# ─────────────────────────────────────────────
# Tool 4: Deploy to Kraken
# ─────────────────────────────────────────────
@tool
def deploy_to_kraken(strategy_id: int, amount_usd: float = 100.0, confirmed: bool = False) -> str:
    """
    Deploy a strategy to live trading on Kraken.
    IMPORTANT: Only call this if the user has explicitly typed 'CONFIRM' in their message.
    strategy_id: the ID of the strategy to deploy
    amount_usd: amount in USD to trade with
    confirmed: must be True (set after user types CONFIRM)
    """
    if not confirmed:
        return json.dumps({
            "status": "confirmation_required",
            "message": "To deploy to live trading, please type CONFIRM in your message. This will execute real trades on Kraken."
        })

    sandbox = os.getenv("KRAKEN_SANDBOX", "true").lower() == "true"
    from trading.credentials import has_kraken_credentials

    if not sandbox and not has_kraken_credentials():
        return json.dumps({"error": "Kraken is not connected. Connect Kraken before deploying live trading."})

    import asyncio
    from models.db import async_session, Strategy, LiveStrategy

    async def activate():
        async with async_session() as db:
            strat = await db.get(Strategy, strategy_id)
            if not strat:
                return None
            live = LiveStrategy(
                strategy_id=strategy_id,
                ticker="BTC/USD",
                amount_usd=amount_usd,
                is_active=True,
            )
            db.add(live)
            await db.commit()
            await db.refresh(live)
            return live.id

    try:
        loop = asyncio.get_event_loop()
        live_id = loop.run_until_complete(activate())
    except RuntimeError:
        live_id = asyncio.run(activate())

    mode = "SANDBOX (no real money)" if sandbox else "LIVE TRADING"

    return json.dumps({
        "status": "deployed",
        "live_strategy_id": live_id,
        "mode": mode,
        "amount_usd": amount_usd,
        "poll_interval_seconds": int(os.getenv("POLL_INTERVAL_SECONDS", 300)),
        "message": f"Strategy deployed in {mode} mode. Polling every {os.getenv('POLL_INTERVAL_SECONDS', 300)}s for signals."
    })


# ─────────────────────────────────────────────
# Tool 5: Get Kraken Positions
# ─────────────────────────────────────────────
@tool
def get_kraken_positions() -> str:
    """
    Get current open positions and account balance from Kraken.
    Returns positions, unrealized P&L, and available balance.
    """
    try:
        from trading.kraken_executor import get_kraken_client
        k = get_kraken_client()

        balance_resp = k.query_private("Balance")
        if balance_resp.get("error"):
            return json.dumps({"error": str(balance_resp["error"]), "positions": [], "balance": {}})

        balance = balance_resp.get("result", {})
        # Filter out zero balances
        balance = {k: float(v) for k, v in balance.items() if float(v) > 0}

        return json.dumps({
            "balance": balance,
            "positions": [],  # For spot trading, balance IS the position
            "message": "Current Kraken account balance"
        })
    except Exception as e:
        return json.dumps({"error": str(e), "positions": [], "balance": {}})


# Export all tools
ALL_TOOLS = [
    get_market_data,
    generate_strategy,
    run_backtest,
    get_kraken_positions,
]
