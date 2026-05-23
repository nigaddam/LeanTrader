"""SQLAlchemy models for the data-assets platform."""
import json
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from data_assets.models.db import Base


class Asset(Base):
    __tablename__ = "assets"

    id             = Column(Integer, primary_key=True, index=True)
    symbol         = Column(String, unique=True, nullable=False, index=True)
    display_name   = Column(String, nullable=False)
    asset_type     = Column(String, nullable=False)    # stock | etf | crypto
    is_active      = Column(Boolean, default=True)
    production_enabled = Column(Boolean, default=True)
    default_source = Column(String)                    # kraken | yfinance
    logo_url       = Column(String)
    description    = Column(Text)
    metadata_json  = Column(Text, default="{}")
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sources  = relationship("AssetSource", back_populates="asset", cascade="all, delete-orphan")
    prices   = relationship("AssetPrice",  back_populates="asset", cascade="all, delete-orphan")
    candles  = relationship("AssetOHLCV",  back_populates="asset", cascade="all, delete-orphan")

    def get_metadata(self) -> dict:
        try:
            return json.loads(self.metadata_json or "{}")
        except Exception:
            return {}


class AssetSource(Base):
    """Maps one asset to one data/broker source."""
    __tablename__ = "asset_sources"
    __table_args__ = (UniqueConstraint("asset_id", "source_name", name="uq_asset_source"),)

    id              = Column(Integer, primary_key=True, index=True)
    asset_id        = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    source_name     = Column(String, nullable=False)
    source_symbol   = Column(String, nullable=False)
    tradable        = Column(Boolean, default=False)
    price_precision = Column(Integer, default=2)
    min_order_size  = Column(Float,   default=0.0)

    asset = relationship("Asset", back_populates="sources")


class AssetPrice(Base):
    """One row per (asset_id, source); updated in-place on each refresh."""
    __tablename__ = "asset_prices"
    __table_args__ = (
        UniqueConstraint("asset_id", "source", name="uq_asset_price_source"),
        Index("ix_asset_prices_asset_id", "asset_id"),
    )

    id             = Column(Integer, primary_key=True, index=True)
    asset_id       = Column(Integer, ForeignKey("assets.id"), nullable=False)
    source         = Column(String,  nullable=False)
    price          = Column(Float)
    currency       = Column(String,  default="USD")
    market_cap     = Column(Float)
    volume_24h     = Column(Float)
    change_24h_pct = Column(Float)
    high_24h       = Column(Float)
    low_24h        = Column(Float)
    timestamp      = Column(DateTime, default=datetime.utcnow)

    asset = relationship("Asset", back_populates="prices")


class AssetOHLCV(Base):
    """Daily OHLCV candles — insert-only, no update."""
    __tablename__ = "asset_ohlcv"
    __table_args__ = (
        UniqueConstraint("asset_id", "interval", "timestamp", name="uq_ohlcv"),
        Index("ix_ohlcv_asset_ts", "asset_id", "timestamp"),
    )

    id        = Column(Integer, primary_key=True, index=True)
    asset_id  = Column(Integer, ForeignKey("assets.id"), nullable=False)
    interval  = Column(String,  default="1d")
    timestamp = Column(DateTime, nullable=False)
    open      = Column(Float)
    high      = Column(Float)
    low       = Column(Float)
    close     = Column(Float)
    volume    = Column(Float)
    source    = Column(String)

    asset = relationship("Asset", back_populates="candles")


class AssetWatchlist(Base):
    """Per-user/session watchlist entries."""
    __tablename__ = "asset_watchlists"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, nullable=True,  index=True)
    session_id = Column(String,  nullable=True,  index=True)
    asset_id   = Column(Integer, ForeignKey("assets.id"), nullable=False)
    added_at   = Column(DateTime, default=datetime.utcnow)


class JobRun(Base):
    """Lightweight audit trail for data refresh jobs."""
    __tablename__ = "job_runs"
    __table_args__ = (
        Index("ix_job_runs_job_started", "job_name", "started_at"),
    )

    id            = Column(Integer, primary_key=True, index=True)
    job_name      = Column(String, nullable=False, index=True)
    status        = Column(String, nullable=False, default="running")  # running | success | failed
    started_at    = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at  = Column(DateTime, nullable=True)
    asset_count   = Column(Integer, nullable=True)
    success_count = Column(Integer, nullable=True)
    failure_count = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)
