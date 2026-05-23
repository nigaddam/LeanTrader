"""Order audit trail endpoints."""
import json
import os
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.db import Order, Strategy, get_db

router = APIRouter()


VALID_STATUSES = {"draft", "placed", "submitted", "filled", "partially_filled", "cancelled", "failed"}
VALID_MODES = {"paper", "live"}
VALID_SIDES = {"buy", "sell"}
VALID_ORDER_TYPES = {"market", "limit"}

TRADE_ASSETS = [
    {"asset_name": "Bitcoin", "ticker": "BTC", "kraken_pair": "XXBTZUSD", "source": "Kraken"},
    {"asset_name": "Ethereum", "ticker": "ETH", "kraken_pair": "XETHZUSD", "source": "Kraken"},
    {"asset_name": "USD Coin", "ticker": "USDC", "kraken_pair": "USDCUSD", "source": "Kraken"},
    {"asset_name": "Tether", "ticker": "USDT", "kraken_pair": "USDTUSD", "source": "Kraken"},
    {"asset_name": "Solana", "ticker": "SOL", "kraken_pair": "SOLUSD", "source": "Kraken"},
    {"asset_name": "XRP", "ticker": "XRP", "kraken_pair": "XXRPZUSD", "source": "Kraken"},
    {"asset_name": "Cardano", "ticker": "ADA", "kraken_pair": "ADAUSD", "source": "Kraken"},
    {"asset_name": "Dogecoin", "ticker": "DOGE", "kraken_pair": "XDGUSD", "source": "Kraken"},
    {"asset_name": "Chainlink", "ticker": "LINK", "kraken_pair": "LINKUSD", "source": "Kraken"},
    {"asset_name": "Litecoin", "ticker": "LTC", "kraken_pair": "XLTCZUSD", "source": "Kraken"},
]

ASSET_BY_TICKER = {asset["ticker"]: asset for asset in TRADE_ASSETS}
ASSET_ALIASES = {
    "BITCOIN": "BTC",
    "ETHEREUM": "ETH",
    "USDCOIN": "USDC",
    "USD": "USDC",
    "TETHER": "USDT",
    "SOLANA": "SOL",
    "CARDANO": "ADA",
    "DOGECOIN": "DOGE",
    "CHAINLINK": "LINK",
    "LITECOIN": "LTC",
}


class OrderCreateRequest(BaseModel):
    asset_name: str = ""
    ticker: str
    source: str = "Kraken"
    side: str
    quantity: float
    order_type: str = "market"
    limit_price: Optional[float] = None
    estimated_value: Optional[float] = None
    mode: str = "paper"
    status: str = "draft"
    session_id: Optional[str] = None
    strategy_id: Optional[int] = None
    strategy_name: Optional[str] = None
    notes: str = ""
    raw_request_json: dict = Field(default_factory=dict)


def _current_price_usd(kraken_pair: str) -> Optional[float]:
    try:
        import krakenex
        response = krakenex.API().query_public("Ticker", {"pair": kraken_pair})
        if response.get("error"):
            return None
        return float(next(iter(response["result"].values()))["c"][0])
    except Exception:
        return None


def _trade_mode() -> str:
    return "paper" if os.getenv("KRAKEN_SANDBOX", "true").lower() == "true" else "live"


def _normalize_ticker(ticker: str) -> str:
    normalized = (ticker or "").upper().replace("/USD", "").replace("-USD", "").replace(" ", "").strip()
    return ASSET_ALIASES.get(normalized, normalized)


