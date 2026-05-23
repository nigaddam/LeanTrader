import { useState, useRef, useEffect } from 'react'
import {
  Plus, ChevronDown, ChevronRight, ChevronUp,
  BarChart2, Sigma, Zap, Coins, Briefcase, FileText, Plug, Database,
  TrendingUp as TrendUp, TrendingDown, Minus,
  LogIn, LogOut, X,
  User, Settings, HelpCircle, Info, Mail,
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

// ── Account footer with popover menu ─────────────────────────────────────────
function AccountFooter({ user, onSignIn, onSignOut }) {
  const [open, setOpen] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    setAvatarFailed(false)
  }, [user?.avatar_url])

  const initials = (user?.name || user?.email || '?')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || '?'

  const avatarStyle = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid #e0e7ff',
    background: 'linear-gradient(135deg, #0f172a, #4f46e5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(15,23,42,0.10)',
  }

  const Avatar = () => (
    <div style={avatarStyle}>
      {user.avatar_url && !avatarFailed ? (
        <img
          src={user.avatar_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setAvatarFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            borderRadius: '50%',
          }}
        />
      ) : (
        <span style={{ fontSize: 12, fontWeight: 850, color: '#ffffff', lineHeight: 1 }}>
          {initials}
        </span>
      )}
    </div>
  )

  const menuItems = [
    { icon: User,        label: 'User Profile',      sub: 'Name, photo & details' },
    { icon: Settings,    label: 'Account Settings',  sub: 'Password & security' },
    { icon: HelpCircle,  label: "FAQ's",              sub: 'Common questions' },
    { icon: Info,        label: 'About Us',           sub: 'Learn about LangStock' },
    { icon: Mail,        label: 'Reach Out',          sub: 'Contact & support' },
  ]

  if (!user) {
    return (
      <div style={{ padding: '10px 10px 16px', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <button
          onClick={onSignIn}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', background: '#ffffff', color: '#374151',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#fafafe' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff' }}
        >
          {/* Google "G" mark */}
          <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span style={{ flex: 1, textAlign: 'left' }}>Sign in with Google</span>
          <LogIn size={13} color="#94a3b8" />
        </button>
        <p style={{ margin: '8px 2px 0', fontSize: 10, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.4 }}>
          Sign in to save chats & strategies
        </p>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ padding: '8px 10px 14px', borderTop: '1px solid #f1f5f9', flexShrink: 0, position: 'relative' }}>

      {/* Popover menu */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 8, right: 8,
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
          overflow: 'hidden', zIndex: 300,
        }}>
          {/* Menu header */}
          <div style={{
            padding: '12px 14px 10px', background: '#fafafa',
            borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            {menuItems.map(({ icon: Icon, label, sub }) => (
              <button
                key={label}
                onClick={() => setOpen(false)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={13} color="#6366f1" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sub}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div style={{ padding: '6px 0 6px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => { setOpen(false); onSignOut() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px', background: 'none', border: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <LogOut size={13} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Sign Out</div>
                <div style={{ fontSize: 10, color: '#fca5a5', marginTop: 1 }}>End your session</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '8px 10px', borderRadius: 10,
          background: open ? '#f1f5f9' : 'none',
          border: '1px solid transparent',
          cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent' } }}
      >
        {/* Avatar */}
        <Avatar />

        {/* Name + email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {user.email}
          </div>
        </div>

        {/* Chevron */}
        {open ? <ChevronUp size={13} color="#94a3b8" style={{ flexShrink: 0 }} /> : <ChevronDown size={13} color="#94a3b8" style={{ flexShrink: 0 }} />}
      </button>
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
  isMobile = false, isOpen = false, onClose,
  user, onSignIn, onSignOut,
  showDevelopmentFeatures = true,
  enableAdmin = false,
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

          <NavItem
            icon={Briefcase} label="Portfolio"
            active={activeView === 'portfolio'}
            onClick={() => onSelectView('portfolio')}
          />

          <NavItem
            icon={FileText} label="Orders"
            active={activeView === 'orders'}
            onClick={() => onSelectView('orders')}
          />

          <NavItem
            icon={Plug} label="Connect"
            active={activeView === 'connections'}
            onClick={() => onSelectView('connections')}
          />

          {enableAdmin && (
            <NavItem
              icon={Database} label="Data Admin"
              active={activeView === 'adminData'}
              onClick={() => onSelectView('adminData')}
            />
          )}
        </Section>

        {showDevelopmentFeatures && (
          <>
            <div style={{ height: 1, background: '#f1f5f9', margin: '8px 6px' }} />

            {/* Development tools are local/dev-only unless explicitly enabled. */}
            <Section label="Development" defaultOpen={false}>
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
          </>
        )}

      </div>
      {/* Auth — pinned to bottom */}
      <AccountFooter user={user} onSignIn={onSignIn} onSignOut={onSignOut} />


    </aside>
    </>
  )
}
