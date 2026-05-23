import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, ShoppingCart } from 'lucide-react'
import { createOrder, listTradableAssets } from '../utils/api'
import OrderConfirmModal from './OrderConfirmModal'

const fmtUsd = (value) => Number(value || 0).toLocaleString(undefined, {
  style: 'currency',
  currency: 'USD',
})

const fmtAmount = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: Number(value || 0) >= 100 ? 3 : 6,
})

export default function TradeTicket({ initialIntent = {}, compact = false, channel = 'portfolio', sessionId, onSubmitted }) {
  const [assets, setAssets] = useState([])
  const [tradeMode, setTradeMode] = useState('paper')
  const [loadingAssets, setLoadingAssets] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingOrder, setPendingOrder] = useState(null)
  const [notice, setNotice] = useState(null)
  const [ticket, setTicket] = useState({
    side: initialIntent.side || 'buy',
    ticker: initialIntent.ticker || 'USDC',
    amountUsd: String(initialIntent.amount_usd || initialIntent.estimated_value || 10),
    orderType: initialIntent.order_type || 'market',
    limitPrice: initialIntent.limit_price ? String(initialIntent.limit_price) : '',
  })

  const refreshAssets = async () => {
    setLoadingAssets(true)
    try {
      const data = await listTradableAssets()
      setAssets(data.assets || [])
      if (data.mode) setTradeMode(data.mode)
    } finally {
      setLoadingAssets(false)
    }
  }

  useEffect(() => { refreshAssets() }, [])

  useEffect(() => {
    if (!initialIntent.ticker) return
    setTicket(prev => ({
      ...prev,
      side: initialIntent.side || prev.side,
      ticker: initialIntent.ticker || prev.ticker,
      amountUsd: String(initialIntent.amount_usd || initialIntent.estimated_value || prev.amountUsd),
      orderType: initialIntent.order_type || prev.orderType,
      limitPrice: initialIntent.limit_price ? String(initialIntent.limit_price) : prev.limitPrice,
    }))
  }, [initialIntent])

  const selectedAsset = useMemo(
    () => assets.find(asset => asset.ticker === ticket.ticker) || assets[0] || initialIntent,
    [assets, ticket.ticker, initialIntent]
  )
  const selectedPrice = Number(selectedAsset?.price_usd || initialIntent.estimated_price_usd || 1)
  const amountUsd = Number(ticket.amountUsd || 0)
  const quantity = selectedPrice > 0 ? amountUsd / selectedPrice : amountUsd
  const canSubmit = selectedAsset?.ticker && amountUsd > 0 && (ticket.orderType === 'market' || Number(ticket.limitPrice || 0) > 0)
  const sideLabel = ticket.side === 'buy' ? 'Buy' : 'Sell'
  const isLive = tradeMode === 'live'

  // First click: stage the order and open confirmation modal
  const stageOrder = () => {
    if (!canSubmit) return
    setNotice(null)
    setPendingOrder({
      asset_name: selectedAsset.asset_name || selectedAsset.name || ticket.ticker,
      ticker: selectedAsset.ticker || ticket.ticker,
      source: selectedAsset.source || 'Kraken',
      side: ticket.side,
      quantity,
      order_type: ticket.orderType,
      limit_price: ticket.orderType === 'limit' ? Number(ticket.limitPrice) : null,
      estimated_value: amountUsd,
      estimated_price_usd: selectedPrice,
      mode: tradeMode,
      kraken_pair: selectedAsset.kraken_pair,
    })
  }

  // Second click (inside modal): submit the order
  const confirmOrder = async (notes = '') => {
    if (!pendingOrder) return
    setSubmitting(true)
    try {
      const order = await createOrder({
        asset_name: pendingOrder.asset_name,
        ticker: pendingOrder.ticker,
        source: pendingOrder.source,
        side: pendingOrder.side,
        quantity: pendingOrder.quantity,
        order_type: pendingOrder.order_type,
        limit_price: pendingOrder.limit_price,
        estimated_value: pendingOrder.estimated_value,
        mode: pendingOrder.mode,
        session_id: sessionId || null,
        notes: notes.trim() || `Created from ${channel} trade ticket.`,
        raw_request_json: {
          channel,
          kraken_pair: pendingOrder.kraken_pair,
          estimated_price_usd: pendingOrder.estimated_price_usd,
        },
      })
      setPendingOrder(null)
      setNotice({ tone: 'success', message: `${sideLabel} order placed. Status: ${String(order.status).replace('_', ' ')}.` })
      onSubmitted?.(order)
    } catch (err) {
      setPendingOrder(null)
      setNotice({ tone: 'error', message: err?.response?.data?.detail || err?.message || 'Could not submit order.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div style={{ border: '1px solid #e5eaf1', borderRadius: 12, padding: compact ? 14 : 18, background: '#ffffff', maxWidth: compact ? 520 : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={17} />
            </div>
            <div>
              <div style={{ fontSize: compact ? 15 : 18, fontWeight: 950, color: '#263647' }}>Trade Ticket</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                {isLive ? 'Live mode — orders execute on Kraken.' : 'Sandbox mode — orders are simulated.'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 900, letterSpacing: 0.4,
              background: isLive ? '#fef2f2' : '#f0fdf4',
              color: isLive ? '#dc2626' : '#16a34a',
              border: `1px solid ${isLive ? '#fecaca' : '#bbf7d0'}`,
            }}>
              {isLive ? 'LIVE' : 'PAPER'}
            </span>
            <button onClick={refreshAssets} disabled={loadingAssets} title="Refresh prices" style={{ width: 34, height: 34, border: '1px solid #d8e1eb', background: '#ffffff', borderRadius: 8, color: '#64748b', cursor: loadingAssets ? 'not-allowed' : 'pointer' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '0.8fr 1.2fr 1fr 1fr 1fr', gap: 8, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 850 }}>
            Side
            <select value={ticket.side} onChange={e => setTicket(prev => ({ ...prev, side: e.target.value }))} style={fieldStyle}>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 850 }}>
            Asset
            <select value={ticket.ticker} onChange={e => setTicket(prev => ({ ...prev, ticker: e.target.value }))} style={fieldStyle}>
              {(assets.length ? assets : [selectedAsset]).filter(Boolean).map(asset => (
                <option key={asset.ticker} value={asset.ticker}>{asset.ticker} · {asset.asset_name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 850 }}>
            Total (USD)
            <input value={ticket.amountUsd} onChange={e => setTicket(prev => ({ ...prev, amountUsd: e.target.value }))} inputMode="decimal" style={fieldStyle} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 850 }}>
            Type
            <select value={ticket.orderType} onChange={e => setTicket(prev => ({ ...prev, orderType: e.target.value }))} style={fieldStyle}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 11, color: '#64748b', fontWeight: 850 }}>
            Limit Price
            <input value={ticket.limitPrice} onChange={e => setTicket(prev => ({ ...prev, limitPrice: e.target.value }))} disabled={ticket.orderType !== 'limit'} placeholder={ticket.orderType === 'limit' ? '1.00' : '-'} inputMode="decimal" style={{ ...fieldStyle, background: ticket.orderType === 'limit' ? '#ffffff' : '#f8fafc' }} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div style={summaryStyle}>
            <span style={{ color: '#94a3b8' }}>Quantity</span>
            <strong>{fmtAmount(quantity)} {selectedAsset?.ticker || ''}</strong>
          </div>
          <div style={summaryStyle}>
            <span style={{ color: '#94a3b8' }}>Est. price</span>
            <strong>{fmtUsd(selectedPrice)}</strong>
          </div>
        </div>

        <button
          onClick={stageOrder}
          disabled={!canSubmit || submitting}
          style={{
            width: '100%', height: 46, marginTop: 12, borderRadius: 10, border: 'none',
            background: !canSubmit || submitting ? '#93c5fd' : ticket.side === 'buy' ? '#34d399' : '#fb7185',
            color: '#07111f', cursor: !canSubmit || submitting ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 950,
          }}
        >
          {`Review ${sideLabel} · ${fmtUsd(amountUsd)}`}
        </button>

        {notice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#bbf7d0'}`, background: notice.tone === 'error' ? '#fef2f2' : '#f0fdf4', color: notice.tone === 'error' ? '#dc2626' : '#15803d', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 800 }}>
            {notice.tone !== 'error' && <CheckCircle2 size={15} />}
            {notice.message}
          </div>
        )}
      </div>

      <OrderConfirmModal
        order={pendingOrder}
        onConfirm={confirmOrder}
        onCancel={() => setPendingOrder(null)}
        submitting={submitting}
      />
    </>
  )
}

const fieldStyle = {
  height: 38,
  border: '1px solid #d8e1eb',
  borderRadius: 8,
  padding: '0 10px',
  color: '#263647',
  background: '#ffffff',
  fontWeight: 850,
  minWidth: 0,
}

const summaryStyle = {
  border: '1px solid #e5eaf1',
  borderRadius: 8,
  background: '#fbfcfe',
  padding: '9px 10px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  fontSize: 12,
  color: '#263647',
}
