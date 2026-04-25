import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound, Link, Plug } from 'lucide-react'
import { findConnector } from '../constants/connections'

export default function ConnectionsPanel({ selectedConnectorId, connectionState, onConnect }) {
  const connector = findConnector(selectedConnectorId)
  const saved = connectionState?.[connector.id] || {}
  const connected = Boolean(saved.connected)
  const [apiKey, setApiKey] = useState(saved.apiKey || '')
  const [endpoint, setEndpoint] = useState(saved.endpoint || '')

  useEffect(() => {
    setApiKey(saved.apiKey || '')
    setEndpoint(saved.endpoint || '')
  }, [connector.id, saved.apiKey, saved.endpoint])

  const inputStyle = {
    width: '100%',
    height: 38,
    borderRadius: 8,
    border: '1px solid #d8e1eb',
    background: '#ffffff',
    color: '#263647',
    fontSize: 13,
    outline: 'none',
    padding: '0 11px',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    color: '#64748b',
    fontWeight: 700,
    marginBottom: 6,
  }

  const handleConnect = () => {
    onConnect(connector.id, {
      apiKey,
      endpoint,
      connectedAt: new Date().toISOString(),
    })
  }

  return (
    <div style={{ height: '100%', background: '#ffffff', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: connected ? '#dcfce7' : '#eef2ff',
              color: connected ? '#16a34a' : '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {connected ? <CheckCircle2 size={20} /> : <Plug size={20} />}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 850, color: '#263647' }}>{connector.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>{connector.group}</div>
            </div>
          </div>

          <div style={{
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 800,
            color: connected ? '#16a34a' : '#64748b',
            background: connected ? '#dcfce7' : '#f1f5f9',
          }}>
            {connected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#fbfcfe', marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: '#263647', lineHeight: 1.6 }}>
            {connector.description}
          </div>
        </div>

        {(connector.type === 'ai' || connector.type === 'custom-ai') && (
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
            {connector.type === 'custom-ai' && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>API Endpoint</label>
                <input
                  value={endpoint}
                  onChange={e => setEndpoint(e.target.value)}
                  placeholder="https://your-agent.example.com/api/chat"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>API Key</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 12 }} />
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Paste API key"
                  style={{ ...inputStyle, paddingLeft: 34 }}
                />
              </div>
            </div>
          </div>
        )}

        {connector.type === 'trading' && (
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              This MVP only stores connection status in the browser. OAuth, permissions, balances, and order routing are not enabled here yet.
            </div>
          </div>
        )}

        <button
          onClick={handleConnect}
          style={{
            height: 38,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid #c7d2fe',
            background: '#4f46e5',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          <Link size={14} />
          {connected ? 'Update Connection' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
