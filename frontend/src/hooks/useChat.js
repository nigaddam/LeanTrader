import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendMessage } from '../utils/api'

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  content: `Welcome to **LeanTrade** 🟢

I'm your AI trading advisor. Let's build a profitable strategy together.

**What we can do:**
- Analyze any crypto asset (BTC, ETH, SOL...)
- Design custom trading strategies (SMA, RSI, Bollinger Bands)
- Backtest against 5 years of data — see what $100 becomes
- Deploy live to Kraken when you're ready

**Let's discuss your favourite stock today.** Which asset interests you?`,
  timestamp: new Date().toISOString(),
}

export function useChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [error, setError] = useState(null)

  // Track latest strategy/backtest IDs mentioned in responses
  const [latestStrategyId, setLatestStrategyId] = useState(null)
  const [latestBacktestId, setLatestBacktestId] = useState(null)
  const [deployedLiveId, setDeployedLiveId] = useState(null)

  const parseAgentMetadata = useCallback((responseText) => {
    // Extract strategy_id and backtest_id from agent responses if present
    const stratMatch = responseText.match(/strategy[_\s]id[:\s]+(\d+)/i)
    const btMatch = responseText.match(/backtest[_\s]id[:\s]+(\d+)/i)
    const liveMatch = responseText.match(/live[_\s]strategy[_\s]id[:\s]+(\d+)/i)

    if (stratMatch) setLatestStrategyId(parseInt(stratMatch[1]))
    if (btMatch) setLatestBacktestId(parseInt(btMatch[1]))
    if (liveMatch) setDeployedLiveId(parseInt(liveMatch[1]))
  }, [])

  const sendUserMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return

    const userMsg = {
      id: uuidv4(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    try {
      const data = await sendMessage(text, sessionId)

      const assistantMsg = {
        id: uuidv4(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
      }

      parseAgentMetadata(data.response)
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError('Failed to reach the trading agent. Is the backend running?')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, parseAgentMetadata])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setLatestStrategyId(null)
    setLatestBacktestId(null)
    setDeployedLiveId(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sessionId,
    latestStrategyId,
    latestBacktestId,
    deployedLiveId,
    sendUserMessage,
    clearChat,
  }
}
