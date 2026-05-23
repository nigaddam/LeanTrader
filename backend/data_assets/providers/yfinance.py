"""yfinance provider — stocks and ETFs."""
import logging
from typing import Optional

import yfinance as yf

from data_assets.providers.base import AssetProvider, OHLCVCandle, PriceQuote

logger = logging.getLogger(__name__)


class YFinanceProvider(AssetProvider):
    name = "yfinance"

    def get_quote(self, source_symbol: str) -> Optional[PriceQuote]:
        try:
            ticker = yf.Ticker(source_symbol)
            info = ticker.fast_info

            price = getattr(info, "last_price", None) or getattr(info, "regular_market_price", None)
            if price is None:
                return None

            prev_close = getattr(info, "previous_close", None) or getattr(info, "regular_market_previous_close", None)
            change_pct = ((price - prev_close) / prev_close * 100) if prev_close else None

            return PriceQuote(
                symbol=source_symbol,
                price=float(price),
                high_24h=getattr(info, "day_high", None),
                low_24h=getattr(info, "day_low", None),
                volume_24h=getattr(info, "three_month_average_volume", None),
                market_cap=getattr(info, "market_cap", None),
                change_24h_pct=round(change_pct, 4) if change_pct is not None else None,
            )
        except Exception as exc:
            logger.error("YFinanceProvider.get_quote(%s) failed: %s", source_symbol, exc)
            return None

    def get_ohlcv(self, source_symbol: str, days: int = 365) -> list[OHLCVCandle]:
        try:
            period = f"{min(days, 1825)}d"
            df = yf.download(source_symbol, period=period, interval="1d", progress=False, auto_adjust=True)
            if df.empty:
                return []

            candles = []
            for ts, row in df.iterrows():
                def _val(col):
                    try:
                        v = row[col] if col in row.index else row[(col, source_symbol)]
                        return float(v) if v is not None else 0.0
                    except Exception:
                        return 0.0

                candles.append(OHLCVCandle(
                    timestamp=ts.to_pydatetime().replace(tzinfo=None),
                    open=_val("Open"),
                    high=_val("High"),
                    low=_val("Low"),
                    close=_val("Close"),
                    volume=_val("Volume"),
                ))
            return candles[-days:]
        except Exception as exc:
            logger.error("YFinanceProvider.get_ohlcv(%s) failed: %s", source_symbol, exc)
            return []


yfinance_provider = YFinanceProvider()
