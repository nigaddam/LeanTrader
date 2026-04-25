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
    kraken_order_id = Column(String)
    ticker = Column(String)
    side = Column(String)       # buy | sell
    amount_usd = Column(Float)
    volume = Column(Float)
    price = Column(Float)
    status = Column(String, default="filled")
    sandbox = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


async def _migrate(conn):
    """Add columns that may be missing from pre-existing tables."""
    from sqlalchemy import inspect, text
    inspector = inspect(conn)

    def safe_add(table, col, col_type):
        existing = {c["name"] for c in inspector.get_columns(table)}
        if col not in existing:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))

    if "live_strategies" in inspector.get_table_names():
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
