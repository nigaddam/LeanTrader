import React, { useState } from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  ComposedChart, Area, Line,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e5eaf1', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#4f46e5', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
        Equity: ${d?.value?.toFixed(2)}
      </div>
      <div style={{ color: '#475569', fontFamily: 'JetBrains Mono' }}>
        Price: ${Number(d?.price).toLocaleString()}
      </div>
      {d?.signal === 1 && <div style={{ color: '#16a34a', fontSize: 11, marginTop: 3, fontWeight: 600 }}>▲ BUY signal</div>}
      {d?.signal === -1 && <div style={{ color: '#dc2626', fontSize: 11, marginTop: 3, fontWeight: 600 }}>▼ SELL signal</div>}
    </div>
  )
}

const StatCard = ({ label, value, sub, positive }) => (
  <div style={{
    background: '#ffffff', border: '1px solid #e5eaf1', borderRadius: 8,
    padding: '14px 16px', flex: 1, minWidth: 100,
  }}>
    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{
      fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono',
      color: positive === undefined ? '#263647' : positive ? '#16a34a' : '#dc2626',
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
  </div>
)

// Custom dot renderer for buy/sell markers on the price line
function PriceDot(props) {
  const { cx, cy, payload } = props
  if (!cx || !cy) return null
  if (payload?.signal === 1) {
    return <polygon points={`${cx},${cy - 7} ${cx - 5},${cy + 4} ${cx + 5},${cy + 4}`} fill="#16a34a" opacity={0.85} />
  }
  if (payload?.signal === -1) {
    return <polygon points={`${cx},${cy + 7} ${cx - 5},${cy - 4} ${cx + 5},${cy - 4}`} fill="#dc2626" opacity={0.85} />
  }
  return null
}

export default function BacktestChart({ data, loading, error }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#64748b' }}>
        <Activity size={32} color="#4f46e5" style={{ animation: 'pulse 1.5s infinite' }} />
        <div style={{ fontSize: 13 }}>Running backtest...</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>Simulating trading history</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: '#dc2626', fontSize: 13, background: '#fff1f2', border: '1px solid #fecdd3', padding: '12px 18px', borderRadius: 8 }}>
          ⚠️ {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#64748b', padding: 24 }}>
        <BarChart2 size={40} color="#c4d1df" />
        <div style={{ fontSize: 14, fontWeight: 700, color: '#263647' }}>No Backtest Selected</div>
        <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 220, color: '#94a3b8' }}>
          Select a backtest from the list, or ask the agent to run one.
        </div>
      </div>
    )
  }

  const { metrics, chart_data: chartData, trades, strategy_name } = data
  const totalReturn = metrics?.total_return_pct ?? 0
  const isPositive = totalReturn >= 0
  const initialCapital = metrics?.initial_capital ?? 100
  const finalValue = metrics?.final_value ?? initialCapital
  const netProfit = finalValue - initialCapital
  const firstPrice = chartData?.find(d => Number(d.price))?.price ?? 0
  const lastPrice = [...(chartData || [])].reverse().find(d => Number(d.price))?.price ?? firstPrice
  const assetReturn = firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0

  // Downsample for performance — preserve trade signal rows
  const sampled = chartData?.length > 260
    ? chartData.filter((d, i) => i % Math.ceil(chartData.length / 220) === 0 || d.signal !== 0)
    : chartData || []

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 28, gap: 16, overflowY: 'auto', background: '#ffffff' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Backtest Results
          </div>
          <div style={{ fontSize: 18, color: '#263647', fontWeight: 800 }}>{strategy_name || 'Strategy'}</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700,
          color: isPositive ? '#16a34a' : '#dc2626', fontFamily: 'JetBrains Mono',
        }}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {isPositive ? '+' : ''}{totalReturn.toFixed(1)}%
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatCard label="Equity" value={`$${finalValue.toFixed(2)}`} sub={`Started $${initialCapital.toFixed(2)}`} positive={isPositive} />
        <StatCard label="Net Profit" value={`${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}`} sub="After exits" positive={netProfit >= 0} />
        <StatCard label="Return" value={`${totalReturn >= 0 ? '+' : ''}${totalReturn.toFixed(2)}%`} sub={`${metrics?.period_days ?? '—'} daily bars`} positive={isPositive} />
        <StatCard label="Asset Move" value={`${assetReturn >= 0 ? '+' : ''}${assetReturn.toFixed(2)}%`} sub={`$${Number(firstPrice).toLocaleString()} → $${Number(lastPrice).toLocaleString()}`} positive={assetReturn >= 0} />
        <StatCard label="Sharpe" value={metrics?.sharpe_ratio?.toFixed(2) ?? '—'} sub={metrics?.sharpe_ratio > 1 ? 'Good risk-adjusted' : 'Below average'} positive={metrics?.sharpe_ratio > 1} />
        <StatCard label="Max Drawdown" value={`${metrics?.max_drawdown_pct?.toFixed(1) ?? '—'}%`} sub="Worst peak-to-trough" positive={false} />
        <StatCard label="Trades" value={metrics?.num_trades ?? '—'} sub={`${metrics?.num_buys ?? 0} buys · ${metrics?.num_sells ?? 0} sells`} />
        <StatCard label="Fees" value="$0.00" sub="Not modeled yet" />
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
            Portfolio equity and asset price
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748b' }}>
            <span><span style={{ color: '#4f46e5' }}>●</span> equity</span>
            <span><span style={{ color: '#94a3b8' }}>●</span> price</span>
            <span><span style={{ color: '#16a34a' }}>▲</span> buy</span>
            <span><span style={{ color: '#dc2626' }}>▼</span> sell</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sampled} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="equity"
              tickFormatter={v => `$${v.toFixed(0)}`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              yAxisId="equity"
              y={initialCapital}
              stroke="#c4d1df"
              strokeDasharray="4 2"
              label={{ value: `$${initialCapital}`, fill: '#94a3b8', fontSize: 10 }}
            />
            <Area
              yAxisId="equity"
              type="monotone"
              dataKey="value"
              stroke="#4f46e5"
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#4f46e5' }}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="price"
              stroke="#94a3b8"
              strokeWidth={1.5}
              dot={<PriceDot />}
              activeDot={{ r: 4, fill: '#64748b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recent trades table */}
      {trades?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Trades
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
            {trades.slice(-8).reverse().map((t, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: '#f7f9fc', borderRadius: 6, fontSize: 11,
                border: `1px solid ${t.action === 'buy' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'}`,
              }}>
                <span style={{ color: t.action === 'buy' ? '#16a34a' : '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>
                  {t.action === 'buy' ? '▲' : '▼'} {t.action}
                </span>
                <span style={{ color: '#263647', fontFamily: 'JetBrains Mono' }}>${Number(t.price)?.toLocaleString()}</span>
                <span style={{ color: '#94a3b8' }}>{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
        Past performance does not guarantee future results.
      </div>
    </div>
  )
}
