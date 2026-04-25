import { useState, useEffect } from 'react'
import { Zap, Square, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

const TICKERS = ['BTC/USD', 'ETH/USD', 'SOL/USD']

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const fmtUsd = (n) => {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

function SignalBadge({ signal }) {
  if (signal === 1)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#16a34a', borderRadius: 999, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>
        <TrendingUp size={12} /> BUY
      </span>
    )
  if (signal === -1)
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#dc2626', borderRadius: 999, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>
        <TrendingDown size={12} /> SELL
      </span>
    )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f1f5f9', color: '#64748b', borderRadius: 999, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>
      <Minus size={12} /> HOLD
    </span>
  )
}

function ModeBadge({ mode }) {
  const live = mode === 'LIVE'
  return (
    <span style={{
      fontSize: 10, fontFamily: 'JetBrains Mono', fontWeight: 700,
      background: live ? '#fef2f2' : '#f0fdf4',
      color: live ? '#dc2626' : '#16a34a',
      border: `1px solid ${live ? '#fca5a5' : '#86efac'}`,
      borderRadius: 4, padding: '2px 7px',
    }}>
      {live ? '● LIVE' : '◎ SANDBOX'}
    </span>
  )
}

function DeployForm({ models, activeContext, onDeploy, loading }) {
  const [strategyId, setStrategyId] = useState(activeContext?.strategy?.id || '')
  const [ticker, setTicker] = useState(activeContext?.asset || 'BTC/USD')
  const [amount, setAmount] = useState('100')

  useEffect(() => {
    if (activeContext?.strategy?.id) setStrategyId(activeContext.strategy.id)
    if (activeContext?.asset) setTicker(activeContext.asset)
  }, [activeContext?.strategy?.id, activeContext?.asset])

  const handleDeploy = () => {
    if (!strategyId) return
    onDeploy(Number(strategyId), ticker, Number(amount))
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid #d8e1eb', fontSize: 13, background: '#fff',
    color: '#263647', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 5, display: 'block' }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e5eaf1', borderRadius: 10, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#263647', marginBottom: 16 }}>
        Deploy a Model
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Model / Strategy</label>
          <select value={strategyId} onChange={e => setStrategyId(e.target.value)} style={inputStyle}>
            <option value="">Select model…</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name} #{m.id}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Asset</label>
          <select value={ticker} onChange={e => setTicker(e.target.value)} style={inputStyle}>
            {TICKERS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Amount (USD)</label>
        <input
          type="number" min="10" step="10"
          value={amount} onChange={e => setAmount(e.target.value)}
          style={inputStyle}
          placeholder="100"
        />
      </div>

      <button
        onClick={handleDeploy}
        disabled={loading || !strategyId}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8,
          border: 'none', background: loading || !strategyId ? '#c7d2fe' : '#4f46e5',
          color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading || !strategyId ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        }}
      >
        <Zap size={14} />
        {loading ? 'Starting…' : 'Go Live (Paper)'}
      </button>
    </div>
  )
}

