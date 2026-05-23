"""Backward-compatibility shim."""
from data_assets.providers import (  # noqa: F401
    AssetProvider, PriceQuote, OHLCVCandle,
    kraken_provider, yfinance_provider,
)
