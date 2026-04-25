import { MessageSquare, RefreshCw, Plus, Sigma, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
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
                {bt.strategy_name}
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {models.map(model => {
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
                {model.name}
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
  backtests: 'Recent Backtests',
  models: 'Models',
  live: 'Live Strategies',
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
          {activeView === 'backtests' && (
            <button
              onClick={onRefreshBacktests}
              title="Refresh backtests"
              style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}
            >
              <RefreshCw size={14} />
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
      </div>
    </aside>
  )
}
