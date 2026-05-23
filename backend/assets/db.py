"""Backward-compatibility shim — re-exports from data_assets.models.db."""
from data_assets.models.db import (  # noqa: F401
    engine,
    SessionLocal,
    Base,
    get_db as get_asset_db,
    init_db as init_asset_db,
)
