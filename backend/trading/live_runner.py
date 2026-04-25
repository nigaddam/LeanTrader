"""
Live strategy runner.
Maintains one asyncio Task per active LiveStrategy.
Every POLL_INTERVAL_SECONDS it:
  1. Fetches recent OHLCV data
  2. Runs the strategy's generate_signals()
  3. Reads the latest signal (-1 / 0 / 1)
  4. Places a Kraken order when the signal changes (and is not HOLD)
  5. Persists the result to the DB
"""
import asyncio
import os
import logging
from datetime import datetime
import pandas as pd
import numpy as np

from models.db import async_session, LiveStrategy, LiveOrder, Strategy
from trading.kraken_executor import place_market_order
from strategies.backtester import fetch_ohlcv

logger = logging.getLogger("live_runner")

# {live_strategy_id: asyncio.Task}
_running: dict[int, asyncio.Task] = {}


def start(live_id: int, strategy_id: int, ticker: str, amount_usd: float) -> None:
    """Spawn the polling loop for a live strategy (fire-and-forget)."""
    if live_id in _running:
        return
    task = asyncio.create_task(
        _loop(live_id, strategy_id, ticker, amount_usd),
        name=f"live-{live_id}",
    )
    _running[live_id] = task
    task.add_done_callback(lambda t: _running.pop(live_id, None))


def stop(live_id: int) -> None:
    """Cancel the polling task for a live strategy."""
    task = _running.pop(live_id, None)
    if task and not task.done():
        task.cancel()


def is_running(live_id: int) -> bool:
    return live_id in _running


async def _loop(live_id: int, strategy_id: int, ticker: str, amount_usd: float) -> None:
    interval = int(os.getenv("POLL_INTERVAL_SECONDS", 300))
    last_signal = 0

    logger.info(f"[live-{live_id}] Started. ticker={ticker} interval={interval}s")

    # Run immediately on first iteration, then wait
    first = True
    while True:
        if not first:
            await asyncio.sleep(interval)
        first = False

        try:
            signal = await _evaluate(live_id, strategy_id, ticker)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.error(f"[live-{live_id}] Evaluation error: {exc}")
            continue

        # Act only when signal changes and is a trade signal
        if signal != last_signal and signal != 0:
            side = "buy" if signal == 1 else "sell"
            logger.info(f"[live-{live_id}] Signal → {side.upper()}")
            try:
                order = place_market_order(ticker, side, amount_usd)
                await _save_order(live_id, ticker, order)
            except Exception as exc:
                logger.error(f"[live-{live_id}] Order error: {exc}")

        last_signal = signal

    logger.info(f"[live-{live_id}] Stopped.")


async def _evaluate(live_id: int, strategy_id: int, ticker: str) -> int:
    """Fetch data, run strategy, return latest signal."""
    # Run blocking IO in thread pool to not block the event loop
    loop = asyncio.get_running_loop()
    signal = await loop.run_in_executor(None, _compute_signal, strategy_id, ticker)

    # Persist last_signal + timestamp
    async with async_session() as db:
        live = await db.get(LiveStrategy, live_id)
        if live:
            live.last_signal = signal
            live.last_evaluated_at = datetime.utcnow()
            await db.commit()

    return signal


def _compute_signal(strategy_id: int, ticker: str) -> int:
    """
    Blocking: fetch 1 year of OHLCV and run the strategy.
    Returns the latest bar's signal (-1, 0, or 1).
    """
    import asyncio as _asyncio

    # Fetch strategy code synchronously via a new event loop slice
    # Since we're in a thread we need a sync DB call — use synchronous SQLAlchemy pattern
    # We read the strategy code from disk-based async session via run_until_complete on a NEW loop.
    strategy_code = _fetch_strategy_code_sync(strategy_id)
    if not strategy_code:
        return 0

    df = fetch_ohlcv(ticker, "1y")

    namespace = {"pd": pd, "np": np}
    exec(strategy_code, namespace)  # noqa: S102

    strategy_class = next(
        (obj for obj in namespace.values() if isinstance(obj, type) and hasattr(obj, "generate_signals")),
        None,
    )
    if strategy_class is None:
        return 0

    df = strategy_class().generate_signals(df)
    if "signal" not in df.columns or df.empty:
        return 0

    return int(df["signal"].iloc[-1])


def _fetch_strategy_code_sync(strategy_id: int) -> str | None:
    """Fetch strategy code using a fresh sync event loop (called from thread executor)."""
    import asyncio

    async def _get():
        async with async_session() as db:
            strat = await db.get(Strategy, strategy_id)
            return strat.code if strat else None

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_get())
    finally:
        loop.close()


async def _save_order(live_id: int, ticker: str, order: dict) -> None:
    async with async_session() as db:
        live_order = LiveOrder(
            live_strategy_id=live_id,
            kraken_order_id=order.get("order_id"),
            ticker=ticker,
            side=order["side"],
            amount_usd=0,
            volume=order.get("volume", 0),
            price=order.get("price", 0),
            status=order.get("status", "filled"),
            sandbox=order.get("sandbox", True),
        )
        db.add(live_order)
        await db.commit()
