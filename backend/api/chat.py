"""
Chat API endpoint — main interaction with the LangChain agent.
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from openai import AuthenticationError, OpenAIError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, Conversation, Session, Strategy, Backtest, LiveStrategy
from agent.agent import run_agent

router = APIRouter()

SESSION_TIMEOUT = timedelta(minutes=30)


def _user_id_from_request(request: Request) -> Optional[int]:
    """Parse Bearer JWT and return user_id, or None if unauthenticated."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from api.auth import decode_jwt
        from jose import JWTError
        payload = decode_jwt(auth[7:])
        return int(payload["sub"])
    except Exception:
        return None


async def _ensure_session(session_id: str, user_id: Optional[int], db: AsyncSession) -> Session:
    """
    Look up or create a Session row. Handles parent_session_id linking:
    if the same user has a session whose last_active_at is within SESSION_TIMEOUT,
    the new session is tagged as a continuation (parent_session_id set).
    """
    result = await db.execute(select(Session).where(Session.session_id == session_id))
    session = result.scalar_one_or_none()
    now = datetime.utcnow()

    if session is None:
        parent_session_id = None
        if user_id:
            last = await db.execute(
                select(Session)
                .where(Session.user_id == user_id)
                .where(Session.session_id != session_id)
                .order_by(Session.last_active_at.desc())
                .limit(1)
            )
            prev = last.scalar_one_or_none()
            if prev and (now - prev.last_active_at) < SESSION_TIMEOUT:
                parent_session_id = prev.session_id

        session = Session(
            session_id=session_id,
            user_id=user_id,
            parent_session_id=parent_session_id,
            started_at=now,
            last_active_at=now,
        )
        db.add(session)
    else:
        session.last_active_at = now
        if user_id and session.user_id is None:
            session.user_id = user_id

    return session


class ChatRequest(BaseModel):
    message: str
    session_id: str = None


class ChatResponse(BaseModel):
    response: str
    session_id: str
    strategy_id: Optional[int] = None
    backtest_id: Optional[int] = None
    live_strategy_id: Optional[int] = None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, http_request: Request, db: AsyncSession = Depends(get_db)):
    """Send a message to the trading agent and get a response."""

    user_id = _user_id_from_request(http_request)
    session_id = request.session_id or str(uuid.uuid4())

    # Register / update session
    await _ensure_session(session_id, user_id, db)

    # Load conversation history
    result = await db.execute(
        select(Conversation).where(Conversation.session_id == session_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(session_id=session_id, user_id=user_id)
        db.add(conversation)
        await db.flush()
    elif user_id and conversation.user_id is None:
        conversation.user_id = user_id

    history = conversation.get_messages()
    conversation.add_message("user", request.message)
    conversation.updated_at = datetime.utcnow()
    await db.commit()

    # Run agent
    try:
        agent_result = await run_agent(request.message, history)
    except AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="OpenAI rejected the API key. Update OPENAI_API_KEY in .env and restart the backend.",
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {exc}")

    response = agent_result["response"]
    strategy_id = agent_result.get("strategy_id")
    backtest_id = agent_result.get("backtest_id")
    live_strategy_id = agent_result.get("live_strategy_id")

    # Backfill session_id + user_id onto records the agent just created
    if strategy_id:
        row = await db.get(Strategy, strategy_id)
        if row:
            row.session_id = session_id
            if user_id:
                row.user_id = user_id

    if backtest_id:
        row = await db.get(Backtest, backtest_id)
        if row:
            row.session_id = session_id
            if user_id:
                row.user_id = user_id

    if live_strategy_id:
        row = await db.get(LiveStrategy, live_strategy_id)
        if row:
            row.session_id = session_id
            if user_id:
                row.user_id = user_id

    # Save assistant reply and update activity timestamp
    conversation.add_message("assistant", response)
    conversation.updated_at = datetime.utcnow()
    await db.commit()

    return ChatResponse(
        response=response,
        session_id=session_id,
        strategy_id=strategy_id,
        backtest_id=backtest_id,
        live_strategy_id=live_strategy_id,
    )


@router.get("/conversations")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    """List all conversation sessions ordered by most recent activity."""
    result = await db.execute(
        select(Conversation).order_by(Conversation.id.desc()).limit(30)
    )
    conversations = result.scalars().all()
    rows = []
    for conv in conversations:
        msgs = conv.get_messages()
        user_msgs = [m for m in msgs if m["role"] == "user"]
        first_user = user_msgs[0]["content"] if user_msgs else None
        preview = (first_user[:55] + "…") if first_user and len(first_user) > 55 else first_user
        rows.append({
            "session_id": conv.session_id,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": len(msgs),
            "preview": preview,
        })
    return rows


@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get full conversation history for a session."""
    result = await db.execute(
        select(Conversation).where(Conversation.session_id == session_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        return {"session_id": session_id, "messages": []}

    return {"session_id": session_id, "messages": conversation.get_messages()}


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for streaming chat.
    TODO: Implement streaming with LangChain callbacks.
    For now, runs agent and sends full response.
    """
    await websocket.accept()

    async for db in get_db():
        try:
            while True:
                data = await websocket.receive_text()

                result = await db.execute(
                    select(Conversation).where(Conversation.session_id == session_id)
                )
                conversation = result.scalar_one_or_none()

                if not conversation:
                    conversation = Conversation(session_id=session_id)
                    db.add(conversation)
                    await db.flush()

                history = conversation.get_messages()
                conversation.add_message("user", data)
                await db.commit()

                agent_result = await run_agent(data, history)
                response = agent_result["response"]

                conversation.add_message("assistant", response)
                await db.commit()

                await websocket.send_text(response)

        except WebSocketDisconnect:
            break
        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")
