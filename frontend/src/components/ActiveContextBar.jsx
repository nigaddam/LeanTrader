import { BarChart2, Bookmark, Rocket } from 'lucide-react'

export default function ActiveContextBar({ context, onRunBacktest, onSaveModel, onDeployLive }) {
  const asset = context?.asset || 'Select asset'
  const strategy = context?.strategy?.name || 'Select strategy'

  const buttonStyle = {
    height: 30,
    padding: '0 10px',
    borderRadius: 7,
    border: '1px solid #d8e1eb',
    background: '#ffffff',
    color: '#475569',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
  }

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid #e5eaf1',
      background: '#fbfcfe',
      padding: '10px 22px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
          Active Context
        </div>
        <div style={{ display: 'flex', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            Asset: <strong style={{ color: '#263647' }}>{asset}</strong>
          </span>
          <span style={{ fontSize: 12, color: '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Strategy: <strong style={{ color: '#263647' }}>{strategy}</strong>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={onRunBacktest} style={buttonStyle}>
          <BarChart2 size={13} />
          Run Backtest
        </button>
        <button onClick={onSaveModel} style={buttonStyle}>
          <Bookmark size={13} />
          Save Model
        </button>
        <button onClick={onDeployLive} style={{ ...buttonStyle, color: '#4f46e5', borderColor: '#c7d2fe' }}>
          <Rocket size={13} />
          Deploy Live
        </button>
      </div>
    </div>
  )
}
