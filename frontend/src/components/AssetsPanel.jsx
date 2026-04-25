import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Coins } from 'lucide-react'
import { findAsset } from '../constants/assets'
import { getAssetHistory } from '../utils/api'

const fmtUsd = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: n > 1000 ? 0 : 2 })}`
const CACHE_PREFIX = 'lt_asset_history_3y_'

const mockHistory = (asset) => asset.chart.map((point, i) => ({
  date: point.t,
  close: point.price,
  high: point.price,
  low: point.price,
  volume: 0,
  index: i,
}))

const downsample = (rows, maxPoints = 260) => {
  if (!rows?.length || rows.length <= maxPoints) return rows || []
  const step = Math.ceil(rows.length / maxPoints)
  return rows.filter((_, i) => i % step === 0 || i === rows.length - 1)
}

export default function AssetsPanel({ activeAsset, onSelectAsset }) {
  const asset = findAsset(activeAsset)
  const [history, setHistory] = useState(() => mockHistory(asset))
  const [historySource, setHistorySource] = useState('mock')
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    let cancelled = false
    const cacheKey = `${CACHE_PREFIX}${asset.symbol}`

    const load = async () => {
      setLoadingHistory(true)
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (!cancelled) {
            setHistory(parsed.prices || mockHistory(asset))
            setHistorySource('cache')
          }
          return
        }

        const data = await getAssetHistory(asset.symbol, '3y')
        localStorage.setItem(cacheKey, JSON.stringify(data))
        if (!cancelled) {
          setHistory(data.prices || mockHistory(asset))
          setHistorySource('api')
        }
      } catch (e) {
        if (!cancelled) {
          setHistory(mockHistory(asset))
          setHistorySource('mock')
        }
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [asset.symbol])

  const chartData = useMemo(() => downsample(history).map((row, i) => ({
    ...row,
    t: row.date,
    price: row.close,
    index: i,
  })), [history])

  const latest = history?.[history.length - 1]
  const previous = history?.[history.length - 2]
  const displayPrice = latest?.close ?? asset.price
  const changePct = previous?.close ? ((displayPrice - previous.close) / previous.close) * 100 : asset.changePct
  const positive = changePct >= 0
  const high = latest?.high ? fmtUsd(latest.high) : asset.high24h
  const low = latest?.low ? fmtUsd(latest.low) : asset.low24h
  const volume = latest?.volume ? `$${Number(latest.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : asset.volume

  return (
    <div style={{ height: '100%', background: '#ffffff', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 1040 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${asset.color}18`, color: asset.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Coins size={18} />
              </div>
              <div>
                <div style={{ fontSize: 25, fontWeight: 850, color: '#263647' }}>{asset.symbol}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{asset.name}</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 800, color: '#263647' }}>
              {fmtUsd(displayPrice)}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 6,
              fontSize: 13,
              fontWeight: 800,
              color: positive ? '#16a34a' : '#dc2626',
            }}>
              {positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              {positive ? '+' : ''}{changePct.toFixed(2)}%
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
              {loadingHistory ? 'Loading 3y history...' : historySource === 'mock' ? 'Mock fallback' : 'Daily history · 3Y'}
            </div>
          </div>
        </div>

        <div style={{ height: 280, border: '1px solid #e5eaf1', borderRadius: 10, padding: 14, marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="assetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={asset.color} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={asset.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f0f2f5" strokeDasharray="3 3" />
              <XAxis
                dataKey="t"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                minTickGap={42}
              />
              <YAxis tickFormatter={fmtUsd} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip formatter={(value) => [fmtUsd(value), asset.symbol]} />
              <Area type="monotone" dataKey="price" stroke={asset.color} strokeWidth={2.5} fill="url(#assetGrad)" dot={false} activeDot={{ r: 4, fill: asset.color }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            ['Market Cap', asset.marketCap],
            ['Volume', volume],
            ['Daily High', high],
            ['Daily Low', low],
          ].map(([label, value]) => (
            <div key={label} style={{ border: '1px solid #e5eaf1', borderRadius: 9, padding: 14, background: '#fbfcfe' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: 17, fontWeight: 800, color: '#263647' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
