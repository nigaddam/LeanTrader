import React, { useState, useEffect, useCallback } from 'react'
import { Menu } from 'lucide-react'
import { useAuth } from './hooks/useAuth'
import ChatInterface from './components/ChatInterface'
import BacktestChart from './components/BacktestChart'
import ModelsPanel from './components/ModelsPanel'
import LiveTradingPanel from './components/LiveTradingPanel'
import ActiveContextBar from './components/ActiveContextBar'
import AssetsPanel from './components/AssetsPanel'
import ConnectionsPanel from './components/ConnectionsPanel'
import Sidebar from './components/Sidebar'
import { useChat } from './hooks/useChat'
import { useStrategy, useBacktest, useModels } from './hooks/useStrategy'
import { useLiveTrading } from './hooks/useLiveTrading'
import { CONNECTORS } from './constants/connections'
import { connectKraken, disconnectAlby, getKrakenConnection, getLightningStatus } from './utils/api'

const CONNECTIONS_KEY = 'lt_connections'

const loadConnectionState = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || '{}')
    const sanitized = Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => {
        const { apiKey, apiSecret, secret, privateKey, ...safe } = value || {}
        return [id, safe]
      })
    )
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(sanitized))
    return sanitized
  } catch { return {} }
}

export default function App() {
  const { user, signIn, signOut } = useAuth()
  const { messages, isLoading, error, sessionId, sessions, latestStrategyId, latestBacktestId, sendUserMessage, clearChat, refreshSessions, loadSession } = useChat()
  const { fetchStrategy } = useStrategy()
  const { backtestData, savedBacktests, loading: btLoading, error: btError, fetchBacktest, refreshBacktests, triggerBacktest } = useBacktest()
  const { models, selectedModel, selectedCode, loading: modelsLoading, error: modelsError, refreshModels, selectModel } = useModels()
  const { liveStrategies, selectedLive, loading: liveLoading, error: liveError, refreshList: refreshLive, selectLive, deploy, stop } = useLiveTrading()
  const [activeView, setActiveView] = useState('chats')
  const [selectedConnectorId, setSelectedConnectorId] = useState(CONNECTORS[0].id)
  const [connectionState, setConnectionState] = useState(() => loadConnectionState())
  const [activeContext, setActiveContext] = useState({ asset: 'BTC/USD', strategy: null })
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const updateContext = (patch) => setActiveContext(prev => ({ ...prev, ...patch }))

  const updateConnection = (id, patch) => {
    setConnectionState(prev => {
      const { apiKey, apiSecret, secret, privateKey, ...safePatch } = patch || {}
      const next = { ...prev, [id]: { ...(prev[id] || {}), connected: true, ...safePatch } }
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  const connectConnector = async (id, patch) => {
    if (id === 'kraken') {
      const status = await connectKraken(patch.apiKey, patch.apiSecret)
      updateConnection(id, { connected: status.connected, mode: status.mode, keyPreview: status.key_preview, source: status.source, connectedAt: new Date().toISOString() })
      return status
    }
    if (id === 'alby') {
      updateConnection(id, { connected: true, walletId: patch.walletId, keyPreview: patch.identifierPreview, balanceSats: patch.balanceSats, agentWallet: patch.agentWallet, connectedAt: new Date().toISOString() })
      return { connected: true }
    }
    updateConnection(id, { endpoint: patch.endpoint, keyPreview: patch.apiKey ? `••••${patch.apiKey.slice(-4)}` : undefined, connectedAt: new Date().toISOString() })
    return { connected: true }
  }

  const disconnectConnector = async (id) => {
    if (id === 'alby') await disconnectAlby()
    setConnectionState(prev => {
      const next = { ...prev, [id]: { connected: false } }
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  const normalizeAsset = (asset) => {
    if (!asset) return 'BTC/USD'
    const u = asset.toUpperCase()
    if (u.includes('/')) return u
    if (['BTC', 'BITCOIN'].includes(u)) return 'BTC/USD'
    if (['ETH', 'ETHEREUM'].includes(u)) return 'ETH/USD'
    if (['SOL', 'SOLANA'].includes(u)) return 'SOL/USD'
    return u
  }

  useEffect(() => {
    if (latestStrategyId) {
      fetchStrategy(latestStrategyId).then(s => { if (s) updateContext({ strategy: s }) })
      selectModel(latestStrategyId)
      refreshModels()
    }
  }, [latestStrategyId, fetchStrategy, selectModel, refreshModels])

  useEffect(() => {
    if (latestBacktestId) { fetchBacktest(latestBacktestId); setActiveView('backtests') }
  }, [latestBacktestId, fetchBacktest])

  useEffect(() => {
    refreshBacktests(); refreshModels(); refreshSessions(); refreshLive()
    getKrakenConnection().then(s => { if (s?.connected) updateConnection('kraken', { connected: true, mode: s.mode, keyPreview: s.key_preview, source: s.source }) }).catch(() => {})
    getLightningStatus().then(s => {
      if (s?.user_wallet?.connected) updateConnection('alby', { connected: true, walletId: s.user_wallet.identifier, keyPreview: s.user_wallet.identifier_preview, balanceSats: s.user_wallet.balance_sats, agentWallet: s.agent_wallet })
      else if (s?.agent_wallet) updateConnection('alby', { connected: false, agentWallet: s.agent_wallet })
    }).catch(() => {})
  }, [refreshBacktests, refreshModels, refreshSessions, refreshLive])

  useEffect(() => {
    if (backtestData) updateContext({ asset: normalizeAsset(backtestData.ticker), strategy: { id: backtestData.strategy_id, name: backtestData.strategy_name } })
  }, [backtestData])

  const handleSelectBacktest = (id) => { fetchBacktest(id); setActiveView('backtests') }
  const handleSelectModel = async (model) => { const s = await selectModel(model); updateContext({ strategy: s || model }); setActiveView('models') }
  const handleSelectLive = (id) => { selectLive(id); setActiveView('live') }

  const handleRunBacktest = async () => {
    if (!activeContext.strategy?.id) { setActiveView('models'); return }
    const result = await triggerBacktest(activeContext.strategy.id, activeContext.asset)
    if (result?.backtest_id) fetchBacktest(result.backtest_id)
    setActiveView('backtests')
  }
  const handleSaveModel = () => { if (activeContext.strategy?.id) selectModel(activeContext.strategy.id); setActiveView('models') }
  const handleDeployLive = () => setActiveView('live')

  const handleDeploy = async (strategyId, ticker, amountUsd, confirmLive = false) => {
    updateContext({ asset: normalizeAsset(ticker), strategy: models.find(m => m.id === Number(strategyId)) || activeContext.strategy })
    await deploy(strategyId, ticker, amountUsd, confirmLive)
    setActiveView('live')
  }

  const handleChatAction = (action) => {
    if (action === 'backtest') handleRunBacktest()
    if (action === 'model') handleSaveModel()
    if (action === 'live') handleDeployLive()
  }

  const handleSendMessage = (text) => {
    const u = text.toUpperCase()
    if (u.includes('BTC') || u.includes('BITCOIN')) updateContext({ asset: 'BTC/USD' })
    if (u.includes('ETH') || u.includes('ETHEREUM')) updateContext({ asset: 'ETH/USD' })
    if (u.includes('SOL') || u.includes('SOLANA')) updateContext({ asset: 'SOL/USD' })
    sendUserMessage(text)
  }

  const handleNewChat = () => { clearChat(); setActiveView('chats') }

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#ffffff', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>

      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={(sid) => { loadSession(sid); setActiveView('chats'); closeSidebar() }}
        onNewChat={() => { handleNewChat(); closeSidebar() }}
        backtests={savedBacktests}
        activeBacktestId={backtestData?.id || latestBacktestId}
        onSelectBacktest={(id) => { handleSelectBacktest(id); closeSidebar() }}
        models={models}
        selectedModel={selectedModel}
        onSelectModel={(m) => { handleSelectModel(m); closeSidebar() }}
        modelsLoading={modelsLoading}
        liveStrategies={liveStrategies}
        selectedLiveId={selectedLive?.id}
        onSelectLive={(id) => { handleSelectLive(id); closeSidebar() }}
        connectionState={connectionState}
        selectedConnectorId={selectedConnectorId}
        onSelectConnector={(id) => { setSelectedConnectorId(id); closeSidebar() }}
        isMobile={isMobile}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        user={user}
        onSignIn={signIn}
        onSignOut={signOut}
      />

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
            background: '#ffffff', flexShrink: 0,
          }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, color: '#374151',
              }}
            >
              <Menu size={20} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', letterSpacing: -0.4 }}>LangStock</span>
          </div>
        )}

        {/* Context bar — only when strategy defined */}
        <ActiveContextBar
          context={activeContext}
          onRunBacktest={handleRunBacktest}
          onSaveModel={handleSaveModel}
          onDeployLive={handleDeployLive}
        />

        {activeView === 'chats' && (
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={handleSendMessage}
            onClear={handleNewChat}
            latestStrategyId={latestStrategyId}
            latestBacktestId={latestBacktestId}
            onAction={handleChatAction}
          />
        )}
        {activeView === 'assets' && (
          <AssetsPanel
            activeAsset={activeContext.asset}
            onSelectAsset={(asset) => updateContext({ asset: normalizeAsset(asset) })}
          />
        )}
        {activeView === 'backtests' && (
          <BacktestChart data={backtestData} loading={btLoading} error={btError} />
        )}
        {activeView === 'models' && (
          <ModelsPanel selectedModel={selectedModel} selectedCode={selectedCode} loading={modelsLoading} error={modelsError} />
        )}
        {activeView === 'live' && (
          <LiveTradingPanel
            selectedLive={selectedLive}
            models={models}
            activeContext={activeContext}
            krakenConnection={connectionState.kraken}
            loading={liveLoading}
            error={liveError}
            onDeploy={handleDeploy}
            onStop={stop}
            onRefresh={() => selectedLive ? selectLive(selectedLive.id) : refreshLive()}
          />
        )}
        {activeView === 'connections' && (
          <ConnectionsPanel
            selectedConnectorId={selectedConnectorId}
            connectionState={connectionState}
            onConnect={connectConnector}
            onDisconnect={disconnectConnector}
          />
        )}
      </main>
    </div>
  )
}
