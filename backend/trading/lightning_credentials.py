"""Server-side Lightning connection state.

MVP scope: tokens live in process memory only, matching the Kraken connector
pattern. They are never returned to the frontend.
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class AlbyTokens:
    access_token: str
    refresh_token: str = ""
    identifier: str = ""
    balance_sats: int = 0


_alby_tokens: Optional[AlbyTokens] = None


def set_alby_tokens(access_token: str, refresh_token: str = "", identifier: str = "", balance_sats: int = 0) -> AlbyTokens:
    global _alby_tokens
    _alby_tokens = AlbyTokens(
        access_token=access_token.strip(),
        refresh_token=(refresh_token or "").strip(),
        identifier=identifier,
        balance_sats=balance_sats,
    )
    return _alby_tokens


def get_alby_tokens() -> Optional[AlbyTokens]:
    return _alby_tokens


def clear_alby_tokens() -> None:
    global _alby_tokens
    _alby_tokens = None


def mask_identifier(identifier: str) -> str:
    if not identifier:
        return ""
    if len(identifier) <= 6:
        return "••••"
    return f"••••{identifier[-6:]}"


def get_agent_wallet() -> dict:
    address = os.getenv("ALBY_AGENT_WALLET_ADDRESS", "leantrade-agent@getalby.local")
    return {
        "address": address,
        "balance_sats": int(os.getenv("ALBY_AGENT_BALANCE_SATS", "0")),
    }
