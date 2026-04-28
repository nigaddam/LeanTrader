import { useState } from 'react'
import {
  Plus, ChevronDown, ChevronRight,
  BarChart2, Sigma, Zap, Coins,
  TrendingUp as TrendUp, TrendingDown, Minus,
  Check, LogIn, LogOut, X,
} from 'lucide-react'

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  const now = new Date()
  const diffMs = now - dt
  const diffH = diffMs / 3_600_000
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${Math.floor(diffH)}h ago`
  if (diffH < 48) return 'Yesterday'
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ── Collapsible section ──────────────────────────────────────────────────────
function Section({ label, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        {label}
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      {open && <div style={{ marginTop: 2 }}>{children}</div>}
    </div>
  )
}

// ── Single nav item ──────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, active, badge, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', background: (active || hover) ? '#f1f5f9' : 'none',
        border: 'none', borderRadius: 7, cursor: 'pointer',
        color: active ? '#0f172a' : '#64748b',
        fontSize: 13, fontWeight: active ? 600 : 400,
        textAlign: 'left',
      }}
    >
      <Icon size={14} style={{ flexShrink: 0, color: active ? '#6366f1' : '#94a3b8' }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 10, background: '#6366f1', color: '#fff', borderRadius: 999, padding: '1px 6px', fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Chat history list ─────────────────────────────────────────────────────────
function HistoryList({ sessions, activeSessionId, onSelectSession }) {
  if (!sessions?.length) {
    return (
      <div style={{ padding: '6px 10px 8px', color: '#94a3b8', fontSize: 12 }}>
        No recent chats
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {sessions.slice(0, 20).map(s => {
        const active = s.session_id === activeSessionId
        return (
          <button
            key={s.session_id}
            onClick={() => onSelectSession(s.session_id)}
            style={{
              width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '6px 10px', background: active ? '#f1f5f9' : 'none',
              border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? '#0f172a' : '#374151',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              width: '100%',
            }}>
              {s.preview || 'New conversation'}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
              {fmtDate(s.updated_at)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Backtest inline list ──────────────────────────────────────────────────────
function BacktestInlineList({ backtests, activeId, onSelect }) {
  if (!backtests?.length) return (
    <div style={{ padding: '4px 10px 6px 30px', color: '#94a3b8', fontSize: 11 }}>No backtests yet</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {backtests.slice(0, 10).map(bt => {
        const pos = Number(bt.total_return_pct) >= 0
        const active = bt.id === activeId
        return (
          <button
            key={bt.id}
            onClick={() => onSelect(bt.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 10px 5px 28px', background: active ? '#eef2ff' : 'none',
              border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', gap: 6,
            }}
          >
            <span style={{ fontSize: 11, color: active ? '#4f46e5' : '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {bt.strategy_name || `Backtest #${bt.id}`}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono', color: pos ? '#16a34a' : '#dc2626', fontWeight: 700, flexShrink: 0 }}>
              {pos ? '+' : ''}{Number(bt.total_return_pct ?? 0).toFixed(1)}%
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Models inline list ────────────────────────────────────────────────────────
function ModelsInlineList({ models, selectedModel, onSelect }) {
  if (!models?.length) return (
    <div style={{ padding: '4px 10px 6px 30px', color: '#94a3b8', fontSize: 11 }}>No models yet</div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {models.slice(0, 10).map(m => {
        const active = selectedModel?.id === m.id
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              width: '100%', padding: '5px 10px 5px 28px', background: active ? '#eef2ff' : 'none',
              border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 11, color: active ? '#4f46e5' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
              {m.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Live inline list ──────────────────────────────────────────────────────────
function LiveInlineList({ liveStrategies, selectedId, onSelect }) {
  if (!liveStrategies?.length) return (
    <div style={{ padding: '4px 10px 6px 30px', color: '#94a3b8', fontSize: 11 }}>No live strategies</div>
  )
  const SignalIcon = { 1: TrendUp, '-1': TrendingDown, 0: Minus }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {liveStrategies.slice(0, 8).map(live => {
        const active = live.id === selectedId
        const SI = SignalIcon[live.last_signal] || Minus
        const sigColor = live.last_signal === 1 ? '#16a34a' : live.last_signal === -1 ? '#dc2626' : '#94a3b8'
        return (
          <button
            key={live.id}
            onClick={() => onSelect(live.id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '5px 10px 5px 28px', background: active ? '#eef2ff' : 'none',
              border: 'none', borderRadius: 6, cursor: 'pointer', gap: 6,
            }}
          >
            <span style={{ fontSize: 11, color: active ? '#4f46e5' : '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {live.strategy_name}
            </span>
            <SI size={10} color={sigColor} style={{ flexShrink: 0 }} />
          </button>
        )
      })}
    </div>
  )
}

// ── Connection dots in sidebar ────────────────────────────────────────────────
function ConnectionItem({ label, connected, onClick, active }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '6px 10px 6px 28px', background: active ? '#eef2ff' : 'none',
        border: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: connected ? '#16a34a' : '#d1d5db',
      }} />
      <span style={{ fontSize: 11, color: active ? '#4f46e5' : '#374151' }}>{label}</span>
      {connected && <Check size={10} color="#16a34a" style={{ marginLeft: 'auto' }} />}
    </button>
  )
}

// ── Expandable tool section ───────────────────────────────────────────────────
function ToolSection({ id, icon: Icon, label, activeView, onSelectView, children }) {
  const active = activeView === id
  const [hover, setHover] = useState(false)
  return (
    <div>
      <button
        onClick={() => onSelectView(id)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '7px 10px', background: (active || hover) ? '#f1f5f9' : 'none',
          border: 'none', borderRadius: 7, cursor: 'pointer',
          color: active ? '#0f172a' : '#64748b',
          fontSize: 13, fontWeight: active ? 600 : 400,
          textAlign: 'left',
        }}
      >
        <Icon size={14} style={{ flexShrink: 0, color: active ? '#6366f1' : '#94a3b8' }} />
        <span style={{ flex: 1 }}>{label}</span>
        {active && <ChevronDown size={11} color="#94a3b8" />}
      </button>
      {active && children && (
        <div style={{ marginTop: 2, marginBottom: 4 }}>{children}</div>
      )}
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({
  activeView, onSelectView, onNewChat,
  sessions, activeSessionId, onSelectSession,
  backtests, activeBacktestId, onSelectBacktest,
  models, selectedModel, onSelectModel, modelsLoading,
  liveStrategies, selectedLiveId, onSelectLive,
  connectionState, onSelectConnector, selectedConnectorId,
  isMobile = false, isOpen = false, onClose,
  user, onSignIn, onSignOut,
}) {
  const mobileStyle = isMobile ? {
    position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 200,
    width: 280,
    transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
  } : {
    width: 220, flexShrink: 0,
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
            zIndex: 199, backdropFilter: 'blur(2px)',
          }}
        />
      )}

    <aside style={{
      ...mobileStyle,
      borderRight: '1px solid #f1f5f9',
      background: '#fafafa',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Logo row — with optional close button on mobile */}
      <div style={{ padding: '18px 14px 6px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div
          onClick={onNewChat}
          style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', flex: 1 }}
        >
          {/* Logo mark — stacked bars + trend line */}
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="9" width="3" height="6" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="6" y="5" width="3" height="10" rx="1" fill="rgba(255,255,255,0.75)" />
              <rect x="11" y="2" width="3" height="13" rx="1" fill="#ffffff" />
              <polyline points="2.5,8 7.5,4 12.5,1.5" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', letterSpacing: -0.4, lineHeight: 1 }}>
              LangStock
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 3, letterSpacing: 0.1 }}>
              Finance OS
            </div>
          </div>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6,
              color: '#94a3b8', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* New Chat */}
      <div style={{ padding: '16px 10px 12px' }}>
        <button
          onClick={onNewChat}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', background: '#ffffff',
            border: '1px solid #e2e8f0', borderRadius: 8,
            cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <Plus size={14} color="#6366f1" />
          New Chat
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px 4px' }}>

        {/* History */}
        <Section label="History" defaultOpen={false}>
          <HistoryList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(sid) => { onSelectSession(sid); onSelectView('chats') }}
          />
        </Section>

        <div style={{ height: 1, background: '#f1f5f9', margin: '8px 6px' }} />

        {/* Tools */}
        <Section label="Tools" defaultOpen={false}>
          <NavItem
            icon={Coins} label="Assets"
            active={activeView === 'assets'}
            onClick={() => onSelectView('assets')}
          />

          <ToolSection
            id="backtests" icon={BarChart2} label="Backtests"
            activeView={activeView} onSelectView={onSelectView}
          >
            <BacktestInlineList
              backtests={backtests} activeId={activeBacktestId}
              onSelect={onSelectBacktest}
            />
          </ToolSection>

          <ToolSection
            id="models" icon={Sigma} label="Models"
            activeView={activeView} onSelectView={onSelectView}
          >
            <ModelsInlineList
              models={models} selectedModel={selectedModel}
              onSelect={onSelectModel}
            />
          </ToolSection>

          <ToolSection
            id="live" icon={Zap} label="Live Trading"
            activeView={activeView} onSelectView={onSelectView}
          >
            <LiveInlineList
              liveStrategies={liveStrategies} selectedId={selectedLiveId}
              onSelect={onSelectLive}
            />
          </ToolSection>
        </Section>

        <div style={{ height: 1, background: '#f1f5f9', margin: '8px 6px' }} />

        {/* Connect */}
        <Section label="Connect" defaultOpen={false}>
          {[
            { id: 'kraken', label: 'Kraken' },
            { id: 'alby', label: 'Alby (Lightning)' },
            { id: 'coinbase', label: 'Coinbase' },
          ].map(c => (
            <ConnectionItem
              key={c.id}
              label={c.label}
              connected={connectionState?.[c.id]?.connected}
              active={activeView === 'connections' && selectedConnectorId === c.id}
              onClick={() => { onSelectConnector(c.id); onSelectView('connections') }}
            />
          ))}
        </Section>

      </div>
      {/* Auth — pinned to bottom */}
      <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 2px' }}>
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%', background: '#e0e7ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#6366f1', flexShrink: 0,
              }}>
                {user.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', padding: 4, borderRadius: 5, flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 14px', borderRadius: 9,
              border: 'none', background: '#3b82f6', color: '#ffffff',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
          >
            <LogIn size={14} />
            Sign in with Google
          </button>
        )}
      </div>

    </aside>
    </>
  )
}
