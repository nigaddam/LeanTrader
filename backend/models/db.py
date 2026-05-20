"""
SQLAlchemy models and database initialization.
"""
import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, Text, ForeignKey, Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/leantrade.db")

# Convert sqlite:// to sqlite+aiosqlite:// for async
if DATABASE_URL.startswith("sqlite:///"):
    ASYNC_DATABASE_URL = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
else:
    ASYNC_DATABASE_URL = DATABASE_URL

engine = create_async_engine(ASYNC_DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)
    messages = Column(Text, default="[]")  # JSON array of {role, content, timestamp}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_messages(self):
        return json.loads(self.messages)

    def add_message(self, role: str, content: str):
        msgs = self.get_messages()
        msgs.append({"role": role, "content": content, "timestamp": datetime.utcnow().isoformat()})
        self.messages = json.dumps(msgs)


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)          # sma | rsi | bollinger | custom
    code = Column(Text, nullable=False)             # Full Python class code
    parameters = Column(Text, default="{}")         # JSON: {period: 14, ...}
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    backtests = relationship("Backtest", back_populates="strategy")
    orders = relationship("Order", back_populates="strategy")

    def get_parameters(self):
        return json.loads(self.parameters)


class Backtest(Base):
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    ticker = Column(String, default="BTC/USD")
    start_date = Column(String)
    end_date = Column(String)
    initial_capital = Column(Float, default=100.0)
    final_value = Column(Float)
    metrics = Column(Text, default="{}")        # JSON: {sharpe, drawdown, win_rate, ...}
    chart_data = Column(Text, default="[]")     # JSON: [{date, value, signal}]
    created_at = Column(DateTime, default=datetime.utcnow)

    strategy = relationship("Strategy", back_populates="backtests")

    def get_metrics(self):
        return json.loads(self.metrics)

    def get_chart_data(self):
        return json.loads(self.chart_data)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    kraken_order_id = Column(String)
    ticker = Column(String)
    side = Column(String)               # buy | sell
    amount = Column(Float)
    price = Column(Float)
    status = Column(String, default="pending")  # pending | filled | cancelled
    timestamp = Column(DateTime, default=datetime.utcnow)

    strategy = relationship("Strategy", back_populates="orders")


class LiveStrategy(Base):
    """Tracks currently running live strategies."""
    __tablename__ = "live_strategies"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"))
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    ticker = Column(String)
    amount_usd = Column(Float)
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    stopped_at = Column(DateTime, nullable=True)
    last_signal = Column(Integer, nullable=True)          # -1 / 0 / 1
    last_evaluated_at = Column(DateTime, nullable=True)
    total_pnl = Column(Float, default=0.0)


class LiveOrder(Base):
    """Orders placed by live strategies."""
    __tablename__ = "live_orders"

    id = Column(Integer, primary_key=True, index=True)
    live_strategy_id = Column(Integer, ForeignKey("live_strategies.id"))
    session_id = Column(String, nullable=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    kraken_order_id = Column(String)
    ticker = Column(String)
    side = Column(String)       # buy | sell
    amount_usd = Column(Float)
    volume = Column(Float)
    price = Column(Float)
    status = Column(String, default="filled")
    sandbox = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class User(Base):
    """Registered users (Google OAuth)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    google_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    """
    Canonical session registry — one row per unique session_id.

    parent_session_id: points to the previous session's session_id if the
    same user returned within SESSION_TIMEOUT_MINUTES. NULL means a fresh start.
    """
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    parent_session_id = Column(String, nullable=True)   # previous session_id, no FK to keep it simple
    started_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)


class LightningPayment(Base):
    """Records Lightning payment/debit attempts for platform services."""
    __tablename__ = "lightning_payments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    amount_sats = Column(Integer)
    type = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)


def _migrate(conn):
    """Add columns that may be missing from pre-existing tables."""
    from sqlalchemy import inspect, text
    inspector = inspect(conn)
    tables = set(inspector.get_table_names())

    def safe_add(table, col, col_type):
        if table not in tables:
            return
        existing = {c["name"] for c in inspector.get_columns(table)}
        if col not in existing:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))

    # user_id linkage across all event tables
    for tbl in ("conversations", "strategies", "backtests", "live_strategies", "lightning_payments", "orders", "live_orders"):
        safe_add(tbl, "user_id", "INTEGER")

    # session_id linkage on tables that were missing it
    for tbl in ("backtests", "live_strategies", "orders", "live_orders"):
        safe_add(tbl, "session_id", "TEXT")

    # live_strategies operational columns
    safe_add("live_strategies", "last_signal", "INTEGER")
    safe_add("live_strategies", "last_evaluated_at", "DATETIME")
    safe_add("live_strategies", "total_pnl", "FLOAT DEFAULT 0.0")


async def init_db():
    """Create all tables and run lightweight column migrations."""
    import os
    os.makedirs("./data", exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_migrate)


async def get_db():
    """Dependency: yields a DB session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
