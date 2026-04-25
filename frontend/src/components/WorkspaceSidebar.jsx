import { BarChart2, Boxes, MessageSquare, Plug, Zap, Coins } from 'lucide-react'

const NAV = [
  { id: 'chats', label: 'Chats', icon: MessageSquare },
  { id: 'assets', label: 'Assets', icon: Coins },
  { id: 'backtests', label: 'Backtests', icon: BarChart2 },
  { id: 'models', label: 'Models', icon: Boxes },
  { id: 'live', label: 'Live', icon: Zap },
  { id: 'connections', label: 'Connections', icon: Plug },
]

export default function WorkspaceSidebar({ activeView, onSelectView }) {
  return (
    <aside style={{
      width: 160,
      flexShrink: 0,
      borderRight: '1px solid #e5eaf1',
      background: '#f7f9fc',
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 8px',
    }}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = activeView === id
        return (
          <button
            key={id}
            onClick={() => onSelectView(id)}
            onMouseEnter={e => {
              if (!active) e.currentTarget.style.background = '#eef0f4'
            }}
            onMouseLeave={e => {
              if (!active) e.currentTarget.style.background = 'transparent'
            }}
            style={{
              width: '100%',
              height: 46,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '0 11px',
              marginBottom: 3,
              borderRadius: 8,
              border: `1px solid ${active ? '#6d5dfc' : 'transparent'}`,
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#4f46e5' : '#64748b',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        )
      })}
    </aside>
  )
}
