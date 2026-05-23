import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Clock, RefreshCw, Search } from 'lucide-react'
import { getAssetColor } from '../constants/assetColors'
import { getAssetOHLCV } from '../utils/api'
import useAssets from '../hooks/useAssets'
import TradeTicket from './TradeTicket'

const fmtUsd = (n) => {
  if (n == null) return '—'
  const v = Number(n)
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: v > 1000 ? 0 : v > 1 ? 2 : 6 })}`
}
const fmtCompact = (n) => {
  if (n == null) return '—'
  const v = Number(n)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(2)}M`
  return fmtUsd(v)
}

const TYPE_TABS = [
  { id: null,     label: 'All' },
  { id: 'stock',  label: 'Stocks' },
  { id: 'etf',    label: 'ETFs' },
  { id: 'crypto', label: 'Crypto' },
]

const downsample = (rows, maxPoints = 260) => {
  if (!rows?.length || rows.length <= maxPoints) return rows || []
  const step = Math.ceil(rows.length / maxPoints)
  return rows.filter((_, i) => i % step === 0 || i === rows.length - 1)
}

function FreshnessTag({ ageMinutes, fresh }) {
  if (ageMinutes == null) return null
  const color = fresh ? '#16a34a' : '#d97706'
  const label = ageMinutes < 60 ? `${ageMinutes}m ago` : `${Math.round(ageMinutes / 60)}h ago`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color, fontWeight: 700, background: `${color}14`, borderRadius: 4, padding: '2px 6px' }}>
      <Clock size={9} />
      {label}
    </span>
  )
}

