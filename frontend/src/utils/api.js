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

export const listConversations = async () => {
  const res = await api.get('/api/conversations')
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

export const listStrategies = async () => {
  const res = await api.get('/api/strategies')
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

export const listBacktests = async () => {
  const res = await api.get('/api/backtests')
  return res.data
}

export const getAssetHistory = async (ticker, period = '3y') => {
  const res = await api.get('/api/assets/history', { params: { ticker, period } })
  return res.data
}

export const deployStrategy = async (strategyId, ticker = 'BTC/USD', amountUsd = 100, confirmLive = false) => {
  const res = await api.post('/api/deploy', {
    strategy_id: strategyId,
    ticker,
    amount_usd: amountUsd,
    confirm_live: confirmLive,
  })
  return res.data
}

export const stopStrategy = async (liveId) => {
  const res = await api.delete(`/api/deploy/${liveId}`)
  return res.data
}

export const listLiveStrategies = async () => {
  const res = await api.get('/api/live-strategies')
  return res.data
}

export const getLiveStrategy = async (liveId) => {
  const res = await api.get(`/api/live-strategies/${liveId}`)
  return res.data
}

export const getPositions = async () => {
  const res = await api.get('/api/positions')
  return res.data
}

export const getKrakenConnection = async () => {
  const res = await api.get('/api/connections/kraken')
  return res.data
}

export const connectKraken = async (apiKey, apiSecret) => {
  const res = await api.post('/api/connections/kraken', {
    api_key: apiKey,
    api_secret: apiSecret,
  })
  return res.data
}

export const disconnectKraken = async () => {
  const res = await api.delete('/api/connections/kraken')
  return res.data
}

export const getLightningConfig = async () => {
  const res = await api.get('/api/connections/lightning/config')
  return res.data
}

export const getLightningStatus = async () => {
  const res = await api.get('/api/connections/lightning/status')
  return res.data
}

export const connectAlby = async (accessToken, refreshToken = '') => {
  const res = await api.post('/api/connections/lightning/alby', {
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return res.data
}

export const exchangeAlbyCode = async (code, codeVerifier = '') => {
  const res = await api.post('/api/connections/lightning/alby/callback', {
    code,
    code_verifier: codeVerifier,
  })
  return res.data
}

export const disconnectAlby = async () => {
  const res = await api.delete('/api/connections/lightning/alby')
  return res.data
}

export const createWebSocket = (sessionId) => {
  const wsBase = BASE_URL.replace('http', 'ws')
  return new WebSocket(`${wsBase}/ws/chat/${sessionId}`)
}

export default api
