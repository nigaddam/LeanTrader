import React, { useState, useEffect } from 'react'
import { TrendingUp } from 'lucide-react'
import ChatInterface from './components/ChatInterface'
import BacktestChart from './components/BacktestChart'
import ModelsPanel from './components/ModelsPanel'
import LiveTradingPanel from './components/LiveTradingPanel'
import WorkspaceSidebar from './components/WorkspaceSidebar'
import SideListPanel from './components/SideListPanel'
import { useChat } from './hooks/useChat'
import { useStrategy, useBacktest, useModels } from './hooks/useStrategy'
import { useLiveTrading } from './hooks/useLiveTrading'

export default function App() {
  const { messages, isLoading, error, sessionId, sessions, latestStrategyId, latestBacktestId, sendUserMessage, clearChat, refreshSessions, loadSession } = useChat()
  const { fetchStrategy } = useStrategy()
  const { backtestData, savedBacktests, loading: btLoading, error: btError, fetchBacktest, refreshBacktests } = useBacktest()
  const { models, selectedModel, selectedCode, loading: modelsLoading, error: modelsError, refreshModels, selectModel } = useModels()
  const { liveStrategies, selectedLive, loading: liveLoading, error: liveError, refreshList: refreshLive, selectLive, deploy, stop } = useLiveTrading()
  const [activeView, setActiveView] = useState('chats')

  useEffect(() => {
    if (latestStrategyId) {
      fetchStrategy(latestStrategyId)
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

  const handleSelectLive = (id) => {
    selectLive(id)
    setActiveView('live')
  }

  const handleDeploy = async (strategyId, ticker, amountUsd) => {
    await deploy(strategyId, ticker, amountUsd)
    setActiveView('live')
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
          onSelectModel={selectModel}
          onRefreshModels={refreshModels}
          modelsLoading={modelsLoading}
          liveStrategies={liveStrategies}
          selectedLiveId={selectedLive?.id}
          onSelectLive={handleSelectLive}
          onRefreshLive={refreshLive}
          liveLoading={liveLoading}
        />

        {/* Col 3 — detail panel */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, background: '#ffffff' }}>
          {activeView === 'chats' && (
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              error={error}
              onSend={sendUserMessage}
              onClear={clearChat}
              latestStrategyId={latestStrategyId}
              latestBacktestId={latestBacktestId}
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
              loading={liveLoading}
              error={liveError}
              onDeploy={handleDeploy}
              onStop={stop}
              onRefresh={() => selectedLive ? selectLive(selectedLive.id) : refreshLive()}
            />
          )}
        </main>

      </div>
    </div>
  )
}
