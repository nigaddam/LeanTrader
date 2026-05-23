"""SQLAlchemy async engine for the data-assets platform.

Dev  → SQLite  (data/assets.db)   — zero config
Prod → Postgres (SUPABASE_DB_URL) — set in .env
"""
import os
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

_RAW_URL = os.getenv("SUPABASE_DB_URL", "").strip()

if _RAW_URL:
    _DB_URL = (
        _RAW_URL
        .replace("postgresql://", "postgresql+asyncpg://")
        .replace("postgres://", "postgresql+asyncpg://")
    )
    _connect_args = {"ssl": "require"} if "supabase" in _RAW_URL else {}
    engine = create_async_engine(
        _DB_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        connect_args=_connect_args,
    )
else:
    _DB_URL = "sqlite+aiosqlite:///data/assets.db"
    engine = create_async_engine(_DB_URL, connect_args={"check_same_thread": False, "timeout": 30})

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — yields an async session."""
    async with SessionLocal() as session:
        yield session


async def init_db():
    """Create all tables (idempotent — safe to call on every startup)."""
    from data_assets.models import asset as _  # noqa: ensure models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_lightweight_migrations)


def _run_lightweight_migrations(sync_conn):
    """Small additive migrations for launch-era SQLite/Postgres deployments."""
    inspector = inspect(sync_conn)
    if "assets" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("assets")}
    if "production_enabled" not in columns:
        default = "1" if sync_conn.dialect.name == "sqlite" else "true"
        sync_conn.execute(text(f"ALTER TABLE assets ADD COLUMN production_enabled BOOLEAN DEFAULT {default}"))
