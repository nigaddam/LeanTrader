"""Server-side credential storage for broker connections.

MVP note: credentials are kept in process memory only. They are not written to
the database or returned to the frontend.
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class KrakenCredentials:
    api_key: str
    api_secret: str
    source: str = "session"


_kraken_credentials: Optional[KrakenCredentials] = None


def _env_credentials() -> Optional[KrakenCredentials]:
    api_key = os.getenv("KRAKEN_API_KEY", "").strip()
    api_secret = os.getenv("KRAKEN_API_SECRET", "").strip()
    if api_key and api_secret:
        return KrakenCredentials(api_key=api_key, api_secret=api_secret, source="env")
    return None


def set_kraken_credentials(api_key: str, api_secret: str) -> KrakenCredentials:
    global _kraken_credentials
    _kraken_credentials = KrakenCredentials(
        api_key=api_key.strip(),
        api_secret=api_secret.strip(),
        source="session",
    )
    return _kraken_credentials


def clear_kraken_credentials() -> None:
    global _kraken_credentials
    _kraken_credentials = None


def get_kraken_credentials() -> Optional[KrakenCredentials]:
    return _kraken_credentials or _env_credentials()


def has_kraken_credentials() -> bool:
    return get_kraken_credentials() is not None


def mask_key(api_key: str) -> str:
    if not api_key:
        return ""
    if len(api_key) <= 4:
        return "••••"
    return f"••••{api_key[-4:]}"
