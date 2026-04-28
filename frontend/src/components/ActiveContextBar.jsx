import { BarChart2, Bookmark, Zap } from 'lucide-react'

export default function ActiveContextBar({ context, onRunBacktest, onSaveModel, onDeployLive }) {
  const strategy = context?.strategy
  if (!strategy) return null  // hidden until a strategy is defined

  const asset = context?.asset || 'BTC/USD'

  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid #f1f5f9',
      background: '#fafafa',
      padding: '8px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    }}>
      {/* Context pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 11, background: '#eef2ff', color: '#6366f1',
          borderRadius: 999, padding: '2px 9px', fontWeight: 600,
        }}>
          {asset}
        </span>
        <span style={{
          fontSize: 12, color: '#374151', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500,
        }}>
          {strategy.name}
        </span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {[
          { label: 'Backtest', icon: BarChart2, fn: onRunBacktest },
          { label: 'Save', icon: Bookmark, fn: onSaveModel },
          { label: 'Deploy Live', icon: Zap, fn: onDeployLive, accent: true },
        ].map(({ label, icon: Icon, fn, accent }) => (
          <button
            key={label}
            onClick={fn}
            style={{
              height: 28, padding: '0 10px', borderRadius: 7,
              border: `1px solid ${accent ? '#c7d2fe' : '#e2e8f0'}`,
              background: accent ? '#eef2ff' : '#ffffff',
              color: accent ? '#6366f1' : '#374151',
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.background = accent ? '#eef2ff' : '#ffffff'; e.currentTarget.style.borderColor = accent ? '#c7d2fe' : '#e2e8f0' }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
