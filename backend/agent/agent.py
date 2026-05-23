"""
LangChain agent setup for LeanTrade.
Uses OpenAI as the LLM with tool-calling for trading actions.
"""
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from agent.tools import ALL_TOOLS
from agent.prompts import SYSTEM_PROMPT
import json
import os


def build_agent() -> AgentExecutor:
    """Build and return the LangChain agent executor."""
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is missing. Add it to .env and restart the backend.")

    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        api_key=api_key,
        temperature=0.3,
        max_tokens=2000,
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    agent = create_tool_calling_agent(llm, ALL_TOOLS, prompt)

    executor = AgentExecutor(
        agent=agent,
        tools=ALL_TOOLS,
        verbose=True,
        max_iterations=5,
        handle_parsing_errors=True,
        return_intermediate_steps=True,
    )

    return executor


def extract_metadata(result: dict) -> dict:
    """Pull IDs returned by tools out of LangChain intermediate steps."""
    metadata = {}
    for _, observation in result.get("intermediate_steps", []):
        if not isinstance(observation, str):
            continue
        try:
            data = json.loads(observation)
        except json.JSONDecodeError:
            continue

        if data.get("strategy_id"):
            metadata["strategy_id"] = data["strategy_id"]
        if data.get("backtest_id"):
            metadata["backtest_id"] = data["backtest_id"]
        if data.get("live_strategy_id"):
            metadata["live_strategy_id"] = data["live_strategy_id"]
    return metadata


def format_history(messages: list) -> list:
    """Convert DB message format to LangChain message objects."""
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
    return history


async def run_agent(user_message: str, conversation_history: list) -> dict:
    """
    Run the agent with a user message and conversation history.
    Returns the agent response plus structured tool metadata.
    """
    executor = build_agent()
    chat_history = format_history(conversation_history)

    # Check for CONFIRM keyword — enables deploy tool
    confirmed = "CONFIRM" in user_message.upper()
    if confirmed:
        user_message = user_message + " [User has confirmed deployment with CONFIRM keyword]"

    result = await executor.ainvoke({
        "input": user_message,
        "chat_history": chat_history,
    })

    return {
        "response": result.get("output", "I encountered an error processing your request."),
        **extract_metadata(result),
    }
