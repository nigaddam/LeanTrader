import React, { useEffect, useState } from 'react'
import { Activity, StopCircle, RefreshCw } from 'lucide-react'
import { getPositions, stopStrategy } from '../utils/api'

export default function PositionsPanel({ liveStrategyId, onStop }) {
  const [positions, setPositions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [stopping, setStopping] = useState(false)

  const fetchPositions = async () => {
    setLoading(true)
    try {
      const data = await getPositions()
      setPositions(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (liveStrategyId) {
      fetchPositions()
      const interval = setInterval(fetchPositions, 30000)
      return () => clearInterval(interval)
    }
  }, [liveStrategyId])

  const handleStop = async () => {
    if (!liveStrategyId || !confirm('Stop the live strategy?')) return
    setStopping(true)
    try {
      await stopStrategy(liveStrategyId)
      onStop?.()
    } finally {
      setStopping(false)
    }
  }

  if (!liveStrategyId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#4b5563', padding: 24 }}>
        <Activity size={36} color="#1e2d45" />
        <div style={{ fontSize: 13, color: '#2d3748', textAlign: 'center' }}>
          No live strategy running.<br />Deploy one from the chat.
        </div>
      </div>
    )
  }

  const balance = positions?.balance || {}

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88' }} />
          <span style={{ fontSize: 12, color: '#00ff88', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>LIVE</span>
          <span style={{ fontSize: 11, color: '#4b5563' }}>Strategy #{liveStrategyId}</span>
        </div>
        <button
          onClick={fetchPositions}
          disabled={loading}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Balance */}
      <div>
        <div style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Account Balance
        </div>
        {Object.keys(balance).length === 0 ? (
          <div style={{ fontSize: 12, color: '#4b5563', padding: '12px 0' }}>No balances found or API keys not configured.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(balance).map(([asset, amount]) => (
              <div key={asset} style={{
                display: 'flex', justifyContent: 'space-between',
                background: '#0d1526', border: '1px solid #1e2d45', borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>{asset}</span>
                <span style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  {Number(amount).toFixed(6)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {positions?.error && (
        <div style={{ fontSize: 11, color: '#ff4466', padding: '8px 12px', background: 'rgba(255,68,102,0.1)', borderRadius: 6, border: '1px solid rgba(255,68,102,0.2)' }}>
          ⚠️ {positions.error}
        </div>
      )}

      {/* Stop button */}
      <button
        onClick={handleStop}
        disabled={stopping}
        style={{
          padding: '10px 0', background: 'rgba(255,68,102,0.1)', border: '1px solid rgba(255,68,102,0.3)',
          borderRadius: 8, color: '#ff4466', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          marginTop: 'auto',
        }}
      >
        <StopCircle size={15} />
        {stopping ? 'Stopping...' : 'Stop Strategy'}
      </button>
    </div>
  )
}
