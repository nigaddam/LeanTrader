import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request if available
api.interceptors.request.use(config => {
  const token = localStorage.getItem('lt_auth_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
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

export const listAssets = async (params = {}) => {
  const res = await api.get('/api/assets', { params })
  return res.data
}

export const getAsset = async (symbol) => {
  const res = await api.get(`/api/assets/${symbol}`)
  return res.data
}

export const getAssetQuote = async (symbol) => {
  const res = await api.get(`/api/assets/${symbol}/quote`)
  return res.data
}

export const getAssetOHLCV = async (symbol, period = '1y') => {
  const res = await api.get(`/api/assets/${symbol}/history`, { params: { period } })
  return res.data
}

const adminConfig = (adminSecret) => adminSecret
  ? { headers: { 'X-Admin-Secret': adminSecret } }
  : {}

export const listAdminRuns = async (filters = {}, adminSecret = '') => {
  const res = await api.get('/api/admin/data/runs', { params: filters, ...adminConfig(adminSecret) })
  return res.data
}

export const listAdminAssets = async (filters = {}, adminSecret = '') => {
  const res = await api.get('/api/admin/data/assets', { params: filters, ...adminConfig(adminSecret) })
  return res.data
}

export const triggerAdminRefresh = async (assetType = '', adminSecret = '') => {
  const res = await api.post('/api/admin/data/refresh', null, {
    params: assetType ? { asset_type: assetType } : {},
    ...adminConfig(adminSecret),
  })
  return res.data
}

export const addAdminAsset = async (payload, adminSecret = '') => {
  const res = await api.post('/api/admin/data/assets', payload, adminConfig(adminSecret))
  return res.data
}

export const updateAdminAsset = async (symbol, payload, adminSecret = '') => {
  const res = await api.patch(`/api/admin/data/assets/${symbol}`, payload, adminConfig(adminSecret))
  return res.data
}

export const refreshAdminAsset = async (symbol, adminSecret = '') => {
  const res = await api.post(`/api/admin/data/assets/${symbol}/refresh`, null, adminConfig(adminSecret))
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

export const getKrakenPortfolio = async (range = '7D') => {
  const res = await api.get('/api/portfolio/kraken', { params: { range } })
  return res.data
}

export const listOrders = async (filters = {}) => {
  const res = await api.get('/api/orders', { params: filters })
  return res.data
}

export const listTradableAssets = async () => {
  const res = await api.get('/api/orders/tradable-assets')
  return res.data
}

export const getOrder = async (orderId) => {
  const res = await api.get(`/api/orders/${orderId}`)
  return res.data
}

export const createOrder = async (payload) => {
  const res = await api.post('/api/orders', payload)
  return res.data
}

export const cancelOrder = async (orderId) => {
  const res = await api.post(`/api/orders/${orderId}/cancel`)
  return res.data
}

export const deleteOrder = async (orderId) => {
  const res = await api.delete(`/api/orders/${orderId}`)
  return res.data
}

export const retryOrder = async (orderId) => {
  const res = await api.post(`/api/orders/${orderId}/retry`)
  return res.data
}

export const verifyOrder = async (orderId) => {
  const res = await api.post(`/api/orders/${orderId}/verify`)
  return res.data
}

export const getKrakenConnection = async () => {
  const res = await api.get('/api/connections/kraken/status')
  return res.data
}

export const connectKraken = async (apiKey, apiSecret) => {
  const res = await api.post('/api/connections/kraken/manual', {
    api_key: apiKey,
    api_secret: apiSecret,
  })
  return res.data
}

export const startKrakenOAuth = async () => {
  const res = await api.post('/api/connections/kraken/oauth/start', {})
  return res.data
}

export const disconnectKraken = async () => {
  const res = await api.post('/api/connections/kraken/disconnect')
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
