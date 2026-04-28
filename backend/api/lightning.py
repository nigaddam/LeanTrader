"""Lightning / Alby connection endpoints."""
import json
import os
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from trading.lightning_credentials import (
    clear_alby_tokens,
    get_agent_wallet,
    get_alby_tokens,
    mask_identifier,
    set_alby_tokens,
)

router = APIRouter()

ALBY_API_BASE = "https://api.getalby.com"
ALBY_TOKEN_ENDPOINTS = (
    "https://api.getalby.com/oauth/token",
    "https://auth.alby.com/oauth/token",
)


class AlbyConnectRequest(BaseModel):
    access_token: str
    refresh_token: str = ""


class AlbyCodeExchangeRequest(BaseModel):
    code: str
    code_verifier: str = ""


def _load_alby_oauth_config() -> tuple[str, str, str]:
    client_id = os.getenv("ALBY_CLIENT_ID", "").strip()
    client_secret = os.getenv("ALBY_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv(
        "ALBY_REDIRECT_URI",
        "http://localhost:3000/connections/lightning/callback",
    ).strip()
    if not client_id:
        raise HTTPException(status_code=400, detail="ALBY_CLIENT_ID is missing.")
    if not client_secret:
        raise HTTPException(status_code=400, detail="ALBY_CLIENT_SECRET is missing.")
    return client_id, client_secret, redirect_uri


def _alby_get(endpoint: str, access_token: str) -> dict:
    req = Request(
        f"{ALBY_API_BASE}{endpoint}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": "LeanTrade/0.1",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8")
        raise HTTPException(status_code=exc.code, detail=f"Alby API error: {body}") from exc
    except URLError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Alby API: {exc.reason}") from exc


def _exchange_code_for_token(code: str, code_verifier: str) -> dict:
    client_id, client_secret, redirect_uri = _load_alby_oauth_config()
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret,
    }
    if code_verifier:
        payload["code_verifier"] = code_verifier

    encoded = urlencode(payload).encode("utf-8")
    last_error = "Alby token exchange failed."
    for endpoint in ALBY_TOKEN_ENDPOINTS:
        req = Request(
            endpoint,
            data=encoded,
            headers={
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "LeanTrade/0.1",
            },
            method="POST",
        )
        try:
            with urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8")
            last_error = f"Alby token exchange failed: {body}"
        except URLError as exc:
            last_error = f"Could not reach Alby OAuth endpoint: {exc.reason}"

    raise HTTPException(status_code=401, detail=last_error)


def _balance_sats(access_token: str) -> int:
    balance = _alby_get("/balance", access_token)
    return int(balance.get("balance") or 0)


def _account_identifier(access_token: str) -> str:
    account = _alby_get("/user/me", access_token)
    return (
        account.get("lightning_address")
        or account.get("identifier")
        or account.get("email")
        or account.get("keysend_pubkey")
        or "Alby wallet"
    )


def _status_payload() -> dict:
    tokens = get_alby_tokens()
    user_wallet = {"connected": False, "balance_sats": 0, "identifier": "", "identifier_preview": ""}
    if tokens:
        user_wallet = {
            "connected": True,
            "balance_sats": tokens.balance_sats,
            "identifier": tokens.identifier,
            "identifier_preview": mask_identifier(tokens.identifier),
        }
    return {
        "user_wallet": user_wallet,
        "agent_wallet": get_agent_wallet(),
    }


@router.get("/connections/lightning/config")
async def get_lightning_config():
    return {
        "client_id": os.getenv("ALBY_CLIENT_ID", ""),
        "redirect_uri": os.getenv(
            "ALBY_REDIRECT_URI",
            "http://localhost:3000/connections/lightning/callback",
        ),
        "scopes": ["account:read", "balance:read", "payments:send", "invoices:create", "invoices:read"],
    }


@router.post("/connections/lightning/alby/callback")
async def exchange_alby_code(request: AlbyCodeExchangeRequest):
    code = request.code.strip()
    if not code:
        raise HTTPException(status_code=400, detail="Alby OAuth code is required.")

    token = _exchange_code_for_token(code, request.code_verifier.strip())
    access_token = (token.get("access_token") or "").strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Alby did not return an access token.")

    identifier = _account_identifier(access_token)
    balance_sats = _balance_sats(access_token)
    refresh_token = token.get("refresh_token") or ""
    set_alby_tokens(access_token, refresh_token, identifier, balance_sats)
    return {
        "connected": True,
        "wallet_id": identifier,
        "identifier": identifier,
        "identifier_preview": mask_identifier(identifier),
        "balance_sats": balance_sats,
    }


@router.post("/connections/lightning/alby")
async def connect_alby(request: AlbyConnectRequest):
    access_token = request.access_token.strip()
    if not access_token:
        raise HTTPException(status_code=400, detail="Alby access token is required.")

    identifier = _account_identifier(access_token)
    balance_sats = _balance_sats(access_token)
    set_alby_tokens(access_token, request.refresh_token, identifier, balance_sats)
    return {
        "connected": True,
        "wallet_id": identifier,
        "identifier": identifier,
        "identifier_preview": mask_identifier(identifier),
        "balance_sats": balance_sats,
    }


@router.get("/connections/lightning/status")
async def get_lightning_status():
    tokens = get_alby_tokens()
    if tokens:
        try:
            tokens.balance_sats = _balance_sats(tokens.access_token)
        except HTTPException:
            pass
    return _status_payload()


@router.delete("/connections/lightning/alby")
async def disconnect_alby():
    clear_alby_tokens()
    return _status_payload()
