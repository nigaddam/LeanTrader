"""data_assets — internal, isolated market-data platform for LangStock.

Public surface (used by main.py and admin.py):

    from data_assets.models.db import init_db, SessionLocal
    from data_assets.seed.seeder import seed_assets
    from data_assets.jobs.scheduler import create_scheduler
    from data_assets.refresh.coordinator import warm_startup_refresh
    from data_assets.router import router as assets_router

This package is intentionally self-contained so it can later be
extracted into a separate service without major rewrites.
"""
