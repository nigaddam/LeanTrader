"""
LeanTrade FastAPI application entry point.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from models.db import init_db
from api.chat import router as chat_router
from api.strategy import router as strategy_router
from api.backtest import router as backtest_router
from api.trading import router as trading_router
from dotenv import load_dotenv

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Shutting down LeanTrade")


app = FastAPI(
    title="LeanTrade API",
    description="AI-powered algorithmic trading platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat_router, prefix="/api")
app.include_router(strategy_router, prefix="/api")
app.include_router(backtest_router, prefix="/api")
app.include_router(trading_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "leantrade-api"}


@app.get("/")
async def root():
    return {
        "message": "LeanTrade API",
        "docs": "/docs",
        "version": "0.1.0"
    }
