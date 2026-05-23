"""Provider abstraction — every external data source implements this interface.

The rest of the codebase never imports Kraken / yfinance / CoinGecko directly;
it only ever calls an AssetProvider.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class PriceQuote:
    symbol: str
    price: float
    currency: str = "USD"
    change_24h_pct: Optional[float] = None
    volume_24h: Optional[float] = None
    market_cap: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    fetched_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class OHLCVCandle:
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class AssetProvider(ABC):
    """Abstract base every data provider must implement."""

    name: str = "unknown"

    @abstractmethod
    def get_quote(self, source_symbol: str) -> Optional[PriceQuote]:
        """Return latest price quote, or None on failure."""

    @abstractmethod
    def get_ohlcv(self, source_symbol: str, days: int = 365) -> list[OHLCVCandle]:
        """Return daily OHLCV candles for the past `days` calendar days."""

    def get_metadata(self, source_symbol: str) -> dict:
        """Return optional enrichment metadata (logo, description, etc.)."""
        return {}

    def supports_trading(self) -> bool:
        return False
