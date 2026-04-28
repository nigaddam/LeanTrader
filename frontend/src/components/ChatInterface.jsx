import React, { useRef, useEffect, useState } from 'react'
import { Send, ArrowUp } from 'lucide-react'
import MessageBubble from './MessageBubble'

const QUICK_PROMPTS = [
  "Tell me about Bitcoin's current price",
  "Suggest a simple strategy for BTC",
  "Let's use RSI with period 14",
  "Run a backtest on my strategy",
]

const USE_CASES = [
  {
    label: 'Financial Advice',
    prompts: [
      'Analyze my portfolio risk',
      'What should I rebalance?',
      'How do I reduce drawdown?',
    ],
  },
  {
    label: 'Trading Bot',
    prompts: [
      'Create a BTC momentum strategy',
      'Backtest RSI on ETH',
      'Build a mean-reversion strategy for SOL',
    ],
  },
  {
    label: 'Connect Accounts',
    prompts: [
      'Link Kraken and trade automatically',
      'Fetch my current holdings',
      'Set up live paper trading',
    ],
  },
]

function HeroLanding({ onSend, isLoading }) {
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSend = (text) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return
    onSend(msg.trim())
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const focusInput = () => {
    if (containerRef.current) {
      containerRef.current.style.borderColor = '#6366f1'
      containerRef.current.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.08)'
    }
  }
  const blurInput = () => {
    if (containerRef.current) {
      containerRef.current.style.borderColor = '#e2e8f0'
      containerRef.current.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)'
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 24px 80px', background: '#ffffff',
    }}>
      {/* Input box */}
      <div
        ref={containerRef}
        style={{
          width: '100%', maxWidth: 620,
          background: '#ffffff', border: '1.5px solid #e2e8f0',
          borderRadius: 16, padding: '10px 10px 10px 18px',
          display: 'flex', alignItems: 'flex-end', gap: 8,
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          marginBottom: 20,
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={focusInput}
          onBlur={blurInput}
          placeholder="Ask about markets, describe a strategy, or say 'build me a trading bot'..."
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent', color: '#0f172a', fontSize: 15,
            fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
            padding: '4px 0', maxHeight: 120, overflowY: 'auto',
          }}
          disabled={isLoading}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: input.trim() && !isLoading ? '#0f172a' : '#f1f5f9',
            color: input.trim() && !isLoading ? '#ffffff' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          <ArrowUp size={17} />
        </button>
      </div>

      {/* Suggestion card — Perplexity style */}
      <div style={{
        width: '100%', maxWidth: 620,
        background: '#f8fafc', borderRadius: 14,
        overflow: 'hidden', border: '1px solid #f1f5f9',
      }}>
        {/* Tab row */}
        <div style={{
          display: 'flex', gap: 6, padding: '12px 14px 10px',
          borderBottom: '1px solid #f1f5f9', overflowX: 'auto',
        }}>
          {USE_CASES.map((uc, i) => (
            <button
              key={uc.label}
              onClick={() => setActiveTab(i)}
              style={{
                whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600,
                padding: '5px 13px', borderRadius: 999, border: 'none',
                background: activeTab === i ? '#0f172a' : '#ffffff',
                color: activeTab === i ? '#ffffff' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: activeTab === i ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {uc.label}
            </button>
          ))}
        </div>

        {/* Prompt list */}
        <div style={{ padding: '6px 4px 8px' }}>
          {USE_CASES[activeTab].prompts.map(p => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', background: 'none', border: 'none',
                fontSize: 13, color: '#374151', cursor: 'pointer',
                borderRadius: 8, fontFamily: 'Inter, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ChatInterface({ messages, isLoading, error, onSend, onClear, latestStrategyId, latestBacktestId, onAction }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // "Empty" = only the welcome message (id='welcome') or no messages
  const realMessages = messages.filter(m => m.id !== 'welcome')
  const isEmpty = realMessages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = (text) => {
    const msg = text || input
    if (!msg.trim() || isLoading) return
    onSend(msg.trim())
    setInput('')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (isEmpty) {
    return <HeroLanding onSend={handleSend} isLoading={isLoading} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          {messages.filter(m => m.id !== 'welcome').map(msg => (
            <MessageBubble key={msg.id} message={msg} onAction={onAction} />
          ))}

          {isLoading && (
            <div className="fade-in-up" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#eef2ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#6366f1', fontWeight: 800, flexShrink: 0,
              }}>LT</div>
              <div style={{ display: 'flex', gap: 5, alignItems: 'center', paddingTop: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: '#94a3b8',
                    animation: `dotBounce 1.2s ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              margin: '8px 0 16px', padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, color: '#dc2626', fontSize: 13,
            }}>
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{
        padding: '8px 24px', borderTop: '1px solid #f1f5f9',
        display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, background: '#ffffff',
      }}>
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            disabled={isLoading}
            style={{
              whiteSpace: 'nowrap', fontSize: 11, padding: '4px 12px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 999, color: '#64748b', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#6366f1' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b' }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ padding: '12px 24px 16px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
        <div style={{
          maxWidth: 720, margin: '0 auto',
          background: '#ffffff', border: '1.5px solid #e2e8f0',
          borderRadius: 14, padding: '4px 4px 4px 16px',
          display: 'flex', alignItems: 'flex-end', gap: 8,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about BTC, describe a strategy, request a backtest..."
            rows={1}
            style={{
              flex: 1, resize: 'none', border: 'none', outline: 'none',
              background: 'transparent', color: '#0f172a', fontSize: 14,
              fontFamily: 'Inter, sans-serif', lineHeight: 1.6,
              padding: '10px 0', maxHeight: 120, overflowY: 'auto',
            }}
            onFocus={e => { e.target.closest('div').style.borderColor = '#6366f1' }}
            onBlur={e => { e.target.closest('div').style.borderColor = '#e2e8f0' }}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={{
              width: 36, height: 36, borderRadius: 9, border: 'none',
              background: input.trim() && !isLoading ? '#6366f1' : '#f1f5f9',
              color: input.trim() && !isLoading ? '#ffffff' : '#94a3b8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
              flexShrink: 0, marginBottom: 4,
            }}
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: '#cbd5e1' }}>
          Not financial advice. Always test in sandbox mode first.
        </div>
      </div>
    </div>
  )
}
