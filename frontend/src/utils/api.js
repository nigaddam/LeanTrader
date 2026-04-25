import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const sendMessage = async (message, sessionId) => {
  const res = await api.post('/api/chat', { message, session_id: sessionId })
  return res.data
}

export const getConversation = async (sessionId) => {
  const res = await api.get(`/api/conversations/${sessionId}`)
  return res.data
}

export const getStrategy = async (strategyId) => {
  const res = await api.get(`/api/strategy/${strategyId}`)
  return res.data
}

export const getStrategyCode = async (strategyId) => {
  const res = await api.get(`/api/strategy/${strategyId}/code`)
  return res.data
}

export const runBacktest = async (strategyId, ticker = 'BTC/USD', period = '5y') => {
  const res = await api.post('/api/backtest', {
    strategy_id: strategyId,
    ticker,
    period,
    initial_capital: 100.0,
  })
  return res.data
}

export const getBacktest = async (backtestId) => {
  const res = await api.get(`/api/backtest/${backtestId}`)
  return res.data
}

export const deployStrategy = async (strategyId, amountUsd = 100) => {
  const res = await api.post('/api/deploy', {
    strategy_id: strategyId,
    amount_usd: amountUsd,
  })
  return res.data
}

export const stopStrategy = async (liveId) => {
  const res = await api.delete(`/api/deploy/${liveId}`)
  return res.data
}

export const getPositions = async () => {
  const res = await api.get('/api/positions')
  return res.data
}

export const createWebSocket = (sessionId) => {
  const wsBase = BASE_URL.replace('http', 'ws')
  return new WebSocket(`${wsBase}/ws/chat/${sessionId}`)
}

export default api
