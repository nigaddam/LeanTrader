import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Link, Plug, Wallet, Zap } from 'lucide-react'
import { OAuth2User } from '@getalby/sdk/oauth'
import { findConnector } from '../constants/connections'
import { exchangeAlbyCode, getLightningConfig, getLightningStatus } from '../utils/api'

const waitForOAuthCode = (popup, redirectUri) => new Promise((resolve, reject) => {
  const redirect = new URL(redirectUri)
  const timer = setInterval(() => {
    if (popup.closed) {
      clearInterval(timer)
      reject(new Error('Alby connection was cancelled.'))
      return
    }
    try {
      const current = new URL(popup.location.href)
      if (current.origin === redirect.origin && current.pathname === redirect.pathname) {
        const error = current.searchParams.get('error')
        const code = current.searchParams.get('code')
        clearInterval(timer)
        popup.close()
        if (error) reject(new Error(error))
        else if (code) resolve(code)
        else reject(new Error('No OAuth code returned by Alby.'))
      }
    } catch {
      // Cross-origin while the popup is on getalby.com; keep polling.
    }
  }, 500)
})

export default function ConnectionsPanel({ selectedConnectorId, connectionState, onConnect, onDisconnect }) {
  const connector = findConnector(selectedConnectorId)
  const saved = connectionState?.[connector.id] || {}
  const connected = Boolean(saved.connected)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [endpoint, setEndpoint] = useState(saved.endpoint || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lightningStatus, setLightningStatus] = useState(null)

  useEffect(() => {
    setApiKey('')
    setApiSecret('')
    setEndpoint(saved.endpoint || '')
    setError('')
  }, [connector.id, saved.endpoint])

  useEffect(() => {
    if (connector.id !== 'alby') return
    getLightningStatus().then(setLightningStatus).catch(() => {})
  }, [connector.id, connected])

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

  const handleConnect = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onConnect(connector.id, {
        apiKey,
        apiSecret,
        endpoint,
        connectedAt: new Date().toISOString(),
      })
      setApiKey('')
      setApiSecret('')
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Connection failed.'
      setError(detail)
    } finally {
      setSubmitting(false)
    }
  }

  const handleAlbyConnect = async () => {
    setSubmitting(true)
    setError('')
    try {
      const config = await getLightningConfig()
      if (!config.client_id) {
        throw new Error('ALBY_CLIENT_ID is missing. Add it to .env and restart the backend.')
      }
      const oauth = new OAuth2User({
        client_id: config.client_id,
        callback: config.redirect_uri,
        scopes: config.scopes,
        user_agent: 'LangStock/0.1',
      })
      const authUrl = await oauth.generateAuthURL({ code_challenge_method: 'S256' })
      const popup = window.open(authUrl, 'langstock-alby-oauth', 'width=520,height=720')
      if (!popup) throw new Error('Popup blocked. Allow popups for this localhost app and try again.')

      const code = await waitForOAuthCode(popup, config.redirect_uri)
      const data = await exchangeAlbyCode(code, oauth.code_verifier || '')
      const status = await getLightningStatus()
      setLightningStatus(status)
      await onConnect(connector.id, {
        walletId: data.identifier || data.wallet_id,
        identifierPreview: data.identifier_preview,
        balanceSats: data.balance_sats,
        agentWallet: status.agent_wallet,
      })
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Alby connection failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAlbyDisconnect = async () => {
    setSubmitting(true)
    setError('')
    try {
      await onDisconnect(connector.id)
      const status = await getLightningStatus()
      setLightningStatus(status)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Disconnect failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const needsKrakenSecrets = connector.id === 'kraken' && (!apiKey || !apiSecret)
  const needsAiKey = (connector.type === 'ai' || connector.type === 'custom-ai') && !apiKey
  const needsEndpoint = connector.type === 'custom-ai' && !endpoint
  const disabled = submitting || needsKrakenSecrets || needsAiKey || needsEndpoint
  const isAlby = connector.id === 'alby'
  const accent = isAlby ? '#7c3aed' : '#4f46e5'
  const albyUser = lightningStatus?.user_wallet || {}
  const albyAgent = lightningStatus?.agent_wallet || saved.agentWallet || {}

  return (
    <div style={{ height: '100%', background: '#ffffff', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 760 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: connected ? '#dcfce7' : isAlby ? '#f3e8ff' : '#eef2ff',
              color: connected ? '#16a34a' : accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {connected ? <CheckCircle2 size={20} /> : isAlby ? <Zap size={20} /> : <Plug size={20} />}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 850, color: '#263647' }}>{connector.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                {connector.group}{saved.mode ? ` · ${saved.mode}` : ''}{saved.keyPreview ? ` · ${saved.keyPreview}` : ''}
              </div>
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

        {isAlby && (
          <>
            <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 850, color: '#263647' }}>User Wallet</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Pay for LangStock services, including future backtest fees.
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

              {connected && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Wallet</div>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{albyUser.identifier || saved.walletId || saved.keyPreview}</div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Balance</div>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{Number(albyUser.balance_sats ?? saved.balanceSats ?? 0).toLocaleString()} sats</div>
                  </div>
                </div>
              )}

              <button
                onClick={handleAlbyConnect}
                disabled={submitting}
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 8,
                  border: '1px solid #c4b5fd',
                  background: submitting ? '#c4b5fd' : '#7c3aed',
                  color: '#ffffff',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 800,
                  marginRight: 10,
                }}
              >
                <Zap size={14} />
                {submitting ? 'Connecting…' : connected ? 'Update Alby Wallet' : 'Connect with Alby'}
              </button>
              {connected && (
                <button
                  onClick={handleAlbyDisconnect}
                  disabled={submitting}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d8e1eb',
                    background: '#ffffff',
                    color: '#64748b',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>

            <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Wallet size={15} color="#7c3aed" />
                <div style={{ fontSize: 14, fontWeight: 850, color: '#263647' }}>Agent Wallet</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 12 }}>
                This is LangStock's agent wallet — used to receive payments for backtests.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#fbfcfe' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Address</div>
                  <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{albyAgent.address || 'Not configured'}</div>
                </div>
                <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#fbfcfe' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Balance</div>
                  <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{Number(albyAgent.balance_sats || 0).toLocaleString()} sats</div>
                </div>
              </div>
            </div>
          </>
        )}

        {connector.id === 'kraken' && (
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>API Key</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 12 }} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={connected ? 'Paste new API key to update' : 'Paste API key'}
                    style={{ ...inputStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Private Key / API Secret</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 12 }} />
                  <input
                    type="password"
                    value={apiSecret}
                    onChange={e => setApiSecret(e.target.value)}
                    placeholder="Paste private key"
                    style={{ ...inputStyle, paddingLeft: 34 }}
                  />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              Keys are validated by the backend with Kraken and kept only in the running server session.
              Use API permissions for balance and trading only. Do not enable withdrawals.
            </div>
          </div>
        )}

        {connector.type === 'trading' && connector.id !== 'kraken' && (
          <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
              This connector is a placeholder for now. Kraken is the first trading connection wired to the backend.
            </div>
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
            borderRadius: 8, padding: '10px 12px', fontSize: 13, fontWeight: 700,
            marginBottom: 16,
          }}>
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <button
          onClick={handleConnect}
          disabled={disabled || isAlby}
          hidden={isAlby}
          style={{
            height: 38,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid #c7d2fe',
            background: disabled ? '#c7d2fe' : '#4f46e5',
            color: '#ffffff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          <Link size={14} />
          {submitting ? 'Connecting…' : connected ? 'Update Connection' : 'Connect'}
        </button>
      </div>
    </div>
  )
}
