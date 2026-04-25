"""
LangChain agent setup for LeanTrade.
Uses Claude as the LLM with tool-calling for trading actions.
"""
from langchain_anthropic import ChatAnthropic
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from agent.tools import ALL_TOOLS
from agent.prompts import SYSTEM_PROMPT
import os


def build_agent() -> AgentExecutor:
    """Build and return the LangChain agent executor."""
    llm = ChatAnthropic(
        model="claude-sonnet-4-20250514",
        api_key=os.getenv("ANTHROPIC_API_KEY"),
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
    )

    return executor


def format_history(messages: list) -> list:
    """Convert DB message format to LangChain message objects."""
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
    return history


async def run_agent(user_message: str, conversation_history: list) -> str:
    """
    Run the agent with a user message and conversation history.
    Returns the agent's response as a string.
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

    return result.get("output", "I encountered an error processing your request.")