def parse_trade_instruction(message: str) -> Optional[dict]:
    """Recognize simple chat orders like 'buy $10 of USDC'."""
    text = (message or "").strip()
    amount_pattern = re.compile(
        r"\b(?P<side>buy|sell)\b\s+(?:\$)?(?P<amount>\d+(?:\.\d+)?)\s*(?:usd|dollars|\$)?\s*(?:of|in)?\s*(?P<ticker>[a-zA-Z]{2,10})\b",
        re.IGNORECASE,
    )
    match = amount_pattern.search(text)
    if match:
        side = match.group("side").lower()
        amount_usd = float(match.group("amount"))
        ticker = _normalize_ticker(match.group("ticker"))
    else:
        simple_pattern = re.compile(
            r"\b(?P<side>buy|sell)\b\s+(?:some\s+|a\s+little\s+)?(?P<ticker>bitcoin|ethereum|solana|cardano|dogecoin|chainlink|litecoin|[a-zA-Z]{2,10})\b",
            re.IGNORECASE,
        )
        match = simple_pattern.search(text)
        if not match:
            return None
        side = match.group("side").lower()
        amount_usd = 10.0
        ticker = _normalize_ticker(match.group("ticker"))
    asset = ASSET_BY_TICKER.get(ticker)
    if not asset:
        return None
    return {
        "side": side,
        "amount_usd": amount_usd,
        "ticker": ticker,
        "asset_name": asset["asset_name"],
        "source": asset["source"],
        "kraken_pair": asset["kraken_pair"],
    }


def _user_id_from_request(request: Request) -> Optional[int]:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from api.auth import decode_jwt
        payload = decode_jwt(auth[7:])
        return int(payload["sub"])
    except Exception:
        return None


def _serialize_order(order: Order) -> dict:
    created = order.created_at or order.timestamp
    updated = order.updated_at or created
    return {
        "id": order.id,
        "created_at": created,
        "updated_at": updated,
        "user_id": order.user_id,
        "asset_name": order.asset_name or order.ticker,
        "ticker": order.ticker,
        "source": order.source or "Kraken",
        "side": order.side,
        "quantity": order.quantity if order.quantity is not None else order.amount,
        "order_type": order.order_type or "market",
        "limit_price": order.limit_price,
        "estimated_value": order.estimated_value if order.estimated_value is not None else order.amount,
        "mode": order.mode or "paper",
        "status": order.status or "draft",
        "strategy_id": order.strategy_id,
        "strategy_name": order.strategy_name,
        "external_order_id": order.external_order_id or order.kraken_order_id,
        "raw_request_json": order.raw_request(),
        "raw_response_json": order.raw_response(),
        "notes": order.notes or "",
    }


def _execute_live_kraken_order(
    order: "Order",
    ticker: str,
    side: str,
    order_type: str,
    quantity: float,
    limit_price: Optional[float],
) -> None:
    """Place a real order on Kraken and mutate `order` with the result.

    Raises ValueError on missing credentials or any Kraken API error so that
    the caller's except block can mark the order as failed.
    """
    import krakenex
    from trading.credentials import get_kraken_credentials

    creds = get_kraken_credentials()
    if not creds:
        raise ValueError("No Kraken credentials configured. Connect Kraken first.")

    asset_info = ASSET_BY_TICKER.get(ticker.upper())
    if not asset_info:
        raise ValueError(f"Unknown ticker '{ticker}'. Cannot determine Kraken pair.")

    params: dict = {
        "pair": asset_info["kraken_pair"],
        "type": side,
        "ordertype": order_type,
        "volume": str(round(quantity, 8)),
    }
    if order_type == "limit" and limit_price:
        params["price"] = str(limit_price)

    client = krakenex.API(key=creds.api_key, secret=creds.api_secret)
    response = client.query_private("AddOrder", params)

    errors = response.get("error") or []
    if errors:
        raise ValueError(f"Kraken rejected order: {'; '.join(errors)}")

    result = response.get("result", {})
    txids = result.get("txid", [])
    order.status = "placed"
    order.external_order_id = txids[0] if txids else None
    order.raw_response_json = json.dumps(result)
    order.notes = order.notes or f"Placed on Kraken. TxID: {txids[0] if txids else 'unknown'}"


