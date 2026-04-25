import React, { useRef, useEffect, useState } from 'react'
import { Send, Trash2, Zap } from 'lucide-react'
import MessageBubble from './MessageBubble'

const QUICK_PROMPTS = [
  "Tell me about Bitcoin's current price",
  "Suggest a simple strategy for BTC",
  "Let's use RSI with period 14",
  "Run a backtest on my strategy",
]

export default function ChatInterface({ messages, isLoading, error, onSend, onClear, latestStrategyId, latestBacktestId, onAction }) {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>

      {/* Header */}
      <div style={{
        padding: '14px 28px',
        borderBottom: '1px solid #e5eaf1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5' }} />
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#4f46e5', fontWeight: 700 }}>
            Research Agent
          </span>
          <span style={{ fontSize: 11, color: '#64748b', background: '#f7f9fc', padding: '3px 9px', borderRadius: 999, border: '1px solid #e5eaf1' }}>
            OpenAI
          </span>
        </div>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          title="Clear conversation"
        >
          <Trash2 size={14} /> New Chat
        </button>
      </div>

      {/* Status bar - shows active strategy/backtest */}
      {(latestStrategyId || latestBacktestId) && (
        <div style={{
          padding: '6px 28px', background: '#f7f9fc',
          borderBottom: '1px solid #e5eaf1',
          display: 'flex', gap: 16, fontSize: 11, color: '#4f46e5',
          fontFamily: 'JetBrains Mono',
        }}>
          {latestStrategyId && <span>strategy #{latestStrategyId} active</span>}
          {latestBacktestId && <span>backtest #{latestBacktestId} complete</span>}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '26px 28px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} onAction={onAction} />
          ))}

          {isLoading && (
          <div className="fade-in-up" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#6ee787',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>🤖</div>
            <div style={{
          background: '#f7f9fc', border: '1px solid #e5eaf1',
              borderRadius: 14, padding: '14px 18px',
              display: 'flex', gap: 6, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%', background: '#4f46e5',
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
      </div>

      {/* Quick Prompts */}
      <div style={{
        padding: '8px 28px', borderTop: '1px solid #e5eaf1',
        display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0,
        background: '#ffffff',
      }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onSend(p)}
            disabled={isLoading}
            style={{
              whiteSpace: 'nowrap', fontSize: 11, padding: '4px 12px',
              background: '#ffffff', border: '1px solid #d8e1eb',
              borderRadius: 999, color: '#64748b', cursor: 'pointer',
              fontFamily: 'DM Sans', transition: 'all 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#d8e1eb'; e.currentTarget.style.color = '#64748b' }}
          >
            <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 28px', borderTop: '1px solid #e5eaf1',
        background: '#ffffff', display: 'flex', gap: 12, alignItems: 'flex-end',
      }}>
        <div style={{ maxWidth: 940, margin: '0 auto', width: '100%', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about BTC, describe a strategy, request a backtest..."
            rows={1}
            style={{
              flex: 1, resize: 'none', background: '#ffffff',
              border: '2px solid #c4d1df', borderRadius: 0,
              color: '#263647', padding: '18px 20px', fontSize: 15,
              fontFamily: 'DM Sans', outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              lineHeight: 1.5, maxHeight: 120, overflowY: 'auto',
            }}
            onFocus={e => { e.target.style.borderColor = '#6d5dfc'; e.target.style.boxShadow = '0 0 0 3px rgba(109,93,252,0.08)' }}
            onBlur={e => { e.target.style.borderColor = '#c4d1df'; e.target.style.boxShadow = 'none' }}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: 56, height: 56, borderRadius: 0, border: 'none', cursor: 'pointer',
              background: input.trim() && !isLoading ? '#6d5dfc' : '#d8e1eb',
              color: input.trim() && !isLoading ? '#ffffff' : '#64748b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <div style={{ padding: '6px 20px 10px', textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
        Not financial advice. Trading involves risk. Always test in sandbox mode first.
      </div>
    </div>
  )
}
