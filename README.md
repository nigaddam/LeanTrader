# 🟢 LeanTrade — AI-Powered Algorithmic Trading Platform

> Chat with an AI agent to design, backtest, and deploy crypto trading strategies to Kraken.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [How It Works](#how-it-works)
- [Agent Tools Reference](#agent-tools-reference)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [Database Schema](#database-schema)
- [Development Roadmap](#development-roadmap)
- [Extending the Platform](#extending-the-platform)
- [Troubleshooting](#troubleshooting)

---

## Overview

LeanTrade is a conversational trading platform where users:

1. **Chat** with an AI trading agent about crypto assets
2. **Co-design** a trading strategy through natural dialogue
3. **Backtest** the strategy against 5 years of historical data (starting with $100)
4. **Deploy** the live strategy to Kraken with a single confirmation

The MVP focuses on Bitcoin (BTC/USD) with strategies based on SMA, RSI, and Bollinger Bands. The architecture is designed to scale to any asset and strategy type.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│  ChatInterface │ StrategyPanel │ BacktestChart │ Positions   │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                      BACKEND (FastAPI)                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LangChain Agent                         │    │
│  │  Tools: market_data │ generate_strategy │ backtest   │    │
│  │          deploy_kraken │ get_positions               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  strategies/generator.py    strategies/backtester.py        │
│  trading/kraken_executor.py models/db.py                    │
└──────────┬───────────────────────────┬──────────────────────┘
           │                           │
    ┌──────▼──────┐           ┌────────▼────────┐
    │  SQLite DB  │           │   Kraken API    │
    │  (→Postgres)│           │  (sandbox/live) │
    └─────────────┘           └─────────────────┘
```

---

## Project Structure

```
leantrade/
├── README.md
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── main.py                    # FastAPI app entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── agent.py               # LangChain agent setup
│   │   ├── tools.py               # Agent tool definitions
│   │   └── prompts.py             # System prompts
│   │
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── generator.py           # Natural language → Python strategy code
│   │   ├── backtester.py          # Runs backtest, returns chart data
│   │   └── templates/             # Strategy class templates
│   │       ├── sma.py
│   │       ├── rsi.py
│   │       └── bollinger.py
│   │
│   ├── trading/
│   │   ├── __init__.py
│   │   └── kraken_executor.py     # Live order execution on Kraken
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── db.py                  # SQLAlchemy models + DB init
│   │
│   └── api/
│       ├── __init__.py
│       ├── chat.py                # /api/chat endpoint
│       ├── strategy.py            # /api/strategy endpoints
│       ├── backtest.py            # /api/backtest endpoint
│       └── trading.py             # /api/deploy + /api/positions
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── Dockerfile
    ├── index.html
    │
    └── src/
        ├── App.jsx                # Root component + routing
        ├── main.jsx
        │
        ├── components/
        │   ├── ChatInterface.jsx  # Main chat window
        │   ├── MessageBubble.jsx  # Individual chat message
        │   ├── StrategyPanel.jsx  # Left sidebar: strategy details
        │   ├── BacktestChart.jsx  # Right panel: performance chart
        │   ├── PositionsPanel.jsx # Live positions view
        │   └── ConfirmDeploy.jsx  # Deploy confirmation modal
        │
        ├── hooks/
        │   ├── useChat.js         # Chat state + WebSocket logic
        │   ├── useStrategy.js     # Strategy state management
        │   └── useBacktest.js     # Backtest data fetching
        │
        ├── utils/
        │   └── api.js             # Axios API client
        │
        └── styles/
            └── globals.css        # Theme variables + base styles
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build |
| Docker | 24+ | Optional, for containerized run |
| Kraken Account | — | Get API keys at kraken.com |
| OpenAI API Key | — | For the OpenAI-powered agent |

---

## Setup & Installation

### Option A: Docker (Recommended)

```bash
git clone <repo>
cd leantrade
cp .env.example .env
# Fill in your API keys in .env
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Option B: Manual Local Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                     # Runs on http://localhost:3000
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Required
OPENAI_API_KEY=sk-...                 # OpenAI API key
OPENAI_MODEL=gpt-4o-mini              # OpenAI chat model

# Kraken (use sandbox keys for testing)
KRAKEN_API_KEY=your_kraken_key
KRAKEN_API_SECRET=your_kraken_secret
KRAKEN_SANDBOX=true                   # Set false ONLY for real trading

# Database
DATABASE_URL=sqlite:///./leantrade.db  # Change to postgres:// in production

# App
BACKEND_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:3000
```

**Getting Kraken Sandbox Keys:**
1. Go to https://demo-futures.kraken.com (Kraken demo environment)
2. Create account → API → Generate Key
3. Or use Kraken's paper trading via their Spot API with small test amounts

---

## Running Locally

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload

# Terminal 2: Frontend  
cd frontend && npm run dev

# Open http://localhost:3000
# Try: "Let's talk about Bitcoin"
```

---

## How It Works

### Conversation Flow

```
User: "Tell me about Bitcoin"
  → Agent calls get_market_data("BTC/USD")
  → Returns current price, 24h change, volume

User: "Should I buy now?"
  → Agent analyzes trend, suggests starting with SMA strategy

User: "Let's use RSI instead, more sophisticated"
  → Agent explains RSI, asks for parameters (period, overbought/oversold levels)

User: "RSI 14, sell at 70, buy at 30"
  → Agent calls generate_strategy(description, parameters)
  → Returns Python RSI strategy class
  → Saves to DB

User: "Backtest it"
  → Agent calls run_backtest("BTC/USD", strategy_id, "5y")
  → Returns chart data + metrics ($100 → $X)
  → Frontend renders interactive chart

User: "Looks good, let's go live"
  → Agent shows confirmation dialog
  → User types "CONFIRM"
  → Agent calls deploy_to_kraken(strategy_id)
  → Starts polling loop every 5 minutes
```

### Strategy Lifecycle

```
natural language description
        ↓
   generator.py (LLM-assisted code gen)
        ↓
   Python Strategy Class (saved to DB)
        ↓
   backtester.py (historical simulation)
        ↓
   chart + metrics returned to frontend
        ↓
   [user approves]
        ↓
   kraken_executor.py (live execution)
        ↓
   order logs saved to DB
```

---

## Agent Tools Reference

The LangChain agent has access to 5 tools:

### `get_market_data(ticker: str)`
Fetches current OHLCV data and market stats.
- **Input:** `"BTC/USD"`
- **Output:** `{ price, change_24h, volume, high_24h, low_24h }`
- **Source:** Kraken public API (no auth required)

### `generate_strategy(description: str, parameters: dict)`
Generates a Python strategy class from natural language.
- **Input:** `"RSI strategy, period 14, sell at 70, buy at 30"`
- **Output:** Python code string + strategy_id saved to DB
- **Templates:** SMA, RSI, Bollinger Bands (extend in `strategies/templates/`)

### `run_backtest(ticker: str, strategy_id: int, period: str)`
Backtests a strategy against historical data.
- **Input:** `("BTC/USD", 1, "5y")`
- **Output:** `{ metrics: {...}, chart_data: [...], trades: [...] }`
- **Metrics:** Final value, total return %, Sharpe ratio, max drawdown, win rate

### `deploy_to_kraken(strategy_id: int, amount_usd: float)`
Deploys strategy to live Kraken trading.
- **Requires:** Explicit user confirmation ("CONFIRM" in message)
- **Starts:** Background polling task every 5 minutes
- **Logs:** All orders to `orders` table in DB

### `get_kraken_positions()`
Returns current open positions and account balance.
- **Output:** `{ positions: [...], balance: {...} }`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message, get agent response |
| GET | `/api/strategy/{id}` | Get strategy details + code |
| GET | `/api/strategy/{id}/code` | Download .py file |
| POST | `/api/backtest` | Run backtest for strategy |
| GET | `/api/backtest/{id}` | Get backtest results |
| POST | `/api/deploy` | Deploy strategy to Kraken |
| DELETE | `/api/deploy/{id}` | Stop running strategy |
| GET | `/api/positions` | Get Kraken positions |
| GET | `/api/conversations/{session_id}` | Get conversation history |

**WebSocket:** `ws://localhost:8000/ws/chat/{session_id}` — for streaming responses

Full interactive docs at: http://localhost:8000/docs

---

## Frontend Components

### `ChatInterface.jsx`
- Manages chat session state
- Connects to WebSocket for streaming
- Renders `MessageBubble` for each message
- Contextual action buttons appear in agent messages:
  - "📊 Run Backtest" after strategy generation
  - "🚀 Deploy to Kraken" after successful backtest

### `StrategyPanel.jsx` (Left Sidebar)
- Displays current strategy name + parameters
- "View Code" → modal with syntax-highlighted Python
- "Download .py" button
- Shows backtest metrics summary if available

### `BacktestChart.jsx` (Right Panel)
- Line chart: portfolio value over time
- Green ▲ markers = buy signals
- Red ▼ markers = sell signals
- Stats cards: Final Value | Return % | Sharpe | Max Drawdown

### `PositionsPanel.jsx` (Live Mode)
- Active strategy status indicator
- Open positions with unrealized P&L
- "⏹ Stop Strategy" button with confirmation

---

## Database Schema

```sql
-- Conversation history
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    session_id TEXT NOT NULL,
    messages JSON NOT NULL,          -- Array of {role, content, timestamp}
    created_at DATETIME DEFAULT NOW
);

-- Generated strategies
CREATE TABLE strategies (
    id INTEGER PRIMARY KEY,
    session_id TEXT,
    name TEXT NOT NULL,              -- e.g. "RSI Strategy (14, 70, 30)"
    type TEXT NOT NULL,              -- sma | rsi | bollinger | custom
    code TEXT NOT NULL,              -- Full Python class code
    parameters JSON,                 -- {period: 14, overbought: 70, ...}
    created_at DATETIME DEFAULT NOW
);

-- Backtest runs
CREATE TABLE backtests (
    id INTEGER PRIMARY KEY,
    strategy_id INTEGER REFERENCES strategies(id),
    ticker TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    initial_capital FLOAT DEFAULT 100.0,
    final_value FLOAT,
    metrics JSON,                    -- {sharpe, drawdown, win_rate, ...}
    chart_data JSON,                 -- [{date, value, signal}]
    created_at DATETIME DEFAULT NOW
);

-- Live orders
CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    strategy_id INTEGER REFERENCES strategies(id),
    kraken_order_id TEXT,
    ticker TEXT,
    side TEXT,                       -- buy | sell
    amount FLOAT,
    price FLOAT,
    status TEXT,                     -- pending | filled | cancelled
    timestamp DATETIME DEFAULT NOW
);
```

---

## Development Roadmap

### ✅ MVP (Phase 1) — Build This First
- [ ] Project scaffolding + Docker setup
- [ ] FastAPI backend with all endpoints stubbed
- [ ] LangChain agent with 5 tools
- [ ] Strategy generator (SMA, RSI templates)
- [ ] Backtester with $100 simulation
- [ ] React chat interface
- [ ] Backtest chart component
- [ ] Kraken sandbox integration
- [ ] SQLite persistence

### 🔜 Phase 2 — Polish
- [ ] WebSocket streaming for agent responses
- [ ] More strategy types (MACD, Bollinger Bands, multi-indicator)
- [ ] Portfolio analytics dashboard
- [ ] Strategy comparison (run multiple backtests)
- [ ] Export strategy as standalone .py script
- [ ] Email alerts on trade execution

### 🚀 Phase 3 — Scale
- [ ] Switch SQLite → PostgreSQL
- [ ] Deploy to cloud (AWS/GCP) with Docker
- [ ] Multi-user auth (JWT)
- [ ] Support multiple assets and exchanges
- [ ] Real-time price streaming via Kraken WebSocket
- [ ] Strategy marketplace (share strategies between users)

---

## Extending the Platform

### Adding a New Strategy Type

1. Create template in `backend/strategies/templates/my_strategy.py`:
```python
class MyStrategy:
    def __init__(self, param1=20, param2=50):
        self.param1 = param1
        self.param2 = param2
    
    def generate_signals(self, df):
        # df columns: open, high, low, close, volume
        # Must return df with 'signal' column: 1=buy, -1=sell, 0=hold
        df['signal'] = 0
        # ... your logic here
        return df
```

2. Register it in `strategies/generator.py` in the `STRATEGY_TEMPLATES` dict
3. The agent will automatically be able to generate and backtest it

### Adding a New Exchange

1. Create `trading/new_exchange_executor.py` mirroring `kraken_executor.py`
2. Implement: `place_order()`, `get_positions()`, `cancel_order()`
3. Add exchange selection to the agent's `deploy_to_kraken` tool

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `OPENAI_API_KEY not found` | Check `.env` file is in project root and properly formatted |
| Kraken API 403 errors | Verify API key permissions include "Trade" scope |
| Backtest returns no data | yfinance may rate-limit; add `time.sleep(1)` between fetches |
| Frontend can't connect to backend | Check `VITE_API_URL` in frontend `.env` matches backend port |
| SQLite locked error | Restart backend; SQLite doesn't support concurrent writes well |
| Strategy code doesn't execute | Check generated code in DB; LLM may produce syntax errors — add try/catch in backtester |

---

## ⚠️ Disclaimer

**LeanTrade is for educational purposes only. This is not financial advice. Algorithmic trading involves substantial risk of loss. Never trade with money you cannot afford to lose. Always test thoroughly in sandbox/paper trading mode before using real funds.**

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

*Built with OpenAI · FastAPI · LangChain · React · Kraken*