async def create_audit_order(
    db: AsyncSession,
    *,
    asset_name: str,
    ticker: str,
    source: str,
    side: str,
    quantity: float,
    order_type: str = "market",
    limit_price: Optional[float] = None,
    estimated_value: Optional[float] = None,
    mode: str = "paper",
    status: str = "draft",
    strategy_id: Optional[int] = None,
    strategy_name: Optional[str] = None,
    user_id: Optional[int] = None,
    session_id: Optional[str] = None,
    notes: str = "",
    raw_request_json: Optional[dict] = None,
) -> Order:
    now = datetime.utcnow()
    order = Order(
        created_at=now,
        updated_at=now,
        user_id=user_id,
        session_id=session_id,
        asset_name=asset_name or ticker,
        ticker=ticker.upper(),
        source=source,
        side=side,
        quantity=quantity,
        order_type=order_type,
        limit_price=limit_price,
        estimated_value=estimated_value,
        mode=mode,
        status=status,
        strategy_id=strategy_id,
        strategy_name=strategy_name,
        raw_request_json=json.dumps(raw_request_json or {}),
        notes=notes,
        amount=estimated_value,
        price=limit_price,
        timestamp=now,
    )
    db.add(order)
    await db.flush()

    try:
        if mode == "paper":
            order.status = "filled"
            order.external_order_id = f"paper_{order.id}"
            order.raw_response_json = json.dumps({"simulated": True, "status": "filled"})
            order.notes = order.notes or "Paper order simulated by LangStock."
        else:
            _execute_live_kraken_order(order, ticker, side, order_type, quantity, limit_price)
        order.updated_at = datetime.utcnow()
    except Exception as exc:
        order.status = "failed"
        order.raw_response_json = json.dumps({"error": str(exc)})
        order.notes = f"{order.notes}\n{exc}".strip()
        order.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(order)
    return order


def build_chat_trade_intent(message: str) -> Optional[dict]:
    parsed = parse_trade_instruction(message)
    if not parsed:
        return None
    price = _current_price_usd(parsed["kraken_pair"]) or 1.0
    quantity = parsed["amount_usd"] / price if price > 0 else parsed["amount_usd"]
    return {
        "asset_name": parsed["asset_name"],
        "ticker": parsed["ticker"],
        "source": parsed["source"],
        "side": parsed["side"],
        "amount_usd": parsed["amount_usd"],
        "quantity": quantity,
        "order_type": "market",
        "limit_price": None,
        "mode": _trade_mode(),
        "estimated_price_usd": price,
        "kraken_pair": parsed["kraken_pair"],
    }


async def create_chat_trade_order(db: AsyncSession, message: str, user_id: Optional[int] = None) -> Optional[dict]:
    intent = build_chat_trade_intent(message)
    if not intent:
        return None
    order = await create_audit_order(
        db,
        asset_name=intent["asset_name"],
        ticker=intent["ticker"],
        source=intent["source"],
        side=intent["side"],
        quantity=intent["quantity"],
        order_type=intent["order_type"],
        estimated_value=intent["amount_usd"],
        mode=intent["mode"],
        user_id=user_id,
        notes="Created from chat instruction.",
        raw_request_json={"channel": "chat", "message": message, "estimated_price_usd": intent["estimated_price_usd"]},
    )
    return _serialize_order(order)


@router.get("/orders")
async def list_orders(
    source: Optional[str] = None,
    mode: Optional[str] = None,
    status: Optional[str] = None,
    side: Optional[str] = None,
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Order).order_by(Order.id.desc()).limit(200)
    result = await db.execute(stmt)
    orders = [_serialize_order(order) for order in result.scalars().all()]

    def matches(order: dict) -> bool:
        if source and order["source"].lower() != source.lower():
            return False
        if mode and order["mode"].lower() != mode.lower():
            return False
        if status and order["status"].lower() != status.lower():
            return False
        if side and order["side"].lower() != side.lower():
            return False
        if q:
            needle = q.lower()
            return needle in (order["ticker"] or "").lower() or needle in (order["asset_name"] or "").lower()
        return True

    return [order for order in orders if matches(order)]


@router.get("/orders/tradable-assets")
async def list_tradable_assets():
    rows = []
    for asset in TRADE_ASSETS:
        price = _current_price_usd(asset["kraken_pair"])
        rows.append({**asset, "price_usd": price})
    return {
        "source": "Kraken",
        "mode": _trade_mode(),
        "assets": rows,
        "updated_at": datetime.utcnow().isoformat(),
    }


@router.get("/orders/{order_id}")
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _serialize_order(order)


