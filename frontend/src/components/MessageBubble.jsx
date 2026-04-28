import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { BarChart2, Bookmark, Rocket, Copy, Check } from 'lucide-react'

// ── Markdown-lite parser ──────────────────────────────────────────────────────
function parseContent(content) {
  const parts = []
  const codeBlock = /```(\w+)?\n([\s\S]*?)```/g
  let last = 0, m
  while ((m = codeBlock.exec(content)) !== null) {
    if (m.index > last) parts.push({ type: 'text', content: content.slice(last, m.index) })
    parts.push({ type: 'code', lang: m[1] || 'python', content: m[2] })
    last = m.index + m[0].length
  }
  if (last < content.length) parts.push({ type: 'text', content: content.slice(last) })
  return parts
}

function InlineText({ text }) {
  // bold **text**, inline `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} style={{ fontWeight: 600, color: '#0f172a' }}>{p.slice(2, -2)}</strong>
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i} style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9em', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, color: '#6366f1' }}>{p.slice(1, -1)}</code>
        return <span key={i}>{p}</span>
      })}
    </span>
  )
}

function TextBlock({ content }) {
  return (
    <div style={{ lineHeight: 1.7, color: '#0f172a', fontSize: 14 }}>
      {content.split('\n').map((line, i) => {
        if (line === '') return <div key={i} style={{ height: '0.6em' }} />
        if (line.startsWith('### '))
          return <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 14, marginBottom: 4 }}><InlineText text={line.slice(4)} /></div>
        if (line.startsWith('## '))
          return <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 16, marginBottom: 4 }}><InlineText text={line.slice(3)} /></div>
        if (line.startsWith('# '))
          return <div key={i} style={{ fontWeight: 800, fontSize: 18, marginTop: 18, marginBottom: 6 }}><InlineText text={line.slice(2)} /></div>
        if (line.startsWith('- ') || line.startsWith('• '))
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
              <span style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }}>•</span>
              <InlineText text={line.slice(2)} />
            </div>
          )
        if (line.match(/^\d+\./))
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 3 }}>
              <span style={{ color: '#94a3b8', flexShrink: 0, minWidth: 20 }}>{line.match(/^\d+\./)[0]}</span>
              <InlineText text={line.replace(/^\d+\.\s*/, '')} />
            </div>
          )
        return <div key={i}><InlineText text={line} /></div>
      })}
    </div>
  )
}

function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ margin: '12px 0', borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
      }}>
        <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copied ? '#16a34a' : '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang} style={oneLight}
        customStyle={{ margin: 0, background: '#f8fafc', fontSize: 12.5, padding: '14px 16px' }}
      >
        {content.trim()}
      </SyntaxHighlighter>
    </div>
  )
}

function AssistantActions({ onAction }) {
  if (!onAction) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
      {[
        { id: 'backtest', label: 'Run Backtest', icon: BarChart2 },
        { id: 'model', label: 'Save Model', icon: Bookmark },
        { id: 'live', label: 'Deploy Live', icon: Rocket },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onAction(id)}
          style={{
            height: 26, padding: '0 10px', borderRadius: 6,
            border: '1px solid #e2e8f0', background: '#fafafa',
            color: id === 'live' ? '#6366f1' : '#374151',
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fafafa' }}
        >
          <Icon size={11} /> {label}
        </button>
      ))}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────
export default function MessageBubble({ message, onAction }) {
  const isUser = message.role === 'user'
  const parts = parseContent(message.content)
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isUser) {
    return (
      <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{ maxWidth: '70%' }}>
          <div style={{
            background: '#f4f4f5', borderRadius: 18,
            padding: '10px 16px', color: '#0f172a',
            fontSize: 14, fontWeight: 500, lineHeight: 1.6,
          }}>
            {message.content}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, textAlign: 'right', paddingRight: 4 }}>
            {time}
          </div>
        </div>
      </div>
    )
  }

  // AI message — flat, no box
  return (
    <div className="fade-in-up" style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#eef2ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#6366f1', fontWeight: 800, flexShrink: 0, marginTop: 1,
      }}>
        LT
      </div>

      {/* Content — flat, no border */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {parts.map((part, i) =>
          part.type === 'code'
            ? <CodeBlock key={i} lang={part.lang} content={part.content} />
            : <TextBlock key={i} content={part.content} />
        )}
        {message.id !== 'welcome' && <AssistantActions onAction={onAction} />}
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>{time}</div>
      </div>
    </div>
  )
}
