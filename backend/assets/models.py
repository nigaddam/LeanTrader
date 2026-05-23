"""Backward-compatibility shim — re-exports from data_assets.models.asset."""
from data_assets.models.asset import (  # noqa: F401
    Asset,
    AssetSource,
    AssetPrice,
    AssetOHLCV,
    AssetWatchlist,
)
