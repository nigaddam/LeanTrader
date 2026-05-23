import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { cancelOrder, deleteOrder, listOrders, retryOrder, verifyOrder } from '../utils/api'

const STATUS_COLORS = {
  draft:            ['#f1f5f9', '#64748b'],
  placed:           ['#eff6ff', '#2563eb'],
  submitted:        ['#eef2ff', '#4f46e5'],
  filled:           ['#dcfce7', '#16a34a'],
  partially_filled: ['#fef3c7', '#d97706'],
  cancelled:        ['#f1f5f9', '#64748b'],
  failed:           ['#fee2e2', '#dc2626'],
}

const fmtTime = (value) => value ? new Date(value).toLocaleString([], {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : ''

const fmtUsd = (value) => value == null ? '-' : Number(value).toLocaleString(undefined, {
  style: 'currency', currency: 'USD',
})

const fmtQty = (value) => value == null ? '-' : Number(value).toLocaleString(undefined, {
  maximumFractionDigits: Number(value) >= 100 ? 3 : 8,
})

function Badge({ value, kind = 'status' }) {
  const key = String(value || '').toLowerCase()
  const [bg, fg] = kind === 'status'
    ? (STATUS_COLORS[key] || ['#f1f5f9', '#64748b'])
    : key === 'live' ? ['#fee2e2', '#dc2626'] : ['#eef2ff', '#4f46e5']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 9px', borderRadius: 999, background: bg, color: fg, fontSize: 11, fontWeight: 900, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {String(value || '-').replace('_', ' ')}
    </span>
  )
}

function SelectFilter({ value, onChange, options, label }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ height: 34, border: '1px solid #d8e1eb', borderRadius: 8, background: '#ffffff', color: '#374151', fontSize: 12, fontWeight: 750, padding: '0 9px', outline: 'none' }}
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [filters, setFilters] = useState({ source: '', mode: '', status: '', side: '', q: '' })

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await listOrders(filters))
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [filters.source, filters.mode, filters.status, filters.side])

  const searchedOrders = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(order =>
      (order.ticker || '').toLowerCase().includes(q) ||
      (order.asset_name || '').toLowerCase().includes(q)
    )
  }, [orders, filters.q])

  const setFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  const handleCancel = async (order) => {
    await cancelOrder(order.id)
    setSelected(null)
    refresh()
  }

  const handleRetry = async (order) => {
    await retryOrder(order.id)
    setSelected(null)
    refresh()
  }

  const handleVerify = async (order) => {
    setVerifying(true)
    try {
      const updated = await verifyOrder(order.id)
      setSelected(updated)
      refresh()
    } catch (err) {
      alert(err?.response?.data?.detail || err?.message || 'Verification failed.')
    } finally {
      setVerifying(false)
    }
  }

  const handleDelete = async (order) => {
    if (!window.confirm(`Delete order #${order.id} (${order.side} ${order.ticker})? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteOrder(order.id)
      setSelected(null)
      refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff', padding: 28 }}>
      <div style={{ maxWidth: 1180 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={21} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#263647' }}>Orders</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>Audit trail for paper and live orders initiated from LangStock</div>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #d8e1eb', background: '#ffffff', color: '#64748b', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 850 }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              value={filters.q}
              onChange={e => setFilter('q', e.target.value)}
              placeholder="Search ticker"
              style={{ width: '100%', height: 34, border: '1px solid #d8e1eb', borderRadius: 8, padding: '0 10px 0 31px', color: '#263647', fontSize: 13, outline: 'none' }}
            />
          </div>
          <SelectFilter label="Source" value={filters.source} onChange={v => setFilter('source', v)} options={[{ value: '', label: 'All sources' }, { value: 'Kraken', label: 'Kraken' }, { value: 'Schwab', label: 'Schwab' }, { value: 'Coinbase', label: 'Coinbase' }, { value: 'Alpaca', label: 'Alpaca' }]} />
          <SelectFilter label="Mode" value={filters.mode} onChange={v => setFilter('mode', v)} options={[{ value: '', label: 'All modes' }, { value: 'paper', label: 'Paper' }, { value: 'live', label: 'Live' }]} />
          <SelectFilter label="Status" value={filters.status} onChange={v => setFilter('status', v)} options={[{ value: '', label: 'All statuses' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'filled', label: 'Filled' }, { value: 'partially_filled', label: 'Partially filled' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'failed', label: 'Failed' }]} />
          <SelectFilter label="Side" value={filters.side} onChange={v => setFilter('side', v)} options={[{ value: '', label: 'All sides' }, { value: 'buy', label: 'Buy' }, { value: 'sell', label: 'Sell' }]} />
        </div>

        {error && <div style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 750, marginBottom: 14 }}>{error}</div>}

        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, background: '#ffffff', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr 0.9fr 0.8fr 1fr 0.9fr 0.8fr 0.9fr 1fr 1.2fr', gap: 10, padding: '11px 12px', background: '#f8fafc', color: '#94a3b8', fontSize: 10, fontWeight: 900 }}>
            <div>Time</div><div>Asset</div><div>Ticker</div><div>Side</div><div>Quantity</div><div>Type</div><div>Limit Price</div><div>Est. Value</div><div>Source</div><div>Mode</div><div>Status</div><div>Strategy / Notes</div>
          </div>
          {searchedOrders.map(order => (
            <button
              key={order.id}
              onClick={() => setSelected(order)}
              style={{ width: '100%', display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.7fr 0.7fr 0.9fr 0.8fr 1fr 0.9fr 0.8fr 0.9fr 1fr 1.2fr', gap: 10, alignItems: 'center', padding: '12px', border: 'none', borderTop: '1px solid #e5eaf1', background: '#ffffff', textAlign: 'left', cursor: 'pointer', color: '#263647' }}
            >
              <div style={{ fontSize: 12, color: '#64748b' }}>{fmtTime(order.created_at)}</div>
              <div style={{ fontSize: 12, fontWeight: 850 }}>{order.asset_name}</div>
              <div style={{ fontSize: 12, fontWeight: 850 }}>{order.ticker}</div>
              <div style={{ fontSize: 12, fontWeight: 900, color: order.side === 'sell' ? '#dc2626' : '#16a34a', textTransform: 'capitalize' }}>{order.side}</div>
              <div style={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}>{fmtQty(order.quantity)}</div>
              <div style={{ fontSize: 12, textTransform: 'capitalize' }}>{order.order_type}</div>
              <div style={{ fontSize: 12 }}>{order.limit_price ? fmtUsd(order.limit_price) : '-'}</div>
              <div style={{ fontSize: 12, fontWeight: 850 }}>{fmtUsd(order.estimated_value)}</div>
              <div><Badge value={order.source} kind="source" /></div>
              <div><Badge value={order.mode} kind="mode" /></div>
              <div><Badge value={order.status} /></div>
              <div style={{ fontSize: 12, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.strategy_name || order.notes || '-'}</div>
            </button>
          ))}
          {!searchedOrders.length && (
            <div style={{ padding: 42, textAlign: 'center', color: '#64748b' }}>
              <FileText size={34} color="#cbd5e1" />
              <div style={{ fontSize: 15, fontWeight: 850, color: '#263647', marginTop: 10 }}>No orders yet</div>
              <div style={{ fontSize: 13, marginTop: 5 }}>Orders placed from LangStock will appear here.</div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.22)', zIndex: 500, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', height: '100%', background: '#ffffff', boxShadow: '-12px 0 32px rgba(15,23,42,0.12)', padding: 22, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 20, color: '#263647', fontWeight: 950 }}>Order #{selected.id}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>{fmtTime(selected.created_at)}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 34, height: 34, border: '1px solid #e5eaf1', borderRadius: 8, background: '#ffffff', cursor: 'pointer' }}><X size={15} /></button>
            </div>
            {[
              ['Asset', selected.asset_name],
              ['Ticker', selected.ticker],
              ['Source', selected.source],
              ['Side', selected.side],
              ['Quantity', fmtQty(selected.quantity)],
              ['Order Type', selected.order_type],
              ['Limit Price', selected.limit_price ? fmtUsd(selected.limit_price) : '-'],
              ['Estimated Value', fmtUsd(selected.estimated_value)],
              ['Mode', selected.mode],
              ['Status', selected.status],
              ['Strategy', selected.strategy_name || '-'],
              ['External Order ID', selected.external_order_id || '-'],
              ['Notes', selected.notes || '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 13, color: '#263647', fontWeight: 750, textTransform: ['Side', 'Order Type', 'Mode', 'Status'].includes(label) ? 'capitalize' : 'none' }}>{value}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
              {selected.status !== 'filled' && selected.status !== 'cancelled' && (
                <button onClick={() => handleCancel(selected)} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #fecaca', background: '#ffffff', color: '#dc2626', cursor: 'pointer', fontWeight: 850 }}>Cancel</button>
              )}
              {selected.status === 'failed' && (
                <button onClick={() => handleRetry(selected)} style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#4f46e5', color: '#ffffff', cursor: 'pointer', fontWeight: 850 }}>Retry</button>
              )}
              {selected.status === 'placed' && selected.mode === 'live' && (
                <button
                  onClick={() => handleVerify(selected)}
                  disabled={verifying}
                  style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', cursor: verifying ? 'not-allowed' : 'pointer', fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <CheckCircle2 size={13} />
                  {verifying ? 'Checking...' : 'Verify with Kraken'}
                </button>
              )}
              <button
                onClick={() => handleDelete(selected)}
                disabled={deleting}
                style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff', color: '#64748b', cursor: deleting ? 'not-allowed' : 'pointer', fontWeight: 850, display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}
              >
                <Trash2 size={13} />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
