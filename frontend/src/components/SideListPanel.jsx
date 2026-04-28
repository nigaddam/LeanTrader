import { useState } from 'react'
import { Coins, MessageSquare, Plug, RefreshCw, Plus, Search, Sigma, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ASSETS } from '../constants/assets'
import { CONNECTORS } from '../constants/connections'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const baseStrategyName = (name = 'Strategy') => {
  const noParams = name.replace(/\s*\([^)]*\)\s*/g, '').trim()
  return noParams || name
}

const fmtParams = (params = {}) => {
  const entries = Object.entries(params || {})
  if (!entries.length) return 'Default parameters'
  return entries.map(([k, v]) => `${k.replace(/_/g, ' ')}=${v}`).join(', ')
}

function ChatList({ sessions, activeSessionId, onSelectSession }) {
  if (!sessions?.length) {
    return (
      <div style={{ border: '1px dashed #c4d1df', borderRadius: 8, padding: 16, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
        No previous chats. Start a conversation and it will be saved here.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sessions.map((session) => {
        const active = activeSessionId === session.session_id
        return (
          <button
            key={session.session_id}
            onClick={() => onSelectSession(session.session_id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
              padding: '9px 10px',
              border: 'none',
              borderRadius: 7,
              background: active ? '#f0edff' : 'transparent',
              color: active ? '#4f46e5' : '#475569',
              borderLeft: `3px solid ${active ? '#6d5dfc' : 'transparent'}`,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <MessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: active ? 700 : 600,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: active ? '#4f46e5' : '#263647',
              }}>
                {session.preview || 'New conversation'}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                {fmtDate(session.updated_at)} · {session.message_count} msgs
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function BacktestList({ backtests, activeId, onSelect }) {
  if (!backtests?.length) {
    return (
      <div style={{
        border: '1px dashed #c4d1df', borderRadius: 8, padding: 16,
        color: '#94a3b8', fontSize: 13, lineHeight: 1.6,
      }}>
        No backtests yet. Ask the agent to run one.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {backtests.map(bt => {
        const positive = Number(bt.total_return_pct) >= 0
        const active = activeId === bt.id
        return (
          <button
            key={bt.id}
            onClick={() => onSelect(bt.id)}
            style={{
              textAlign: 'left',
              border: `1px solid ${active ? '#6d5dfc' : '#e5eaf1'}`,
              background: active ? '#f0edff' : '#ffffff',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              color: '#263647',
              transition: 'border-color 0.12s, background 0.12s',
              boxShadow: active ? '0 2px 8px rgba(109,93,252,0.10)' : 'none',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                color: active ? '#4f46e5' : '#263647',
              }}>
                {baseStrategyName(bt.strategy_name)} ({bt.ticker || 'BTC/USD'})
              </span>
              <span style={{
                fontSize: 11, fontFamily: 'JetBrains Mono',
                color: positive ? '#16a34a' : '#dc2626',
                fontWeight: 700, flexShrink: 0,
              }}>
                {positive ? '+' : ''}{Number(bt.total_return_pct ?? 0).toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 10 }}>
              <span>{bt.ticker} · #{bt.id}</span>
              <span>{fmtDate(bt.created_at)}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ModelsList({ models, selectedModel, onSelect, loading }) {
  if (loading && !models.length) {
    return <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 4px' }}>Loading models...</div>
  }
  if (!models.length) {
    return (
      <div style={{ border: '1px dashed #c4d1df', borderRadius: 8, padding: 16, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
        No models saved yet. Ask the agent to generate a strategy.
      </div>
    )
  }
  const groups = models.reduce((acc, model) => {
    const key = baseStrategyName(model.name)
    if (!acc[key]) acc[key] = []
    acc[key].push(model)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(groups).map(([groupName, groupModels]) => (
        <div key={groupName}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: '2px 4px 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {groupName}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {groupModels.map(model => {
              const active = selectedModel?.id === model.id
              return (
                <button
                  key={model.id}
                  onClick={() => onSelect(model)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${active ? '#6d5dfc' : '#e5eaf1'}`,
                    background: active ? '#f0edff' : '#ffffff',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: '#263647',
                    transition: 'border-color 0.12s, background 0.12s',
                    boxShadow: active ? '0 2px 8px rgba(109,93,252,0.10)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <Sigma size={13} color={active ? '#4f46e5' : '#94a3b8'} />
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: active ? '#4f46e5' : '#263647',
                    }}>
                      {fmtParams(model.parameters)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 10 }}>
                    <span>{model.type?.toUpperCase()} · #{model.id}</span>
                    <span>{fmtDate(model.created_at)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

const fmtUsd = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: n > 1000 ? 0 : 2 })}`

function StaticAssetList({ activeAsset, onSelectAsset }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toUpperCase()
  const assets = normalized
    ? ASSETS.filter(asset =>
        asset.symbol.includes(normalized) ||
        asset.ticker.includes(normalized) ||
        asset.name.toUpperCase().includes(normalized)
      )
    : ASSETS

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 11 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search assets (BTC, ETH, SOL)"
          style={{
            width: '100%',
            height: 36,
            borderRadius: 8,
            border: '1px solid #d8e1eb',
            background: '#ffffff',
            color: '#263647',
            fontSize: 12,
            outline: 'none',
            padding: '0 10px 0 32px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {assets.map(asset => {
        const active = activeAsset === asset.symbol
        const positive = asset.changePct >= 0
        return (
          <button
            key={asset.symbol}
            onClick={() => onSelectAsset(asset.symbol)}
            style={{
              textAlign: 'left',
              border: `1px solid ${active ? '#6d5dfc' : '#e5eaf1'}`,
              background: active ? '#f0edff' : '#ffffff',
              borderRadius: 8,
              padding: '11px 12px',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Coins size={13} color={active ? '#4f46e5' : asset.color} />
                  <span style={{ fontSize: 12, fontWeight: 850, color: active ? '#4f46e5' : '#263647' }}>{asset.symbol}</span>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{asset.name}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: 800, color: '#263647' }}>{fmtUsd(asset.price)}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: positive ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                  {positive ? '+' : ''}{asset.changePct.toFixed(2)}%
                </div>
              </div>
            </div>
          </button>
        )
      })}
      {!assets.length && (
        <div style={{ border: '1px dashed #c4d1df', borderRadius: 8, padding: 14, color: '#94a3b8', fontSize: 12 }}>
          No matching asset.
        </div>
      )}
      </div>
    </div>
  )
}

function ConnectionsList({ selectedConnectorId, connectionState, onSelectConnector }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toUpperCase()
  const filtered = normalized
    ? CONNECTORS.filter(connector =>
        connector.name.toUpperCase().includes(normalized) ||
        connector.group.toUpperCase().includes(normalized)
      )
    : CONNECTORS

  const groups = filtered.reduce((acc, connector) => {
    if (!acc[connector.group]) acc[connector.group] = []
    acc[connector.group].push(connector)
    return acc
  }, {})

  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 11 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search connections..."
          style={{
            width: '100%',
            height: 36,
            borderRadius: 8,
            border: '1px solid #d8e1eb',
            background: '#ffffff',
            color: '#263647',
            fontSize: 12,
            outline: 'none',
            padding: '0 10px 0 32px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(groups).map(([group, connectors]) => (
          <div key={group}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', margin: '2px 4px 6px', textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {connectors.map(connector => {
                const active = selectedConnectorId === connector.id
                const connected = Boolean(connectionState?.[connector.id]?.connected)
                const activeColor = connector.id === 'alby' ? '#7c3aed' : '#4f46e5'
                const activeBg = connector.id === 'alby' ? '#f3e8ff' : '#f0edff'
                return (
                  <button
                    key={connector.id}
                    onClick={() => onSelectConnector(connector.id)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${active ? activeColor : '#e5eaf1'}`,
                      background: active ? activeBg : '#ffffff',
                      borderRadius: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      {connector.id === 'alby' ? (
                        <Zap size={13} color={active ? '#7c3aed' : '#94a3b8'} />
                      ) : (
                        <Plug size={13} color={active ? activeColor : '#94a3b8'} />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 800, color: active ? activeColor : '#263647' }}>
                        {connector.name}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: connected ? '#16a34a' : '#94a3b8', fontWeight: 700 }}>
                      {connected ? 'Connected' : 'Not connected'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {!filtered.length && (
          <div style={{ border: '1px dashed #c4d1df', borderRadius: 8, padding: 14, color: '#94a3b8', fontSize: 12 }}>
            No matching connection.
          </div>
        )}
      </div>
    </div>
  )
}

function LiveList({ liveStrategies, selectedId, onSelect, loading }) {
  if (loading && !liveStrategies.length) {
    return <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 4px' }}>Loading…</div>
  }
  if (!liveStrategies.length) {
    return (
      <div style={{ border: '1px dashed #c4d1df', borderRadius: 8, padding: 16, color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
        No live strategies yet. Deploy a model to start trading.
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {liveStrategies.map(live => {
        const active = selectedId === live.id
        const SignalIcon = live.last_signal === 1 ? TrendingUp : live.last_signal === -1 ? TrendingDown : Minus
        const signalColor = live.last_signal === 1 ? '#16a34a' : live.last_signal === -1 ? '#dc2626' : '#94a3b8'
        return (
          <button
            key={live.id}
            onClick={() => onSelect(live.id)}
            style={{
              textAlign: 'left',
              border: `1px solid ${active ? '#6d5dfc' : '#e5eaf1'}`,
              background: active ? '#f0edff' : '#ffffff',
              borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
              color: '#263647', transition: 'border-color 0.12s, background 0.12s',
              boxShadow: active ? '0 2px 8px rgba(109,93,252,0.10)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <Zap size={13} color={live.is_active ? (active ? '#4f46e5' : '#6d5dfc') : '#94a3b8'} />
              <span style={{
                fontSize: 12, fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                color: active ? '#4f46e5' : '#263647',
              }}>
                {live.strategy_name}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, borderRadius: 3, padding: '1px 5px',
                background: live.is_active ? '#dcfce7' : '#f1f5f9',
                color: live.is_active ? '#16a34a' : '#94a3b8',
              }}>
                {live.is_active ? 'LIVE' : 'STOPPED'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: 10 }}>
              <span>{live.ticker} · #{live.id}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: signalColor, fontWeight: 600 }}>
                <SignalIcon size={9} />
                {live.last_signal === 1 ? 'BUY' : live.last_signal === -1 ? 'SELL' : 'HOLD'}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

const PANEL_TITLES = {
  chats: 'Chats',
  assets: 'Assets',
  backtests: 'Recent Backtests',
  models: 'Models',
  live: 'Live Strategies',
  connections: 'Connections',
}

export default function SideListPanel({
  activeView,
  // chat
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRefreshSessions,
  // backtests
  backtests,
  activeBacktestId,
  onSelectBacktest,
  onRefreshBacktests,
  // models
  models,
  selectedModel,
  onSelectModel,
  onRefreshModels,
  modelsLoading,
  // live
  liveStrategies,
  selectedLiveId,
  onSelectLive,
  onRefreshLive,
  liveLoading,
  activeAsset,
  onSelectAsset,
  selectedConnectorId,
  connectionState,
  onSelectConnector,
}) {
  return (
    <aside style={{
      width: 264,
      flexShrink: 0,
      borderRight: '1px solid #e5eaf1',
      background: '#fbfcfe',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid #e5eaf1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#263647', letterSpacing: 0.1 }}>
          {PANEL_TITLES[activeView]}
        </span>
        <div>
          {activeView === 'chats' && (
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={onRefreshSessions}
                title="Refresh chats"
                style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={onNewChat}
                title="New chat"
                style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
              >
                <Plus size={14} />
              </button>
            </div>
          )}
          {(activeView === 'backtests' || activeView === 'assets') && (
            <button
              onClick={activeView === 'backtests' ? onRefreshBacktests : undefined}
              title={activeView === 'backtests' ? 'Refresh backtests' : 'Assets'}
              style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
            >
              {activeView === 'backtests' ? <RefreshCw size={14} /> : <Coins size={14} />}
            </button>
          )}
          {activeView === 'models' && (
            <button
              onClick={onRefreshModels}
              title="Refresh models"
              style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
            >
              <RefreshCw size={14} />
            </button>
          )}
          {activeView === 'live' && (
            <button
              onClick={onRefreshLive}
              title="Refresh live strategies"
              style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {activeView === 'chats' && (
          <ChatList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
          />
        )}
        {activeView === 'assets' && (
          <StaticAssetList
            activeAsset={activeAsset}
            onSelectAsset={onSelectAsset}
          />
        )}
        {activeView === 'backtests' && (
          <BacktestList
            backtests={backtests}
            activeId={activeBacktestId}
            onSelect={onSelectBacktest}
          />
        )}
        {activeView === 'models' && (
          <ModelsList
            models={models}
            selectedModel={selectedModel}
            onSelect={onSelectModel}
            loading={modelsLoading}
          />
        )}
        {activeView === 'live' && (
          <LiveList
            liveStrategies={liveStrategies || []}
            selectedId={selectedLiveId}
            onSelect={onSelectLive}
            loading={liveLoading}
          />
        )}
        {activeView === 'connections' && (
          <ConnectionsList
            selectedConnectorId={selectedConnectorId}
            connectionState={connectionState}
            onSelectConnector={onSelectConnector}
          />
        )}
      </div>
    </aside>
  )
}
