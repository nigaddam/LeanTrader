import { useEffect, useMemo, useState } from 'react'
import { Briefcase, RefreshCw, ShieldCheck, Wallet } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getKrakenPortfolio } from '../utils/api'
import TradeTicket from './TradeTicket'

const fmtUsd = (value) => Number(value || 0).toLocaleString(undefined, {
  style: 'currency',
  currency: 'USD',
})

const fmtAmount = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 0,
  maximumFractionDigits: Number(value || 0) >= 100 ? 3 : 6,
})

export default function PortfolioPanel({ onConnectKraken }) {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState('7D')

  const refresh = async (nextRange = range) => {
    setLoading(true)
    setError('')
    try {
      setPortfolio(await getKrakenPortfolio(nextRange))
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not load portfolio.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh(range) }, [range])

  const allocationRows = useMemo(() => {
    const total = Number(portfolio?.total_value_usd || 0)
    return (portfolio?.holdings || []).map(h => ({
      ...h,
      asset_name: h.asset_name || h.name,
      ticker: h.ticker || h.symbol,
      source: h.source || 'Kraken',
      balance: h.balance ?? h.amount,
      estimated_value: h.estimated_value ?? h.value_usd,
      external_code: h.kraken_code || h.external_code || h.asset_code,
      weight: h.allocation ?? (total > 0 && h.value_usd != null ? (h.value_usd / total) * 100 : 0),
    }))
  }, [portfolio])

  if (!portfolio?.connected && !loading) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff', padding: 28 }}>
        <div style={{ maxWidth: 980 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={21} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#263647' }}>Portfolio</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>Balances, tickers, and account value from Kraken</div>
            </div>
          </div>
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 22, background: '#fbfcfe' }}>
            <div style={{ fontSize: 17, fontWeight: 850, color: '#263647', marginBottom: 7 }}>Connect Kraken to view your portfolio</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>
              Your portfolio view uses a read-only Kraken connection to show balances and estimated USD values.
            </div>
            <button
              onClick={onConnectKraken}
              style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#ffffff', cursor: 'pointer', fontSize: 13, fontWeight: 850 }}
            >
              Connect Kraken
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#ffffff', padding: 28 }}>
      <div style={{ maxWidth: 1080 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={21} />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#263647' }}>Portfolio</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                Kraken account summary {portfolio?.updated_at ? `· Updated ${new Date(portfolio.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => refresh(range)}
            disabled={loading}
            style={{ height: 36, padding: '0 12px', borderRadius: 8, border: '1px solid #d8e1eb', background: '#ffffff', color: '#64748b', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 850 }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ border: '1px solid #fecaca', borderRadius: 8, background: '#fef2f2', color: '#dc2626', padding: '10px 12px', fontSize: 13, fontWeight: 750, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 16, background: '#fbfcfe' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 7 }}>Estimated Value</div>
            <div style={{ fontSize: 24, color: '#263647', fontWeight: 950 }}>{fmtUsd(portfolio?.total_value_usd)}</div>
          </div>
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 16, background: '#fbfcfe' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 7 }}>Cash</div>
            <div style={{ fontSize: 24, color: '#263647', fontWeight: 950 }}>{fmtUsd(portfolio?.cash_usd)}</div>
          </div>
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 16, background: '#fbfcfe' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 7 }}>Crypto</div>
            <div style={{ fontSize: 24, color: '#263647', fontWeight: 950 }}>{fmtUsd(portfolio?.crypto_value_usd)}</div>
          </div>
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 16, background: '#fbfcfe' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 7 }}>Holdings</div>
            <div style={{ fontSize: 24, color: '#263647', fontWeight: 950 }}>{portfolio?.holdings_count || 0}</div>
          </div>
        </div>

        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: '#263647' }}>Portfolio Value</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                {portfolio?.updated_at ? `Last updated ${new Date(portfolio.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'Waiting for portfolio data'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, border: '1px solid #e5eaf1', borderRadius: 8, padding: 3, background: '#f8fafc' }}>
              {['7D', '30D'].map(option => (
                <button
                  key={option}
                  onClick={() => setRange(option)}
                  style={{
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: range === option ? '#ffffff' : 'transparent',
                    color: range === option ? '#263647' : '#64748b',
                    boxShadow: range === option ? '0 1px 2px rgba(15,23,42,0.08)' : 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            {portfolio?.history?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={portfolio.history} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    formatter={(value) => [fmtUsd(value), 'Value']}
                    labelFormatter={(label) => new Date(`${label}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    contentStyle={{ border: '1px solid #e5eaf1', borderRadius: 8, boxShadow: '0 8px 24px rgba(15,23,42,0.08)' }}
                  />
                  <Line type="monotone" dataKey="value_usd" stroke="#16a34a" strokeWidth={3} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', border: '1px dashed #d8e1eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 13 }}>
                Historical portfolio value is not available yet.
              </div>
            )}
          </div>
          {portfolio?.history_errors?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
              Some assets could not be included in the chart: {portfolio.history_errors.join('; ')}
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 14, background: '#fbfcfe', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} color="#16a34a" />
            <div style={{ fontSize: 14, fontWeight: 900, color: '#263647' }}>Account Guardrails</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {['Read-only balances', 'No withdrawal permission', 'Paper trading mode', 'Server-side credentials'].map(item => (
              <div key={item} style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 10, background: '#fbfcfe', color: '#374151', fontSize: 13, fontWeight: 800 }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <TradeTicket channel="portfolio" />
        </div>

        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, overflow: 'hidden', background: '#ffffff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr 1fr 0.8fr', gap: 12, padding: '11px 14px', background: '#f8fafc', color: '#94a3b8', fontSize: 11, fontWeight: 900 }}>
            <div>Asset</div>
            <div>Ticker</div>
            <div>Source</div>
            <div>Balance</div>
            <div>Est. Value</div>
            <div>Allocation</div>
          </div>
          {allocationRows.map(row => (
            <div key={row.asset_code} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.8fr 0.8fr 1fr 1fr 0.8fr', gap: 12, alignItems: 'center', padding: '14px', borderTop: '1px solid #e5eaf1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: row.ticker === 'USD' ? '#dcfce7' : '#eef2ff', color: row.ticker === 'USD' ? '#16a34a' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 950 }}>
                  {row.ticker.slice(0, 3)}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#263647', fontWeight: 900 }}>{row.asset_name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>Code: {row.external_code}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#263647', fontWeight: 850 }}>{row.ticker}</div>
              <div>
                <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 9px', borderRadius: 999, background: '#eef2ff', color: '#4f46e5', fontSize: 11, fontWeight: 900 }}>
                  {row.source}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#263647', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>{fmtAmount(row.balance)}</div>
              <div style={{ fontSize: 13, color: '#263647', fontWeight: 850 }}>{row.estimated_value == null ? 'Not priced' : fmtUsd(row.estimated_value)}</div>
              <div style={{ fontSize: 13, color: '#263647', fontWeight: 850 }}>{row.weight.toFixed(1)}%</div>
            </div>
          ))}
          {!allocationRows.length && (
            <div style={{ padding: 16, color: '#64748b', fontSize: 13 }}>
              No non-zero Kraken balances were returned.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