function SourceBadge({ source }) {
  if (!source) return null
  const colors = { kraken: '#5741d9', yfinance: '#2563eb' }
  const c = colors[source] || '#64748b'
  return (
    <span style={{ fontSize: 10, color: c, background: `${c}14`, borderRadius: 4, padding: '2px 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {source}
    </span>
  )
}

export default function AssetsPanel({ activeAsset, onSelectAsset, sessionId }) {
  const [typeFilter, setTypeFilter] = useState(null)
  const [query, setQuery] = useState('')
  const { assets, loading: assetsLoading, refresh, lastUpdated } = useAssets(typeFilter)

  // Selected asset from backend data
  const selected = useMemo(() => {
    if (!assets.length) return null
    if (activeAsset) {
      const found = assets.find(a => a.symbol === activeAsset || a.symbol === activeAsset.replace('/USD', ''))
      if (found) return found
    }
    return assets[0]
  }, [assets, activeAsset])

  // OHLCV chart data
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historySource, setHistorySource] = useState(null)

  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setLoadingHistory(true)
    getAssetOHLCV(selected.symbol, '1y')
      .then(data => {
        if (!cancelled) {
          setHistory(data.prices || [])
          setHistorySource(data.source)
        }
      })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setLoadingHistory(false) })
    return () => { cancelled = true }
  }, [selected?.symbol])

  const chartData = useMemo(() => downsample(history).map((row, i) => ({
    ...row,
    t: row.date,
    price: row.close,
    index: i,
  })), [history])

  const filteredAssets = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return assets
    return assets.filter(a =>
      a.symbol.toLowerCase().includes(needle) ||
      a.display_name.toLowerCase().includes(needle)
    )
  }, [assets, query])

  const color = selected ? getAssetColor(selected.symbol) : '#64748b'
  const displayPrice = selected?.price
  const changePct = selected?.change_24h_pct ?? 0
  const positive = changePct >= 0

  const ageStr = lastUpdated
    ? `Updated ${Math.round((Date.now() - lastUpdated) / 60000)}m ago`
    : null

  if (assetsLoading && !assets.length) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        Loading assets…
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: '#ffffff', padding: 24, overflow: 'hidden', boxSizing: 'border-box' }}>
      <div style={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)', gap: 16, alignItems: 'stretch' }}>

        {/* Left: asset list */}
        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, background: '#ffffff', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: 14, borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ fontSize: 14, fontWeight: 950, color: '#263647' }}>Assets</div>
              <button onClick={refresh} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }} title="Refresh prices">
                <RefreshCw size={13} />
              </button>
            </div>

            {/* Type filter tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 9 }}>
              {TYPE_TABS.map(tab => (
                <button
                  key={String(tab.id)}
                  onClick={() => setTypeFilter(tab.id)}
                  style={{
                    flex: 1,
                    height: 26,
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: typeFilter === tab.id ? '#263647' : '#f1f5f9',
                    color: typeFilter === tab.id ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search BTC, AAPL..."
                style={{ width: '100%', height: 34, border: '1px solid #d8e1eb', borderRadius: 8, padding: '0 10px 0 31px', outline: 'none', color: '#263647', boxSizing: 'border-box', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {filteredAssets.map(item => {
              const active = item.symbol === selected?.symbol
              const itemColor = getAssetColor(item.symbol)
              const change = item.change_24h_pct ?? 0
              return (
                <button
                  key={item.symbol}
                  onClick={() => onSelectAsset(item.symbol)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', borderTop: '1px solid #f8fafc', background: active ? '#f8fbff' : '#ffffff', cursor: 'pointer', textAlign: 'left' }}
                >
                  {item.logo_url
                    ? <img src={item.logo_url} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'contain' }} />
                    : <div style={{ width: 30, height: 30, borderRadius: 8, background: `${itemColor}18`, color: itemColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 950 }}>{item.symbol.slice(0, 3)}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 900 }}>{item.symbol}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.display_name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: '#263647', fontWeight: 850 }}>{fmtUsd(item.price)}</div>
                    <div style={{ fontSize: 11, color: change >= 0 ? '#16a34a' : '#dc2626', fontWeight: 850 }}>
                      {change >= 0 ? '+' : ''}{Number(change).toFixed(2)}%
                    </div>
                  </div>
                </button>
              )
            })}
            {filteredAssets.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No assets found</div>
            )}
          </div>

          {ageStr && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', fontSize: 10, color: '#94a3b8' }}>
              {ageStr}
            </div>
          )}
        </div>

        {/* Right: detail + chart + trade ticket */}
        {selected && (
          <div style={{ minWidth: 0, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selected.logo_url
                  ? <img src={selected.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'contain' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 950 }}>{selected.symbol.slice(0, 3)}</div>
                }
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 22, fontWeight: 850, color: '#263647' }}>{selected.symbol}</span>
                    <SourceBadge source={selected.price_source} />
                    <FreshnessTag ageMinutes={selected.price_age_minutes} fresh={selected.price_fresh} />
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{selected.display_name}</div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 800, color: '#263647' }}>
                  {fmtUsd(displayPrice)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 13, fontWeight: 800, color: positive ? '#16a34a' : '#dc2626' }}>
                  {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                  {positive ? '+' : ''}{Number(changePct).toFixed(2)}%
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                  {loadingHistory ? 'Loading history…' : historySource ? `1Y · ${historySource}` : '1Y history'}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div style={{ height: 'min(40vh, 400px)', minHeight: 300, border: '1px solid #e5eaf1', borderRadius: 10, padding: 16, marginBottom: 14, boxSizing: 'border-box' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.16} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f0f2f5" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} minTickGap={42} />
                  <YAxis tickFormatter={fmtUsd} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
                  <Tooltip formatter={(value) => [fmtUsd(value), selected.symbol]} />
                  <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2.5} fill="url(#assetGrad)" dot={false} activeDot={{ r: 4, fill: color }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Market Cap', fmtCompact(selected.market_cap)],
                ['Volume 24h', fmtCompact(selected.volume_24h)],
                ['Daily High', fmtUsd(selected.high_24h)],
                ['Daily Low',  fmtUsd(selected.low_24h)],
              ].map(([label, value]) => (
                <div key={label} style={{ border: '1px solid #e5eaf1', borderRadius: 9, padding: 14, background: '#fbfcfe' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: 16, fontWeight: 800, color: '#263647' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Trade ticket */}
            <div style={{ marginTop: 14 }}>
              <TradeTicket
                channel="assets"
                sessionId={sessionId}
                initialIntent={{
                  side: 'buy',
                  ticker: selected.symbol,
                  asset_name: selected.display_name,
                  amount_usd: 10,
                  estimated_price_usd: displayPrice,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
