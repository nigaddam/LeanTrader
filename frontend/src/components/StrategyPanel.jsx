import React, { useState } from 'react'
import { Code2, Download, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function StrategyPanel({ strategy, code, loading, backtestMetrics }) {
  const [showCode, setShowCode] = useState(false)

  const downloadCode = () => {
    if (!code) return
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${strategy?.name?.replace(/\s+/g, '_') || 'strategy'}.py`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div style={{ padding: 20, color: '#4b5563', fontSize: 13, textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}>Loading strategy...</div>
        <div style={{ width: 32, height: 32, border: '2px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    )
  }

  if (!strategy) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: 12, color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          Strategy
        </div>
        <div style={{
          background: '#0d1526', border: '1px dashed #1e2d45', borderRadius: 10,
          padding: 24, textAlign: 'center', color: '#4b5563', fontSize: 13,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
          <div>No strategy yet.</div>
          <div style={{ fontSize: 11, marginTop: 6 }}>Chat with the agent to design one.</div>
        </div>
      </div>
    )
  }

  const params = strategy.parameters || {}

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>

      {/* Strategy Header */}
      <div>
        <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Active Strategy
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,204,106,0.04))',
          border: '1px solid rgba(0,255,136,0.2)', borderRadius: 10, padding: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={16} color="#00ff88" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00ff88' }}>{strategy.name}</span>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>
            Type: <span style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>{strategy.type?.toUpperCase()}</span>
          </div>

          {/* Parameters */}
          {Object.keys(params).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(params).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#4b5563' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Backtest Metrics */}
      {backtestMetrics && (
        <div>
          <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Backtest Results
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Return', value: `${backtestMetrics.total_return_pct?.toFixed(1)}%`, positive: backtestMetrics.total_return_pct > 0 },
              { label: 'Final ($100)', value: `$${backtestMetrics.final_value?.toFixed(0)}`, positive: backtestMetrics.final_value > 100 },
              { label: 'Sharpe', value: backtestMetrics.sharpe_ratio?.toFixed(2), positive: backtestMetrics.sharpe_ratio > 1 },
              { label: 'Max DD', value: `${backtestMetrics.max_drawdown_pct?.toFixed(1)}%`, positive: false },
              { label: 'Trades', value: backtestMetrics.num_trades, positive: true },
            ].map(({ label, value, positive }) => (
              <div key={label} style={{
                background: '#0d1526', border: '1px solid #1e2d45',
                borderRadius: 8, padding: '10px 12px',
              }}>
                <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: positive ? '#00ff88' : '#ff4466', fontFamily: 'JetBrains Mono' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code actions */}
      {code && (
        <div>
          <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
            Strategy Code
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: showCode ? 10 : 0 }}>
            <button
              onClick={() => setShowCode(v => !v)}
              style={{
                flex: 1, padding: '8px 0', background: '#161d2f', border: '1px solid #1e2d45',
                borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Code2 size={13} />
              {showCode ? 'Hide Code' : 'View Code'}
              {showCode ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            <button
              onClick={downloadCode}
              style={{
                padding: '8px 12px', background: '#161d2f', border: '1px solid #1e2d45',
                borderRadius: 8, color: '#94a3b8', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              title="Download .py"
            >
              <Download size={13} />
            </button>
          </div>

          {showCode && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2d45', maxHeight: 300, overflowY: 'auto' }}>
              <SyntaxHighlighter
                language="python"
                style={vscDarkPlus}
                customStyle={{ margin: 0, fontSize: 11, background: '#0a0f1e' }}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#2d3748', textAlign: 'center', marginTop: 'auto' }}>
        Strategy ID #{strategy.id} · {new Date(strategy.created_at).toLocaleDateString()}
      </div>
    </div>
  )
}
