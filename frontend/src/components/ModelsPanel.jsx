import { Code2, Copy, Download, Sigma } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

const fmtDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ModelsPanel({ selectedModel, selectedCode, loading, error }) {
  const copyCode = async () => {
    if (!selectedCode) return
    await navigator.clipboard.writeText(selectedCode)
  }

  const downloadCode = () => {
    if (!selectedCode) return
    const blob = new Blob([selectedCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedModel?.name?.replace(/\s+/g, '_') || 'strategy'}.py`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!selectedModel) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <Sigma size={36} color="#c4d1df" />
          <div style={{ fontSize: 18, color: '#263647', fontWeight: 800, marginTop: 14 }}>Select a Model</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8, color: '#94a3b8' }}>
            Click a strategy from the list to view its code.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid #e5eaf1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexShrink: 0,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
            <Code2 size={17} color="#4f46e5" />
            <h2 style={{ margin: 0, fontSize: 19, color: '#263647', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedModel.name}
            </h2>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 12 }}>
            Strategy #{selectedModel.id} · {selectedModel.type?.toUpperCase()} · saved {fmtDate(selectedModel.created_at)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={copyCode}
            style={{
              height: 34, padding: '0 14px', borderRadius: 7,
              border: '1px solid #d8e1eb', background: '#ffffff',
              color: '#263647', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
            }}
          >
            <Copy size={13} /> Copy
          </button>
          <button
            onClick={downloadCode}
            style={{
              height: 34, padding: '0 14px', borderRadius: 7,
              border: '1px solid #d8e1eb', background: '#ffffff',
              color: '#263647', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
            }}
          >
            <Download size={13} /> Download
          </button>
        </div>
      </div>

      {/* Code area */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {error && (
          <div style={{ color: '#b91c1c', background: '#fff1f2', border: '1px solid #fecdd3', padding: 10, borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}
        {selectedModel.description && (
          <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 18, maxWidth: 880 }}>
            {selectedModel.description}
          </div>
        )}
        <div style={{ border: '1px solid #d8e1eb', borderRadius: 8, overflow: 'hidden' }}>
          <SyntaxHighlighter
            language="python"
            style={oneLight}
            customStyle={{ margin: 0, fontSize: 13, minHeight: 420, background: '#ffffff' }}
            showLineNumbers
          >
            {selectedCode || '# No code saved for this model.'}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  )
}
