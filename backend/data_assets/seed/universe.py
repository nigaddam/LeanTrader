"""Static asset universe — 25 stocks, 5 ETFs, 10 crypto.

Each entry describes one logical asset and its per-provider source symbols.
Add new assets here; seeder.py will insert them on next startup.

Fields:
- symbol: product-facing ticker
- display_name: friendly name
- asset_type: stock | etf | crypto
- default_source: provider used for primary quote/history
- enabled: included in local/dev asset universe
- production_enabled: included in production refresh and product surfaces
- sources: provider/broker mappings
"""

CORE_ASSET_UNIVERSE = [
    # ── Mega-cap stocks ───────────────────────────────────────────────────────
    {"symbol": "AAPL",  "display_name": "Apple",                 "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "AAPL",  "tradable": False}]},
    {"symbol": "MSFT",  "display_name": "Microsoft",             "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "MSFT",  "tradable": False}]},
    {"symbol": "NVDA",  "display_name": "NVIDIA",                "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "NVDA",  "tradable": False}]},
    {"symbol": "AMZN",  "display_name": "Amazon",                "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "AMZN",  "tradable": False}]},
    {"symbol": "GOOGL", "display_name": "Alphabet",              "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "GOOGL", "tradable": False}]},
    {"symbol": "META",  "display_name": "Meta Platforms",        "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "META",  "tradable": False}]},
    {"symbol": "TSLA",  "display_name": "Tesla",                 "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "TSLA",  "tradable": False}]},
    {"symbol": "AVGO",  "display_name": "Broadcom",              "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "AVGO",  "tradable": False}]},
    {"symbol": "BRKB",  "display_name": "Berkshire Hathaway B",  "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "BRK-B", "tradable": False}]},
    {"symbol": "JPM",   "display_name": "JPMorgan Chase",        "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "JPM",   "tradable": False}]},
    {"symbol": "LLY",   "display_name": "Eli Lilly",             "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "LLY",   "tradable": False}]},
    {"symbol": "V",     "display_name": "Visa",                  "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "V",     "tradable": False}]},
    {"symbol": "XOM",   "display_name": "ExxonMobil",            "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "XOM",   "tradable": False}]},
    {"symbol": "UNH",   "display_name": "UnitedHealth",          "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "UNH",   "tradable": False}]},
    {"symbol": "MA",    "display_name": "Mastercard",            "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "MA",    "tradable": False}]},
    {"symbol": "COST",  "display_name": "Costco",                "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "COST",  "tradable": False}]},
    {"symbol": "HD",    "display_name": "Home Depot",            "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "HD",    "tradable": False}]},
    {"symbol": "PG",    "display_name": "Procter & Gamble",      "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "PG",    "tradable": False}]},
    {"symbol": "NFLX",  "display_name": "Netflix",               "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "NFLX",  "tradable": False}]},
    {"symbol": "JNJ",   "display_name": "Johnson & Johnson",     "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "JNJ",   "tradable": False}]},
    {"symbol": "ABBV",  "display_name": "AbbVie",                "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "ABBV",  "tradable": False}]},
    {"symbol": "BAC",   "display_name": "Bank of America",       "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "BAC",   "tradable": False}]},
    {"symbol": "CRM",   "display_name": "Salesforce",            "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "CRM",   "tradable": False}]},
    {"symbol": "ORCL",  "display_name": "Oracle",                "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "ORCL",  "tradable": False}]},
    {"symbol": "AMD",   "display_name": "AMD",                   "asset_type": "stock", "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "AMD",   "tradable": False}]},

    # ── ETFs ──────────────────────────────────────────────────────────────────
    {"symbol": "SPY",   "display_name": "SPDR S&P 500 ETF",      "asset_type": "etf",   "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "SPY",   "tradable": False}]},
    {"symbol": "QQQ",   "display_name": "Invesco QQQ (Nasdaq)",  "asset_type": "etf",   "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "QQQ",   "tradable": False}]},
    {"symbol": "VTI",   "display_name": "Vanguard Total Market", "asset_type": "etf",   "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "VTI",   "tradable": False}]},
    {"symbol": "IWM",   "display_name": "iShares Russell 2000",  "asset_type": "etf",   "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "IWM",   "tradable": False}]},
    {"symbol": "GLD",   "display_name": "SPDR Gold Shares",      "asset_type": "etf",   "default_source": "yfinance", "sources": [{"source_name": "yfinance", "source_symbol": "GLD",   "tradable": False}]},

    # ── Crypto ────────────────────────────────────────────────────────────────
    {"symbol": "BTC",  "display_name": "Bitcoin",  "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "XXBTZUSD", "tradable": True},
        {"source_name": "yfinance", "source_symbol": "BTC-USD",  "tradable": False},
    ]},
    {"symbol": "ETH",  "display_name": "Ethereum", "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "XETHZUSD", "tradable": True},
        {"source_name": "yfinance", "source_symbol": "ETH-USD",  "tradable": False},
    ]},
    {"symbol": "SOL",  "display_name": "Solana",   "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "SOLUSD",   "tradable": True},
        {"source_name": "yfinance", "source_symbol": "SOL-USD",  "tradable": False},
    ]},
    {"symbol": "XRP",  "display_name": "XRP",      "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "XXRPZUSD", "tradable": True},
        {"source_name": "yfinance", "source_symbol": "XRP-USD",  "tradable": False},
    ]},
    {"symbol": "DOGE", "display_name": "Dogecoin", "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "XDGUSD",   "tradable": True},
        {"source_name": "yfinance", "source_symbol": "DOGE-USD", "tradable": False},
    ]},
    {"symbol": "ADA",  "display_name": "Cardano",  "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "ADAUSD",   "tradable": True},
        {"source_name": "yfinance", "source_symbol": "ADA-USD",  "tradable": False},
    ]},
    {"symbol": "LINK", "display_name": "Chainlink","asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "LINKUSD",  "tradable": True},
        {"source_name": "yfinance", "source_symbol": "LINK-USD", "tradable": False},
    ]},
    {"symbol": "LTC",  "display_name": "Litecoin", "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "XLTCZUSD", "tradable": True},
        {"source_name": "yfinance", "source_symbol": "LTC-USD",  "tradable": False},
    ]},
    {"symbol": "USDC", "display_name": "USD Coin", "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "USDCUSD",  "tradable": True},
        {"source_name": "yfinance", "source_symbol": "USDC-USD", "tradable": False},
    ]},
    {"symbol": "USDT", "display_name": "Tether",   "asset_type": "crypto", "default_source": "kraken", "sources": [
        {"source_name": "kraken",   "source_symbol": "USDTUSD",  "tradable": True},
        {"source_name": "yfinance", "source_symbol": "USDT-USD", "tradable": False},
    ]},
]


# Add the next 10 launch favorites here. The seeder is idempotent, so adding
# entries later updates the DB without creating duplicate asset rows.
FAVORITE_STOCKS = [
    # Example:
    # {"symbol": "PLTR", "display_name": "Palantir", "asset_type": "stock", "default_source": "yfinance", "sources": [
    #     {"source_name": "yfinance", "source_symbol": "PLTR", "tradable": False},
    # ]},
]


def _with_launch_defaults(entry: dict) -> dict:
    return {
        **entry,
        "enabled": entry.get("enabled", True),
        "production_enabled": entry.get("production_enabled", True),
    }


ASSET_UNIVERSE = [_with_launch_defaults(entry) for entry in [*CORE_ASSET_UNIVERSE, *FAVORITE_STOCKS]]
