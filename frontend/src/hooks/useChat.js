import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { sendMessage, listConversations, getConversation } from '../utils/api'

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

**Let's discuss Bitcoin or another crypto asset today.** Which market interests you?`,
  timestamp: new Date().toISOString(),
}

export function useChat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => uuidv4())
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])

  const [latestStrategyId, setLatestStrategyId] = useState(null)
  const [latestBacktestId, setLatestBacktestId] = useState(null)
  const [deployedLiveId, setDeployedLiveId] = useState(null)

  const refreshSessions = useCallback(async () => {
    try {
      const data = await listConversations()
      setSessions(data)
    } catch (e) {
      console.error('Failed to load sessions', e)
    }
  }, [])

  const loadSession = useCallback(async (sid) => {
    if (!sid) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getConversation(sid)
      const loaded = (data.messages || []).map(m => ({
        id: uuidv4(),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date().toISOString(),
      }))
      setMessages(loaded.length ? loaded : [WELCOME_MESSAGE])
      setSessionId(sid)
      setLatestStrategyId(null)
      setLatestBacktestId(null)
    } catch (e) {
      setError('Failed to load chat session.')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const parseAgentMetadata = useCallback((responseText) => {
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
      if (data.strategy_id) setLatestStrategyId(data.strategy_id)
      if (data.backtest_id) setLatestBacktestId(data.backtest_id)
      if (data.live_strategy_id) setDeployedLiveId(data.live_strategy_id)
      setMessages(prev => [...prev, assistantMsg])

      // Refresh session list so the new session shows up in the sidebar
      refreshSessions()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reach the trading agent. Is the backend running?')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, sessionId, parseAgentMetadata, refreshSessions])

  const clearChat = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    setSessionId(uuidv4())
    setLatestStrategyId(null)
    setLatestBacktestId(null)
    setDeployedLiveId(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sessionId,
    sessions,
    latestStrategyId,
    latestBacktestId,
    deployedLiveId,
    sendUserMessage,
    clearChat,
    refreshSessions,
    loadSession,
  }
}