@router.post("/orders")
async def create_order(payload: OrderCreateRequest, request: Request, db: AsyncSession = Depends(get_db)):
    side = payload.side.lower()
    order_type = payload.order_type.lower()
    mode = payload.mode.lower()
    if side not in VALID_SIDES:
        raise HTTPException(status_code=400, detail="side must be buy or sell")
    if order_type not in VALID_ORDER_TYPES:
        raise HTTPException(status_code=400, detail="order_type must be market or limit")
    if mode not in VALID_MODES:
        raise HTTPException(status_code=400, detail="mode must be paper or live")
    if payload.quantity <= 0:
        raise HTTPException(status_code=400, detail="quantity must be greater than zero")

    strategy_name = payload.strategy_name
    if payload.strategy_id and not strategy_name:
        strategy = await db.get(Strategy, payload.strategy_id)
        strategy_name = strategy.name if strategy else None

    order = await create_audit_order(
        db,
        user_id=_user_id_from_request(request),
        session_id=payload.session_id,
        asset_name=payload.asset_name or payload.ticker,
        ticker=payload.ticker.upper(),
        source=payload.source,
        side=side,
        quantity=payload.quantity,
        order_type=order_type,
        limit_price=payload.limit_price,
        estimated_value=payload.estimated_value,
        mode=mode,
        status=payload.status.lower() if payload.status.lower() in VALID_STATUSES else "draft",
        strategy_id=payload.strategy_id,
        strategy_name=strategy_name,
        notes=payload.notes,
        raw_request_json=payload.raw_request_json or payload.model_dump(),
    )
    return _serialize_order(order)


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in {"filled", "cancelled"}:
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order with status {order.status}.")

    kraken_cancel_result = {}
    if order.mode == "live" and order.external_order_id:
        try:
            import krakenex
            from trading.credentials import get_kraken_credentials
            creds = get_kraken_credentials()
            if creds:
                client = krakenex.API(key=creds.api_key, secret=creds.api_secret)
                resp = client.query_private("CancelOrder", {"txid": order.external_order_id})
                kraken_cancel_result = resp.get("result", {})
        except Exception as exc:
            kraken_cancel_result = {"cancel_error": str(exc)}

    order.status = "cancelled"
    order.updated_at = datetime.utcnow()
    raw = order.raw_response()
    raw["cancelled_by"] = "LangStock"
    if kraken_cancel_result:
        raw["kraken_cancel"] = kraken_cancel_result
    order.raw_response_json = json.dumps(raw)
    await db.commit()
    await db.refresh(order)
    return _serialize_order(order)


@router.post("/orders/{order_id}/verify")
async def verify_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Query Kraken for the current status of a placed live order and update our record."""
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.mode == "paper":
        raise HTTPException(status_code=400, detail="Paper orders are simulated — no Kraken record to verify.")
    if not order.external_order_id:
        raise HTTPException(status_code=400, detail="Order has no Kraken TxID to look up.")

    try:
        import krakenex
        from trading.credentials import get_kraken_credentials
        creds = get_kraken_credentials()
        if not creds:
            raise HTTPException(status_code=503, detail="No Kraken credentials configured.")

        client = krakenex.API(key=creds.api_key, secret=creds.api_secret)
        resp = client.query_private("QueryOrders", {"txid": order.external_order_id, "trades": True})
        errors = resp.get("error") or []
        if errors:
            raise HTTPException(status_code=502, detail=f"Kraken error: {'; '.join(errors)}")

        order_info = resp.get("result", {}).get(order.external_order_id, {})
        kraken_status = order_info.get("status", "")

        # Kraken statuses: pending | open | closed | canceled | expired
        if kraken_status == "closed":
            order.status = "filled"
        elif kraken_status == "canceled":
            order.status = "cancelled"
        elif kraken_status in ("pending", "open"):
            order.status = "placed"
        # expired or unknown: leave as-is

        order.raw_response_json = json.dumps(order_info)
        order.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(order)
        return _serialize_order(order)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/orders/{order_id}")
async def delete_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.delete(order)
    await db.commit()
    return {"deleted": order_id}


@router.post("/orders/{order_id}/retry")
async def retry_order(order_id: int, db: AsyncSession = Depends(get_db)):
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "failed":
        raise HTTPException(status_code=400, detail="Only failed orders can be retried.")
    order.status = "submitted" if (order.mode or "paper") == "live" else "filled"
    order.updated_at = datetime.utcnow()
    response = order.raw_response()
    response["retry"] = {"status": order.status, "timestamp": datetime.utcnow().isoformat()}
    order.raw_response_json = json.dumps(response)
    await db.commit()
    await db.refresh(order)
    return _serialize_order(order)
