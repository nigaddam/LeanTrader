"""Connection management endpoints."""
import os
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import krakenex

from trading.credentials import (
    clear_kraken_credentials,
    get_kraken_credentials,
    mask_key,
    set_kraken_credentials,
)

router = APIRouter()


class KrakenConnectRequest(BaseModel):
    api_key: str
    api_secret: str


class KrakenOAuthStartRequest(BaseModel):
    redirect_uri: str | None = None


def _kraken_mode() -> str:
    return "SANDBOX" if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true" else "LIVE"


def _balance_from_client(client: krakenex.API) -> tuple[dict, list[str]]:
    response = client.query_private("Balance")
    errors = response.get("error") or []
    if errors:
        return {}, errors
    balance = {
        asset: float(value)
        for asset, value in response.get("result", {}).items()
        if float(value) > 0
    }
    return balance, []


def _status_payload(
    connected: bool,
    key_preview: str = "",
    source: str = "",
    balance: dict | None = None,
    errors: list[str] | None = None,
) -> dict:
    return {
        "id": "kraken",
        "connected": connected,
        "mode": _kraken_mode(),
        "key_preview": key_preview,
        "source": source,
        "paper_trading": os.getenv("KRAKEN_SANDBOX", "true").lower() == "true",
        "permissions": {
            "read_balances": connected,
            "read_positions": connected,
            "trade": False,
            "withdraw": False,
        },
        "balance": balance or {},
        "positions": [],
        "error": "; ".join(errors or []) if errors else "",
    }


@router.get("/connections/kraken")
async def get_kraken_status():
    return await get_kraken_connection_status()


@router.get("/connections/kraken/status")
async def get_kraken_connection_status():
    creds = get_kraken_credentials()
    if not creds:
        return _status_payload(False)
    client = krakenex.API(key=creds.api_key, secret=creds.api_secret)
    balance, errors = _balance_from_client(client)
    return _status_payload(True, mask_key(creds.api_key), creds.source, balance, errors)


@router.post("/connections/kraken")
async def connect_kraken(request: KrakenConnectRequest):
    return await connect_kraken_manually(request)


@router.post("/connections/kraken/manual")
async def connect_kraken_manually(request: KrakenConnectRequest):
    api_key = request.api_key.strip()
    api_secret = request.api_secret.strip()
    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="Kraken API key and private key are required.")

    client = krakenex.API(key=api_key, secret=api_secret)
    balance, errors = _balance_from_client(client)
    if errors:
        raise HTTPException(
            status_code=401,
            detail=f"Kraken rejected these credentials: {', '.join(errors)}",
        )

    set_kraken_credentials(api_key, api_secret)
    return {
        **_status_payload(True, mask_key(api_key), "session", balance),
        "balance_count": len(balance),
        "message": "Kraken connected. Credentials are stored server-side for this local server session only.",
        "storage": "server_session",
    }


@router.delete("/connections/kraken")
async def disconnect_kraken():
    return await disconnect_kraken_connection()


@router.post("/connections/kraken/disconnect")
async def disconnect_kraken_connection():
    clear_kraken_credentials()
    return _status_payload(False)


@router.post("/connections/kraken/oauth/start")
async def start_kraken_oauth(request: KrakenOAuthStartRequest):
    """
    Prepare the Kraken OAuth flow.

    Kraken OAuth/Connect requires app registration credentials. The product flow is
    scaffolded here, but local dev falls back to manual API keys until those
    credentials are configured.
    """
    client_id = os.getenv("KRAKEN_OAUTH_CLIENT_ID", "").strip()
    auth_url = os.getenv("KRAKEN_OAUTH_AUTH_URL", "").strip()
    scope = os.getenv("KRAKEN_OAUTH_SCOPE", "balance openpositions").strip()

    if not client_id or not auth_url:
        return {
            "available": False,
            "setup_required": True,
            "message": (
                "Kraken login connection is not configured yet. For now, use manual API key setup."
            ),
            "fallback": "manual_api_key",
            "requested_permissions": ["balance/funds", "open positions/trades"],
            "withdraw_permissions_requested": False,
        }

    redirect_uri = request.redirect_uri or os.getenv(
        "KRAKEN_OAUTH_REDIRECT_URI",
        "http://localhost:8000/api/connections/kraken/oauth/callback",
    )
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
    }
    return {
        "available": True,
        "authorization_url": f"{auth_url}?{urlencode(params)}",
        "requested_permissions": ["balance/funds", "open positions/trades"],
        "withdraw_permissions_requested": False,
    }


@router.get("/connections/kraken/oauth/callback")
async def kraken_oauth_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Kraken OAuth callback did not include an authorization code.")
    raise HTTPException(
        status_code=501,
        detail="Kraken OAuth token exchange is not configured yet. Use manual API key connection for the MVP.",
    )
