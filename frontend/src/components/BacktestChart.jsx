import React, { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Scatter, ScatterChart,
  ComposedChart, Area,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{
      background: '#161d2f', border: '1px solid #1e2d45', borderRadius: 8,
      padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: '#4b5563', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#00ff88', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
        ${d?.value?.toFixed(2)}
      </div>
      {d?.signal === 1 && <div style={{ color: '#00ff88', fontSize: 11, marginTop: 2 }}>▲ BUY</div>}
      {d?.signal === -1 && <div style={{ color: '#ff4466', fontSize: 11, marginTop: 2 }}>▼ SELL</div>}
    </div>
  )
}

const StatCard = ({ label, value, sub, positive }) => (
  <div style={{
    background: '#161d2f', border: '1px solid #1e2d45', borderRadius: 10,
    padding: '14px 16px', flex: 1, minWidth: 100,
  }}>
    <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{
      fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono',
      color: positive === undefined ? '#e2e8f0' : positive ? '#00ff88' : '#ff4466',
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>{sub}</div>}
  </div>
)

export default function BacktestChart({ data, loading, error }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#4b5563' }}>
        <Activity size={32} color="#00ff88" style={{ animation: 'pulse 1.5s infinite' }} />
        <div style={{ fontSize: 13 }}>Running backtest...</div>
        <div style={{ fontSize: 11 }}>Simulating 5 years of trading</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ color: '#ff4466', fontSize: 13 }}>⚠️ {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: '#4b5563', padding: 24 }}>
        <BarChart2 size={40} color="#1e2d45" />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>No Backtest Yet</div>
        <div style={{ fontSize: 12, textAlign: 'center', maxWidth: 200 }}>
          Design a strategy with the agent, then request a backtest to see results here.
        </div>
      </div>
    )
  }

  const { metrics, chart_data: chartData, trades, strategy_name } = data
  const totalReturn = metrics?.total_return_pct ?? 0
  const isPositive = totalReturn >= 0

  // Downsample chart data for performance (max 200 points)
  const sampled = chartData?.length > 200
    ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 200) === 0)
    : chartData || []

  // Format date for X axis
  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
            Backtest Results
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>{strategy_name || 'Strategy'}</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
          color: isPositive ? '#00ff88' : '#ff4466', fontFamily: 'JetBrains Mono',
        }}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {isPositive ? '+' : ''}{totalReturn.toFixed(1)}%
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatCard
          label="$100 → "
          value={`$${metrics?.final_value?.toFixed(0) ?? '—'}`}
          sub="5 year simulation"
          positive={isPositive}
        />
        <StatCard
          label="Sharpe Ratio"
          value={metrics?.sharpe_ratio?.toFixed(2) ?? '—'}
          sub={metrics?.sharpe_ratio > 1 ? 'Good risk-adjusted return' : 'Below average'}
          positive={metrics?.sharpe_ratio > 1}
        />
        <StatCard
          label="Max Drawdown"
          value={`${metrics?.max_drawdown_pct?.toFixed(1) ?? '—'}%`}
          sub="Worst peak-to-trough"
          positive={false}
        />
        <StatCard
          label="Trades"
          value={metrics?.num_trades ?? '—'}
          sub={`${metrics?.num_buys ?? 0} buys · ${metrics?.num_sells ?? 0} sells`}
        />
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 220 }}>
        <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 8, fontFamily: 'JetBrains Mono' }}>
          Portfolio Value (starting $100)
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sampled} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: '#4b5563', fontSize: 10 }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={v => `$${v.toFixed(0)}`}
              tick={{ fill: '#4b5563', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={100} stroke="#1e2d45" strokeDasharray="4 2" label={{ value: '$100', fill: '#4b5563', fontSize: 10 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#00ff88"
              strokeWidth={2}
              fill="url(#greenGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#00ff88' }}
            />
            {/* Buy signals */}
            {sampled.filter(d => d.signal === 1).map((d, i) => (
              <ReferenceLine key={`buy-${i}`} x={d.date} stroke="rgba(0,255,136,0.3)" strokeWidth={1} />
            ))}
            {/* Sell signals */}
            {sampled.filter(d => d.signal === -1).map((d, i) => (
              <ReferenceLine key={`sell-${i}`} x={d.date} stroke="rgba(255,68,102,0.3)" strokeWidth={1} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recent trades */}
      {trades?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Recent Trades
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
            {trades.slice(-8).reverse().map((t, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px', background: '#0d1526', borderRadius: 6, fontSize: 11,
                border: `1px solid ${t.action === 'buy' ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,102,0.15)'}`,
              }}>
                <span style={{ color: t.action === 'buy' ? '#00ff88' : '#ff4466', fontWeight: 600, textTransform: 'uppercase' }}>
                  {t.action === 'buy' ? '▲' : '▼'} {t.action}
                </span>
                <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>${t.price?.toLocaleString()}</span>
                <span style={{ color: '#4b5563' }}>{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: '#2d3748', textAlign: 'center' }}>
        Past performance does not guarantee future results.
      </div>
    </div>
  )
}