function OrdersTable({ orders }) {
  if (!orders?.length) {
    return <div style={{ color: '#94a3b8', fontSize: 13, padding: '12px 0' }}>No orders placed yet.</div>
  }
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ color: '#94a3b8', fontWeight: 600 }}>
          {['Time', 'Side', 'Volume', 'Price', 'Status', 'Mode'].map(h => (
            <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #e5eaf1' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <td style={{ padding: '7px 8px', color: '#64748b' }}>{fmtDate(o.timestamp)}</td>
            <td style={{ padding: '7px 8px', fontWeight: 700, color: o.side === 'buy' ? '#16a34a' : '#dc2626' }}>
              {o.side.toUpperCase()}
            </td>
            <td style={{ padding: '7px 8px', fontFamily: 'JetBrains Mono' }}>{Number(o.volume).toFixed(6)}</td>
            <td style={{ padding: '7px 8px', fontFamily: 'JetBrains Mono' }}>{fmtUsd(o.price)}</td>
            <td style={{ padding: '7px 8px', color: '#64748b' }}>{o.status}</td>
            <td style={{ padding: '7px 8px' }}>
              <span style={{ fontSize: 10, background: o.sandbox ? '#f0fdf4' : '#fef2f2', color: o.sandbox ? '#16a34a' : '#dc2626', borderRadius: 4, padding: '1px 5px', fontWeight: 600 }}>
                {o.sandbox ? 'SANDBOX' : 'LIVE'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function LiveTradingPanel({ selectedLive, models, activeContext, loading, error, onDeploy, onStop, onRefresh }) {
  const [countdown, setCountdown] = useState(null)

  // Countdown to next evaluation
  useEffect(() => {
    if (!selectedLive?.last_evaluated_at || !selectedLive?.is_active) {
      setCountdown(null)
      return
    }
    const interval = 300 // 5 min
    const tick = () => {
      const elapsed = (Date.now() - new Date(selectedLive.last_evaluated_at).getTime()) / 1000
      const remaining = Math.max(0, interval - elapsed)
      setCountdown(Math.round(remaining))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [selectedLive?.last_evaluated_at, selectedLive?.is_active])

  const fmtCountdown = (s) => {
    if (s == null) return '—'
    if (s === 0) return 'Evaluating…'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec.toString().padStart(2, '0')}s`
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid #e5eaf1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={17} color="#4f46e5" />
          <span style={{ fontSize: 15, fontWeight: 800, color: '#263647' }}>
            {selectedLive ? selectedLive.strategy_name : 'Live Trading'}
          </span>
          {selectedLive && <ModeBadge mode={selectedLive.mode} />}
        </div>
        <button
          onClick={onRefresh}
          title="Refresh"
          style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 4 }}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <DeployForm models={models} activeContext={activeContext} onDeploy={onDeploy} loading={loading} />

        {/* Selected live strategy detail */}
        {selectedLive ? (
          <>
            {/* Status row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Status', value: selectedLive.is_active ? (selectedLive.is_running ? '🟢 Running' : '🟡 Starting') : '⚫ Stopped' },
                { label: 'Last Signal', value: <SignalBadge signal={selectedLive.last_signal} /> },
                { label: 'Next Eval', value: fmtCountdown(countdown) },
                { label: 'P&L', value: fmtUsd(selectedLive.total_pnl) },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e5eaf1' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#263647' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Details row */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 20, fontSize: 12, color: '#64748b' }}>
              <span>Ticker: <strong style={{ color: '#263647' }}>{selectedLive.ticker}</strong></span>
              <span>Amount: <strong style={{ color: '#263647' }}>{fmtUsd(selectedLive.amount_usd)}</strong></span>
              <span>Started: <strong style={{ color: '#263647' }}>{fmtDate(selectedLive.started_at)}</strong></span>
              <span>Last eval: <strong style={{ color: '#263647' }}>{fmtDate(selectedLive.last_evaluated_at)}</strong></span>
            </div>

            {/* Stop button */}
            {selectedLive.is_active && (
              <button
                onClick={() => onStop(selectedLive.id)}
                disabled={loading}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', borderRadius: 7, border: '1px solid #fca5a5',
                  background: '#fff5f5', color: '#dc2626', fontWeight: 700, fontSize: 13,
                  cursor: 'pointer', marginBottom: 24,
                }}
              >
                <Square size={12} fill="#dc2626" /> Stop Strategy
              </button>
            )}

            {/* Orders */}
            <div style={{ fontSize: 13, fontWeight: 700, color: '#263647', marginBottom: 10 }}>
              Order History
            </div>
            <OrdersTable orders={selectedLive.orders} />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: '#263647', marginBottom: 6 }}>No live strategies yet.</div>
            <div style={{ fontSize: 13 }}>Select a model to deploy.</div>
          </div>
        )}
      </div>
    </div>
  )
}
