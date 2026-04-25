"""
Chat API endpoint — main interaction with the LangChain agent.
"""
import uuid
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from models.db import get_db, Conversation
from agent.agent import run_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: str = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """Send a message to the trading agent and get a response."""

    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())

    # Load conversation history
    result = await db.execute(
        select(Conversation).where(Conversation.session_id == session_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        conversation = Conversation(session_id=session_id)
        db.add(conversation)
        await db.flush()

    history = conversation.get_messages()

    # Run agent
    response = await run_agent(request.message, history)

    # Save messages
    conversation.add_message("user", request.message)
    conversation.add_message("assistant", response)
    await db.commit()

    return ChatResponse(response=response, session_id=session_id)


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
                response = await run_agent(data, history)

                conversation.add_message("user", data)
                conversation.add_message("assistant", response)
                await db.commit()

                await websocket.send_text(response)

        except WebSocketDisconnect:
            break
        except Exception as e:
            await websocket.send_text(f"Error: {str(e)}")
