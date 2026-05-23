import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const fmtUsd = (value) => Number(value || 0).toLocaleString(undefined, {
  style: 'currency', currency: 'USD',
})
const fmtAmount = (value, ticker) => {
  const n = Number(value || 0)
  const decimals = n >= 100 ? 3 : 6
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })} ${ticker || ''}`
}

const Row = ({ label, value, valueColor }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13,
  }}>
    <span style={{ color: '#64748b' }}>{label}</span>
    <span style={{ fontWeight: 900, color: valueColor || '#263647' }}>{value}</span>
  </div>
)

export default function OrderConfirmModal({ order, onConfirm, onCancel, submitting }) {
  const [notes, setNotes] = useState('')

  if (!order) return null

  const isLive = order.mode === 'live'
  const isBuy = order.side === 'buy'

  // Close on Escape
  useEffect(() => {
    setNotes('')
  }, [order])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && !submitting) onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [submitting, onCancel])

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{
        background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 48px rgba(0,0,0,0.20)',
        animation: 'fadeSlideUp 0.18s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 950, color: '#263647' }}>Confirm Order</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Review and confirm your trade</div>
          </div>
          <button
            onClick={onCancel} disabled={submitting}
            style={{ border: 'none', background: 'none', cursor: submitting ? 'not-allowed' : 'pointer', color: '#94a3b8', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode badge */}
        <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 900, letterSpacing: 0.4,
            background: isLive ? '#fef2f2' : '#f0fdf4',
            color: isLive ? '#dc2626' : '#16a34a',
            border: `1px solid ${isLive ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {isLive ? '● LIVE ORDER' : '○ PAPER ORDER'}
          </span>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 900,
            background: isBuy ? '#f0fdf4' : '#fef2f2',
            color: isBuy ? '#16a34a' : '#dc2626',
            border: `1px solid ${isBuy ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {isBuy ? 'BUY' : 'SELL'}
          </span>
        </div>

        {/* Order detail rows */}
        <div style={{ padding: '6px 20px 4px' }}>
          <Row label="Asset" value={`${order.ticker} · ${order.asset_name}`} />
          <Row label="Quantity" value={fmtAmount(order.quantity, order.ticker)} />
          <Row label="Order Type" value={order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)} />
          {order.order_type === 'limit' && order.limit_price && (
            <Row label="Limit Price" value={fmtUsd(order.limit_price)} />
          )}
          <Row label="Est. Price" value={fmtUsd(order.estimated_price_usd)} />
          <Row
            label="Est. Total"
            value={fmtUsd(order.estimated_value)}
            valueColor={isBuy ? '#16a34a' : '#dc2626'}
          />
        </div>

        {/* Notes / strategy */}
        <div style={{ padding: '4px 20px 0' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 850, color: '#64748b', marginBottom: 5 }}>
            Notes / Strategy <span style={{ fontWeight: 500, color: '#cbd5e1' }}>(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. DCA entry, hedging BTC exposure, strategy name…"
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1px solid #d8e1eb', borderRadius: 8,
              padding: '8px 10px', fontSize: 12, color: '#263647',
              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Live warning */}
        {isLive && (
          <div style={{
            margin: '8px 20px 4px', padding: '10px 12px', borderRadius: 8,
            background: '#fff7ed', border: '1px solid #fed7aa',
            display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={14} color="#ea580c" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#9a3412', lineHeight: 1.5 }}>
              This is a <strong>real order</strong> that will execute on Kraken using your connected account. It cannot be undone once submitted.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: '14px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onCancel} disabled={submitting}
            style={{
              height: 46, borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#ffffff', color: '#374151',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 800,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)} disabled={submitting}
            style={{
              height: 46, borderRadius: 10, border: 'none',
              background: submitting ? '#93c5fd' : isBuy ? '#34d399' : '#fb7185',
              color: '#07111f',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 950,
              boxShadow: submitting ? 'none' : `0 4px 12px ${isBuy ? 'rgba(52,211,153,0.35)' : 'rgba(251,113,133,0.35)'}`,
            }}
          >
            {submitting ? 'Placing order...' : `Confirm ${isBuy ? 'Buy' : 'Sell'}`}
          </button>
        </div>
      </div>

      <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
