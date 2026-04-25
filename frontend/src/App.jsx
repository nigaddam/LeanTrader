import React, { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import ChatInterface from './components/ChatInterface'
import BacktestChart from './components/BacktestChart'
import ModelsPanel from './components/ModelsPanel'
import LiveTradingPanel from './components/LiveTradingPanel'
import ActiveContextBar from './components/ActiveContextBar'
import AssetsPanel from './components/AssetsPanel'
import ConnectionsPanel from './components/ConnectionsPanel'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import SideListPanel from './components/SideListPanel'
import { useChat } from './hooks/useChat'
import { useStrategy, useBacktest, useModels } from './hooks/useStrategy'
import { useLiveTrading } from './hooks/useLiveTrading'
import { CONNECTORS } from './constants/connections'

const CONNECTIONS_KEY = 'lt_connections'

const loadConnectionState = () => {
  try {
    return JSON.parse(localStorage.getItem(CONNECTIONS_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function App() {
  const { messages, isLoading, error, sessionId, sessions, latestStrategyId, latestBacktestId, sendUserMessage, clearChat, refreshSessions, loadSession } = useChat()
  const { fetchStrategy } = useStrategy()
  const { backtestData, savedBacktests, loading: btLoading, error: btError, fetchBacktest, refreshBacktests, triggerBacktest } = useBacktest()
  const { models, selectedModel, selectedCode, loading: modelsLoading, error: modelsError, refreshModels, selectModel } = useModels()
  const { liveStrategies, selectedLive, loading: liveLoading, error: liveError, refreshList: refreshLive, selectLive, deploy, stop } = useLiveTrading()
  const [activeView, setActiveView] = useState('chats')
  const [selectedConnectorId, setSelectedConnectorId] = useState(CONNECTORS[0].id)
  const [connectionState, setConnectionState] = useState(() => loadConnectionState())
  const [activeContext, setActiveContext] = useState({
    asset: 'BTC/USD',
    strategy: null,
  })

  const updateContext = (patch) => {
    setActiveContext(prev => ({ ...prev, ...patch }))
  }

  const updateConnection = (id, patch) => {
    setConnectionState(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...patch, connected: true } }
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  const normalizeAsset = (asset) => {
    if (!asset) return 'BTC/USD'
    const upper = asset.toUpperCase()
    if (upper.includes('/')) return upper
    if (['BTC', 'BITCOIN'].includes(upper)) return 'BTC/USD'
    if (['ETH', 'ETHEREUM'].includes(upper)) return 'ETH/USD'
    if (['SOL', 'SOLANA'].includes(upper)) return 'SOL/USD'
    return upper
  }

  useEffect(() => {
    if (latestStrategyId) {
      fetchStrategy(latestStrategyId).then((strategy) => {
        if (strategy) updateContext({ strategy })
      })
      selectModel(latestStrategyId)
      refreshModels()
    }
  }, [latestStrategyId, fetchStrategy, selectModel, refreshModels])

  useEffect(() => {
    if (latestBacktestId) {
      fetchBacktest(latestBacktestId)
      setActiveView('backtests')
    }
  }, [latestBacktestId, fetchBacktest])

  useEffect(() => {
    refreshBacktests()
    refreshModels()
    refreshSessions()
    refreshLive()
  }, [refreshBacktests, refreshModels, refreshSessions, refreshLive])

  const handleSelectBacktest = (id) => {
    fetchBacktest(id)
    setActiveView('backtests')
  }

  useEffect(() => {
    if (backtestData) {
      updateContext({
        asset: normalizeAsset(backtestData.ticker),
        strategy: {
          id: backtestData.strategy_id,
          name: backtestData.strategy_name,
        },
      })
    }
  }, [backtestData])

  const handleSelectModel = async (model) => {
    const selected = await selectModel(model)
    updateContext({ strategy: selected || model })
    setActiveView('models')
  }

  const handleSelectLive = (id) => {
    selectLive(id)
    setActiveView('live')
  }

  const handleDeploy = async (strategyId, ticker, amountUsd) => {
    updateContext({ asset: normalizeAsset(ticker), strategy: models.find(m => m.id === Number(strategyId)) || activeContext.strategy })
    // Paper-only for the MVP continuity flow. No backend deploy is triggered here.
    setActiveView('live')
  }

  const handleRunBacktest = async () => {
    if (!activeContext.strategy?.id) {
      setActiveView('models')
      return
    }
    const result = await triggerBacktest(activeContext.strategy.id, activeContext.asset)
    if (result?.backtest_id) fetchBacktest(result.backtest_id)
    setActiveView('backtests')
  }

  const handleSaveModel = () => {
    if (activeContext.strategy?.id) selectModel(activeContext.strategy.id)
    setActiveView('models')
  }

  const handleDeployLive = () => {
    setActiveView('live')
  }

  const handleChatAction = (action) => {
    if (action === 'backtest') handleRunBacktest()
    if (action === 'model') handleSaveModel()
    if (action === 'live') handleDeployLive()
  }

  const handleSendMessage = (text) => {
    const upper = text.toUpperCase()
    if (upper.includes('BTC') || upper.includes('BITCOIN')) updateContext({ asset: 'BTC/USD' })
    if (upper.includes('ETH') || upper.includes('ETHEREUM')) updateContext({ asset: 'ETH/USD' })
    if (upper.includes('SOL') || upper.includes('SOLANA')) updateContext({ asset: 'SOL/USD' })
    sendUserMessage(text)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#eef3f7', color: '#263647' }}>

      {/* Top nav */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 22px', borderBottom: '1px solid #d8e1eb', background: '#9badbd', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={19} color="#ffffff" />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: 15, color: '#ffffff', letterSpacing: 1 }}>
            LEANTRADE
          </span>
          <span style={{
            fontSize: 10, color: '#ffffff', background: 'rgba(255,255,255,0.14)',
            padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.22)',
            fontFamily: 'JetBrains Mono',
          }}>research mode</span>
        </div>
        <div style={{ fontSize: 11, color: '#eef6ff', fontFamily: 'JetBrains Mono' }}>
          session: {sessionId?.slice(0, 8)}...
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Col 1 — nav rail */}
        <WorkspaceSidebar
          activeView={activeView}
          onSelectView={setActiveView}
        />

        {/* Col 2 — context list */}
        <SideListPanel
          activeView={activeView}
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={(sid) => { loadSession(sid); setActiveView('chats') }}
          onNewChat={() => { clearChat(); setActiveView('chats') }}
          onRefreshSessions={refreshSessions}
          backtests={savedBacktests}
          activeBacktestId={backtestData?.id || latestBacktestId}
          onSelectBacktest={handleSelectBacktest}
          onRefreshBacktests={refreshBacktests}
          models={models}
          selectedModel={selectedModel}
          onSelectModel={handleSelectModel}
          onRefreshModels={refreshModels}
          modelsLoading={modelsLoading}
          liveStrategies={liveStrategies}
          selectedLiveId={selectedLive?.id}
          onSelectLive={handleSelectLive}
          onRefreshLive={refreshLive}
          liveLoading={liveLoading}
          activeAsset={activeContext.asset}
          onSelectAsset={(asset) => updateContext({ asset: normalizeAsset(asset) })}
          selectedConnectorId={selectedConnectorId}
          connectionState={connectionState}
          onSelectConnector={(id) => {
            setSelectedConnectorId(id)
            setActiveView('connections')
          }}
        />

        {/* Col 3 — detail panel */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: '#ffffff' }}>
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
              onClear={clearChat}
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
            <BacktestChart
              data={backtestData}
              loading={btLoading}
              error={btError}
            />
          )}
          {activeView === 'models' && (
            <ModelsPanel
              selectedModel={selectedModel}
              selectedCode={selectedCode}
              loading={modelsLoading}
              error={modelsError}
            />
          )}
          {activeView === 'live' && (
            <LiveTradingPanel
              selectedLive={selectedLive}
              models={models}
              activeContext={activeContext}
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
              onConnect={updateConnection}
            />
          )}
        </main>

      </div>
    </div>
  )
}
