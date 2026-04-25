import React, { useRef, useEffect, useState } from 'react'
import { Send, Trash2, Zap } from 'lucide-react'
import MessageBubble from './MessageBubble'

const QUICK_PROMPTS = [
  "Tell me about Bitcoin's current price",
  "Suggest a simple strategy for BTC",
  "Let's use RSI with period 14",
  "Run a backtest on my strategy",
  "Go live on Kraken",
]

export default function ChatInterface({ messages, isLoading, error, onSend, onClear, latestStrategyId, latestBacktestId }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0f1e' }}>

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1e2d45',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0d1526',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#00ff88', fontWeight: 600 }}>
            LEANTRADE AGENT
          </span>
          <span style={{ fontSize: 11, color: '#4b5563', background: '#161d2f', padding: '2px 8px', borderRadius: 4, border: '1px solid #1e2d45' }}>
            Claude Sonnet
          </span>
        </div>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          title="Clear conversation"
        >
          <Trash2 size={14} /> New Chat
        </button>
      </div>

      {/* Status bar - shows active strategy/backtest */}
      {(latestStrategyId || latestBacktestId) && (
        <div style={{
          padding: '6px 20px', background: 'rgba(0,255,136,0.05)',
          borderBottom: '1px solid rgba(0,255,136,0.1)',
          display: 'flex', gap: 16, fontSize: 11, color: '#00ff88',
          fontFamily: 'JetBrains Mono',
        }}>
          {latestStrategyId && <span>strategy #{latestStrategyId} active</span>}
          {latestBacktestId && <span>backtest #{latestBacktestId} complete</span>}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="fade-in-up" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
            <div style={{
              background: '#161d2f', border: '1px solid #1e2d45',
              borderRadius: '4px 18px 18px 18px', padding: '14px 18px',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#00ff88',
                  animation: `pulse 1.2s ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            margin: '8px 0', padding: '10px 16px', background: 'rgba(255,68,102,0.1)',
            border: '1px solid rgba(255,68,102,0.3)', borderRadius: 8,
            color: '#ff4466', fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div style={{
        padding: '8px 20px', borderTop: '1px solid #1e2d45',
        display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0,
        background: '#0d1526',
      }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onSend(p)}
            disabled={isLoading}
            style={{
              whiteSpace: 'nowrap', fontSize: 11, padding: '4px 12px',
              background: '#161d2f', border: '1px solid #1e2d45',
              borderRadius: 20, color: '#94a3b8', cursor: 'pointer',
              fontFamily: 'DM Sans', transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.target.style.borderColor = '#00ff88'; e.target.style.color = '#00ff88' }}
            onMouseLeave={e => { e.target.style.borderColor = '#1e2d45'; e.target.style.color = '#94a3b8' }}
          >
            <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 20px', borderTop: '1px solid #1e2d45',
        background: '#0d1526', display: 'flex', gap: 12, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about BTC, describe a strategy, request a backtest..."
          rows={1}
          style={{
            flex: 1, resize: 'none', background: '#161d2f',
            border: '1px solid #1e2d45', borderRadius: 12,
            color: '#e2e8f0', padding: '12px 16px', fontSize: 14,
            fontFamily: 'DM Sans', outline: 'none',
            transition: 'border-color 0.2s',
            lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
          }}
          onFocus={e => e.target.style.borderColor = '#00ff88'}
          onBlur={e => e.target.style.borderColor = '#1e2d45'}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: input.trim() && !isLoading ? 'linear-gradient(135deg, #00ff88, #00cc6a)' : '#1e2d45',
            color: input.trim() && !isLoading ? '#0a0f1e' : '#4b5563',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}
        >
          <Send size={18} />
        </button>
      </div>

      <div style={{ padding: '6px 20px 10px', textAlign: 'center', fontSize: 10, color: '#2d3748' }}>
        Not financial advice. Trading involves risk. Always test in sandbox mode first.
      </div>
    </div>
  )
}
