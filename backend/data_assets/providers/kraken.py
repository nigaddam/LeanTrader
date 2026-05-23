"""Kraken public REST API provider — crypto prices and OHLCV."""
import logging
from datetime import datetime, timezone
from typing import Optional

import krakenex

from data_assets.providers.base import AssetProvider, OHLCVCandle, PriceQuote

logger = logging.getLogger(__name__)
_DAILY_INTERVAL = 1440  # Kraken interval in minutes for daily candles


class KrakenProvider(AssetProvider):
    name = "kraken"

    def __init__(self):
        self._api = krakenex.API()   # public-only; no keys needed for market data

    def get_quote(self, source_symbol: str) -> Optional[PriceQuote]:
        try:
            resp = self._api.query_public("Ticker", {"pair": source_symbol})
            errors = resp.get("error") or []
            if errors:
                logger.warning("Kraken Ticker error for %s: %s", source_symbol, errors)
                return None

            result = resp.get("result", {})
            if not result:
                return None

            data = next(iter(result.values()))
            price      = float(data["c"][0])
            high_24h   = float(data["h"][1])
            low_24h    = float(data["l"][1])
            volume_24h = float(data["v"][1])
            open_today = float(data["o"])
            change_pct = ((price - open_today) / open_today * 100) if open_today else None

            return PriceQuote(
                symbol=source_symbol,
                price=price,
                high_24h=high_24h,
                low_24h=low_24h,
                volume_24h=volume_24h * price,   # convert base currency → USD
                change_24h_pct=round(change_pct, 4) if change_pct is not None else None,
            )
        except Exception as exc:
            logger.error("KrakenProvider.get_quote(%s) failed: %s", source_symbol, exc)
            return None

    def get_ohlcv(self, source_symbol: str, days: int = 365) -> list[OHLCVCandle]:
        try:
            resp = self._api.query_public("OHLC", {"pair": source_symbol, "interval": _DAILY_INTERVAL})
            errors = resp.get("error") or []
            if errors:
                logger.warning("Kraken OHLC error for %s: %s", source_symbol, errors)
                return []

            result = resp.get("result", {})
            series = next((v for k, v in result.items() if k != "last"), [])

            candles = []
            for row in series[-days:]:
                ts = datetime.fromtimestamp(int(row[0]), tz=timezone.utc).replace(tzinfo=None)
                candles.append(OHLCVCandle(
                    timestamp=ts,
                    open=float(row[1]),
                    high=float(row[2]),
                    low=float(row[3]),
                    close=float(row[4]),
                    volume=float(row[6]),
                ))
            return candles
        except Exception as exc:
            logger.error("KrakenProvider.get_ohlcv(%s) failed: %s", source_symbol, exc)
            return []

    def supports_trading(self) -> bool:
        return True


kraken_provider = KrakenProvider()
