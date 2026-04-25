import React, { useState, useEffect } from 'react'
import { TrendingUp, BarChart2, Activity } from 'lucide-react'
import ChatInterface from './components/ChatInterface'
import StrategyPanel from './components/StrategyPanel'
import BacktestChart from './components/BacktestChart'
import PositionsPanel from './components/PositionsPanel'
import { useChat } from './hooks/useChat'
import { useStrategy, useBacktest } from './hooks/useStrategy'

const TABS = [
  { id: 'backtest', label: 'Backtest', icon: BarChart2 },
  { id: 'live', label: 'Live', icon: Activity },
]

export default function App() {
  const { messages, isLoading, error, sessionId, latestStrategyId, latestBacktestId, deployedLiveId, sendUserMessage, clearChat } = useChat()
  const { strategy, code, loading: stratLoading, fetchStrategy } = useStrategy()
  const { backtestData, loading: btLoading, error: btError, fetchBacktest } = useBacktest()
  const [rightTab, setRightTab] = useState('backtest')

  // Auto-fetch strategy when agent generates one
  useEffect(() => {
    if (latestStrategyId) fetchStrategy(latestStrategyId)
  }, [latestStrategyId])

  // Auto-fetch backtest when agent runs one
  useEffect(() => {
    if (latestBacktestId) {
      fetchBacktest(latestBacktestId)
      setRightTab('backtest')
    }
  }, [latestBacktestId])

  // Switch to live tab on deploy
  useEffect(() => {
    if (deployedLiveId) setRightTab('live')
  }, [deployedLiveId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1e', color: '#e2e8f0' }}>

      {/* Top Nav */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: '1px solid #1e2d45', background: '#0d1526', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={20} color="#00ff88" />
          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: 16, color: '#00ff88', letterSpacing: 1 }}>
            LEAN<span style={{ color: '#e2e8f0' }}>TRADE</span>
          </span>
          <span style={{
            fontSize: 10, color: '#4b5563', background: '#161d2f',
            padding: '2px 8px', borderRadius: 4, border: '1px solid #1e2d45',
            fontFamily: 'JetBrains Mono',
          }}>MVP v0.1</span>
        </div>
        <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono' }}>
          session: {sessionId?.slice(0, 8)}...
        </div>
      </div>

      {/* Main Layout: Left sidebar | Chat | Right panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Strategy Panel */}
        <div style={{
          width: 260, flexShrink: 0, borderRight: '1px solid #1e2d45',
          background: '#0d1526', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <StrategyPanel
            strategy={strategy}
            code={code}
            loading={stratLoading}
            backtestMetrics={backtestData?.metrics}
          />
        </div>

        {/* Center: Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSend={sendUserMessage}
            onClear={clearChat}
            latestStrategyId={latestStrategyId}
            latestBacktestId={latestBacktestId}
          />
        </div>

        {/* Right: Backtest / Live panels */}
        <div style={{
          width: 380, flexShrink: 0, borderLeft: '1px solid #1e2d45',
          background: '#0d1526', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex', borderBottom: '1px solid #1e2d45', flexShrink: 0,
            background: '#0a0f1e',
          }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setRightTab(id)}
                style={{
                  flex: 1, padding: '12px 0', background: 'none', border: 'none',
                  borderBottom: rightTab === id ? '2px solid #00ff88' : '2px solid transparent',
                  color: rightTab === id ? '#00ff88' : '#4b5563',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.2s', fontFamily: 'DM Sans',
                }}
              >
                <Icon size={13} />
                {label}
                {id === 'live' && deployedLiveId && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', animation: 'pulse 2s infinite' }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {rightTab === 'backtest' && (
              <BacktestChart
                data={backtestData}
                loading={btLoading}
                error={btError}
              />
            )}
            {rightTab === 'live' && (
              <PositionsPanel
                liveStrategyId={deployedLiveId}
                onStop={() => {/* handled in hook */}}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
