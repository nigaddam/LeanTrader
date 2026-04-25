import React, { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

// Simple markdown-like renderer (bold, code blocks, line breaks)
function renderContent(content) {
  const parts = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', lang: match[1] || 'python', content: match[2] })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return parts
}

function InlineText({ text }) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} style={{ color: '#00ff88' }}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

function TextBlock({ content }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      {content.split('\n').map((line, i) => (
        <div key={i} style={{ minHeight: line === '' ? '0.5em' : undefined }}>
          {line.startsWith('- ') || line.startsWith('• ')
            ? <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                <span style={{ color: '#00ff88', flexShrink: 0 }}>▸</span>
                <InlineText text={line.slice(2)} />
              </div>
            : line.match(/^\d+\./)
              ? <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                  <span style={{ color: '#94a3b8', flexShrink: 0 }}>{line.match(/^\d+\./)[0]}</span>
                  <InlineText text={line.replace(/^\d+\.\s*/, '')} />
                </div>
              : <InlineText text={line} />
          }
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ lang, content }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative', margin: '12px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2d45' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#0d1526', borderBottom: '1px solid #1e2d45' }}>
        <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono, monospace' }}>{lang}</span>
        <button
          onClick={handleCopy}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copied ? '#00ff88' : '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={vscDarkPlus}
        customStyle={{ margin: 0, background: '#0a0f1e', fontSize: 13, padding: '16px' }}
      >
        {content.trim()}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const parts = renderContent(message.content)

  return (
    <div
      className="fade-in-up"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: '#eef2ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0, marginTop: 2, color: '#4f46e5', fontWeight: 800,
        }}>
          AI
        </div>
      )}

      <div style={{
        maxWidth: isUser ? '72%' : '86%',
        background: isUser ? '#f1f5f9' : '#ffffff',
        border: isUser ? '1px solid #e5eaf1' : '1px solid #e5eaf1',
        borderRadius: 16,
        padding: '13px 16px',
        color: '#263647',
        fontSize: 14,
        fontWeight: isUser ? 600 : 400,
        boxShadow: '0 10px 26px rgba(15,23,42,0.06)',
      }}>
        {parts.map((part, i) =>
          part.type === 'code'
            ? <CodeBlock key={i} lang={part.lang} content={part.content} />
            : <TextBlock key={i} content={part.content} />
        )}
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: '#f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, flexShrink: 0, marginTop: 2, color: '#64748b', fontWeight: 800,
        }}>
          YOU
        </div>
      )}
    </div>
  )
}
