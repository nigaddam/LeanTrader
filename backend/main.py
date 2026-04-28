"""
LangStock FastAPI application entry point.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env before any module-level os.getenv() calls in imported files
load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.db import init_db
from api.chat import router as chat_router
from api.strategy import router as strategy_router
from api.backtest import router as backtest_router
from api.trading import router as trading_router
from api.market import router as market_router
from api.connections import router as connections_router
from api.lightning import router as lightning_router
from api.auth import router as auth_router
from admin import create_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("✅ Database initialized")
    yield
    print("👋 Shutting down LangStock")


app = FastAPI(
    title="LangStock API",
    description="AI-powered algorithmic trading platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Admin panel at /admin
create_admin(app)

# API routers
app.include_router(chat_router, prefix="/api")
app.include_router(strategy_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(trading_router, prefix="/api")
app.include_router(market_router, prefix="/api")
app.include_router(connections_router, prefix="/api")
app.include_router(lightning_router, prefix="/api")
app.include_router(auth_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "langstock-api"}


@app.get("/")
async def root():
    return {
        "message": "LangStock API",
        "docs": "/docs",
        "admin": "/admin",
        "version": "0.1.0",
    }
