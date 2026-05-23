"""LangStock FastAPI application entry point."""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Load .env before any module-level os.getenv() calls
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.db import init_db
from api.chat import router as chat_router
from api.strategy import router as strategy_router
from api.backtest import router as backtest_router
from api.trading import router as trading_router
from api.market import router as market_router
from api.connections import router as connections_router
from api.lightning import router as lightning_router
from api.auth import router as auth_router
from api.portfolio import router as portfolio_router
from api.orders import router as orders_router
from admin import create_admin

# ── data_assets platform ──────────────────────────────────────────────────────
from data_assets.models.db import init_db as init_asset_db, SessionLocal
from data_assets.seed.seeder import seed_assets
from data_assets.jobs.scheduler import create_scheduler
from data_assets.refresh.coordinator import warm_startup_refresh
from data_assets.router import router as assets_router
from data_assets.dashboard.views import router as data_dashboard_router
from data_assets.admin_router import router as data_admin_router


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Core app DB ────────────────────────────────────────────────────────
    await init_db()
    print("✅ Database initialized")

    # ── Data-assets platform DB + seed ─────────────────────────────────────
    await init_asset_db()
    async with SessionLocal() as db:
        n = await seed_assets(db)
        if n:
            print(f"✅ Asset universe seeded ({n} new assets)")
        else:
            print("✅ Asset universe up to date")

    sched = None
    if _env_bool("ENABLE_ASSET_SCHEDULER", True):
        sched = create_scheduler()
        if not sched.running:
            sched.start()
        print("✅ Asset refresh scheduler started")
    else:
        print("ℹ️ Asset refresh scheduler disabled by ENABLE_ASSET_SCHEDULER")

    # ── Phase 2: Warm startup — refresh prices immediately, don't wait 1h ──
    if _env_bool("ASSET_WARM_STARTUP_REFRESH", True):
        warm_startup_refresh()
        print("✅ Warm startup price refresh queued")
    else:
        print("ℹ️ Warm startup price refresh disabled")

    yield

    if sched and sched.running:
        sched.shutdown(wait=False)
    print("👋 Shutting down LangStock")


app = FastAPI(
    title="LangStock API",
    description="AI-powered algorithmic trading platform",
    version="0.2.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Admin panel ───────────────────────────────────────────────────────────────
create_admin(app)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(chat_router,        prefix="/api")
app.include_router(strategy_router,    prefix="/api")
app.include_router(backtest_router,    prefix="/api")
app.include_router(trading_router,     prefix="/api")
app.include_router(market_router,      prefix="/api")   # legacy /api/assets/history
app.include_router(assets_router,      prefix="/api")   # data_assets platform
app.include_router(data_dashboard_router, prefix="/api")  # /api/data/status
app.include_router(data_admin_router, prefix="/api")  # /api/admin/data/*
app.include_router(connections_router, prefix="/api")
app.include_router(lightning_router,   prefix="/api")
app.include_router(auth_router,        prefix="/api")
app.include_router(portfolio_router,   prefix="/api")
app.include_router(orders_router,      prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "langstock-api", "version": "0.2.0"}


@app.get("/")
async def root():
    return {
        "message": "LangStock API",
        "docs":    "/docs",
        "admin":   "/admin",
        "version": "0.2.0",
    }
