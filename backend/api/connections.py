"""Connection management endpoints."""
import os
from fastapi import APIRouter, HTTPException
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


def _kraken_mode() -> str:
    return "SANDBOX" if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true" else "LIVE"


def _status_payload(connected: bool, key_preview: str = "", source: str = "") -> dict:
    return {
        "id": "kraken",
        "connected": connected,
        "mode": _kraken_mode(),
        "key_preview": key_preview,
        "source": source,
    }


@router.get("/connections/kraken")
async def get_kraken_status():
    creds = get_kraken_credentials()
    if not creds:
        return _status_payload(False)
    return _status_payload(True, mask_key(creds.api_key), creds.source)


@router.post("/connections/kraken")
async def connect_kraken(request: KrakenConnectRequest):
    api_key = request.api_key.strip()
    api_secret = request.api_secret.strip()
    if not api_key or not api_secret:
        raise HTTPException(status_code=400, detail="Kraken API key and private key are required.")

    client = krakenex.API(key=api_key, secret=api_secret)
    response = client.query_private("Balance")
    errors = response.get("error") or []
    if errors:
        raise HTTPException(
            status_code=401,
            detail=f"Kraken rejected these credentials: {', '.join(errors)}",
        )

    set_kraken_credentials(api_key, api_secret)
    balance = response.get("result", {})
    return {
        **_status_payload(True, mask_key(api_key), "session"),
        "balance_count": len(balance),
        "message": "Kraken connected. Credentials are stored on the backend for this server session only.",
    }


@router.delete("/connections/kraken")
async def disconnect_kraken():
    clear_kraken_credentials()
    return _status_payload(False)
