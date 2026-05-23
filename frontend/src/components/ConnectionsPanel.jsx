import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Link, Plug, RefreshCw, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { OAuth2User } from '@getalby/sdk/oauth'
import { CONNECTORS, findConnector } from '../constants/connections'
import { exchangeAlbyCode, getKrakenConnection, getLightningConfig, getLightningStatus, startKrakenOAuth } from '../utils/api'

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

const KRAKEN_ASSET_LABELS = {
  ZUSD: { symbol: 'USD', name: 'US Dollar Cash', type: 'Cash' },
  USD: { symbol: 'USD', name: 'US Dollar Cash', type: 'Cash' },
  XXBT: { symbol: 'BTC', name: 'Bitcoin', type: 'Crypto' },
  XBT: { symbol: 'BTC', name: 'Bitcoin', type: 'Crypto' },
  XETH: { symbol: 'ETH', name: 'Ethereum', type: 'Crypto' },
  ETH: { symbol: 'ETH', name: 'Ethereum', type: 'Crypto' },
  CC: { symbol: 'CC', name: 'Canton', type: 'Crypto' },
}

const describeKrakenAsset = (code) => {
  if (KRAKEN_ASSET_LABELS[code]) return KRAKEN_ASSET_LABELS[code]
  const normalized = code?.replace(/^Z(?=[A-Z]{3}$)/, '').replace(/^X(?=[A-Z]{3,4}$)/, '') || code
  return { symbol: normalized, name: 'Kraken asset', type: 'Asset' }
}

const formatKrakenAmount = (asset, amount) => {
  const value = Number(amount || 0)
  if (asset === 'ZUSD' || asset === 'USD') {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: value >= 100 ? 3 : 6,
  })
}

export default function ConnectionsPanel({ selectedConnectorId, connectionState, onSelectConnector, onConnect, onDisconnect }) {
  const connector = findConnector(selectedConnectorId)
  const saved = connectionState?.[connector.id] || {}
  const connected = Boolean(saved.connected)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [endpoint, setEndpoint] = useState(saved.endpoint || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [lightningStatus, setLightningStatus] = useState(null)
  const [krakenStatus, setKrakenStatus] = useState(null)
  const [showManualKraken, setShowManualKraken] = useState(false)
  const [krakenNotice, setKrakenNotice] = useState(null)

  useEffect(() => {
    setApiKey('')
    setApiSecret('')
    setEndpoint(saved.endpoint || '')
    setError('')
    if (connector.id === 'kraken') {
      setShowManualKraken(false)
      setKrakenNotice(null)
    }
  }, [connector.id, saved.endpoint])

  useEffect(() => {
    if (connector.id !== 'kraken') return
    getKrakenConnection().then(setKrakenStatus).catch(() => {})
  }, [connector.id, connected])

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

  const refreshKrakenStatus = async () => {
    setSubmitting(true)
    setError('')
    setKrakenNotice(null)
    try {
      const status = await getKrakenConnection()
      setKrakenStatus(status)
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Could not refresh Kraken status.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKrakenOAuth = async () => {
    setSubmitting(true)
    setError('')
    setKrakenNotice(null)
    try {
      const data = await startKrakenOAuth()
      if (data.authorization_url) {
        window.location.href = data.authorization_url
        return
      }
      setShowManualKraken(false)
      setKrakenNotice({
        tone: 'info',
        message: data.message || 'Kraken login connection is not configured yet. For now, use manual API key setup.',
      })
    } catch (err) {
      setKrakenNotice({
        tone: 'error',
        message: err?.response?.data?.detail || err?.message || 'Could not start Kraken login connection.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleKrakenConnect = async () => {
    setSubmitting(true)
    setError('')
    setKrakenNotice(null)
    try {
      await onConnect(connector.id, {
        apiKey,
        apiSecret,
        endpoint,
        connectedAt: new Date().toISOString(),
      })
      const status = await getKrakenConnection()
      setKrakenStatus(status)
      setApiKey('')
      setApiSecret('')
      setKrakenNotice({
        tone: 'success',
        message: 'Kraken connected. Balances were loaded from your read-only API key.',
      })
      setShowManualKraken(false)
    } catch (err) {
      setKrakenNotice({
        tone: 'error',
        message: err?.response?.data?.detail || err?.message || 'Kraken API key validation failed.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleKrakenDisconnect = async () => {
    setSubmitting(true)
    setError('')
    setKrakenNotice(null)
    try {
      await onDisconnect(connector.id)
      setKrakenStatus({ connected: false, balance: {}, positions: [] })
      setKrakenNotice({ tone: 'info', message: 'Kraken disconnected.' })
    } catch (err) {
      setKrakenNotice({ tone: 'error', message: err?.response?.data?.detail || err?.message || 'Disconnect failed.' })
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
  const isKraken = connector.id === 'kraken'
  const effectiveKraken = krakenStatus || {}
  const krakenConnected = Boolean(effectiveKraken.connected)
  const displayedConnected = isKraken ? krakenConnected : connected
  const accent = isAlby ? '#7c3aed' : '#4f46e5'
  const albyUser = lightningStatus?.user_wallet || {}
  const albyAgent = lightningStatus?.agent_wallet || saved.agentWallet || {}
  const krakenBalance = effectiveKraken.balance || {}
  const krakenHoldings = Object.entries(krakenBalance)
    .map(([code, amount]) => ({ code, amount: Number(amount), ...describeKrakenAsset(code) }))
    .sort((a, b) => (a.symbol === 'USD' ? -1 : b.symbol === 'USD' ? 1 : a.symbol.localeCompare(b.symbol)))
  const krakenUsdCash = Number(krakenBalance.ZUSD ?? krakenBalance.USD ?? 0)
  const connectorCards = CONNECTORS.filter(item => ['kraken', 'alby', 'coinbase'].includes(item.id))
  const cardStatus = (item) => {
    if (item.id === 'kraken' && isKraken) return krakenConnected
    if (item.id === 'alby' && isAlby) return connected
    return Boolean(connectionState?.[item.id]?.connected)
  }
  const cardIcon = (item) => item.id === 'alby' ? Zap : Plug

  return (
    <div style={{ height: '100%', background: '#ffffff', padding: 24, overflowY: 'auto' }}>
      <div style={{ maxWidth: 960 }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#263647' }}>Connect</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
            Link accounts and wallets that power portfolio, orders, and trading workflows.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 22 }}>
          {connectorCards.map(item => {
            const CardIcon = cardIcon(item)
            const isActive = connector.id === item.id
            const isConnected = cardStatus(item)
            return (
              <button
                key={item.id}
                onClick={() => onSelectConnector?.(item.id)}
                style={{
                  minHeight: 116,
                  border: `1px solid ${isActive ? '#c7d2fe' : '#e5eaf1'}`,
                  borderRadius: 10,
                  background: isActive ? '#f8fbff' : '#ffffff',
                  padding: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 8px 22px rgba(79, 70, 229, 0.08)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: isConnected ? '#dcfce7' : '#eef2ff', color: isConnected ? '#16a34a' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isConnected ? <CheckCircle2 size={18} /> : <CardIcon size={18} />}
                  </div>
                  <span style={{ borderRadius: 999, padding: '4px 8px', background: isConnected ? '#dcfce7' : '#f1f5f9', color: isConnected ? '#16a34a' : '#64748b', fontSize: 11, fontWeight: 850 }}>
                    {isConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#263647', marginTop: 12 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 1.45 }}>{item.description}</div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: displayedConnected ? '#dcfce7' : isAlby ? '#f3e8ff' : '#eef2ff',
              color: displayedConnected ? '#16a34a' : accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {displayedConnected ? <CheckCircle2 size={20} /> : isAlby ? <Zap size={20} /> : <Plug size={20} />}
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 850, color: '#263647' }}>{connector.name}</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
                {connector.group}{isKraken && effectiveKraken.mode ? ` · ${effectiveKraken.mode}` : !isKraken && saved.mode ? ` · ${saved.mode}` : ''}{!isKraken && saved.keyPreview ? ` · ${saved.keyPreview}` : ''}
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: 999,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 800,
            color: displayedConnected ? '#16a34a' : '#64748b',
            background: displayedConnected ? '#dcfce7' : '#f1f5f9',
          }}>
            {displayedConnected ? 'Connected' : 'Not Connected'}
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

        {isKraken && (
          <>
            <div style={{ border: '1px solid #dbeafe', borderRadius: 10, padding: 18, background: '#f8fbff', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <ShieldCheck size={20} color="#2563eb" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 850, color: '#263647', marginBottom: 5 }}>Connect Kraken Account</div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    Connect your Kraken account securely. We'll start in paper trading mode and never request withdrawal permissions.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: krakenConnected ? 14 : 0 }}>
                <button
                  onClick={handleKrakenOAuth}
                  disabled={submitting}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #2563eb',
                    background: submitting ? '#93c5fd' : '#2563eb',
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <Link size={14} />
                  {submitting ? 'Connecting...' : 'Connect Kraken Account'}
                </button>
                <button
                  onClick={() => {
                    setShowManualKraken(prev => !prev)
                    setKrakenNotice(null)
                  }}
                  disabled={submitting}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #d8e1eb',
                    background: '#f8fafc',
                    color: '#64748b',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <KeyRound size={14} />
                  Enter API Key Manually
                </button>
                {krakenConnected && (
                  <>
                    <button
                      onClick={refreshKrakenStatus}
                      disabled={submitting}
                      style={{ height: 38, width: 38, borderRadius: 8, border: '1px solid #d8e1eb', background: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer', color: '#64748b' }}
                      title="Refresh Kraken balances"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={handleKrakenDisconnect}
                      disabled={submitting}
                      style={{ height: 38, padding: '0 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#ffffff', color: '#dc2626', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 800 }}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>

              {krakenNotice && (
                <div style={{
                  border: `1px solid ${krakenNotice.tone === 'error' ? '#fecaca' : krakenNotice.tone === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
                  background: krakenNotice.tone === 'error' ? '#fef2f2' : krakenNotice.tone === 'success' ? '#f0fdf4' : '#eff6ff',
                  color: krakenNotice.tone === 'error' ? '#dc2626' : krakenNotice.tone === 'success' ? '#15803d' : '#2563eb',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontWeight: 700,
                  marginTop: 14,
                }}>
                  {krakenNotice.message}
                </div>
              )}

              {krakenConnected && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Connection</div>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{effectiveKraken.key_preview || 'Connected'}</div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Mode</div>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>{effectiveKraken.mode || 'SANDBOX'} · Paper trading</div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 12, background: '#ffffff' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 800, marginBottom: 5 }}>Permissions</div>
                    <div style={{ fontSize: 13, color: '#263647', fontWeight: 800 }}>Read balances · No withdrawals</div>
                  </div>
                </div>
              )}
            </div>

            {krakenConnected && (
              <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 850, color: '#263647', marginBottom: 4 }}>Kraken Account Summary</div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Read-only connection. Paper trading is enabled, so strategy orders are simulated locally.
                    </div>
                  </div>
                  <button
                    onClick={refreshKrakenStatus}
                    disabled={submitting}
                    style={{ height: 34, padding: '0 11px', borderRadius: 8, border: '1px solid #d8e1eb', background: '#ffffff', cursor: submitting ? 'not-allowed' : 'pointer', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800 }}
                  >
                    <RefreshCw size={13} />
                    Refresh
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 18 }}>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 14, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 6 }}>USD Cash</div>
                    <div style={{ fontSize: 20, color: '#263647', fontWeight: 900, fontFamily: 'JetBrains Mono' }}>
                      {formatKrakenAmount('ZUSD', krakenUsdCash)}
                    </div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 14, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 6 }}>Assets</div>
                    <div style={{ fontSize: 20, color: '#263647', fontWeight: 900 }}>{krakenHoldings.length}</div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 14, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 6 }}>Trading Mode</div>
                    <div style={{ fontSize: 14, color: '#263647', fontWeight: 900 }}>{effectiveKraken.mode || 'SANDBOX'} · Paper</div>
                  </div>
                  <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, padding: 14, background: '#fbfcfe' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 850, marginBottom: 6 }}>Permissions</div>
                    <div style={{ fontSize: 14, color: '#263647', fontWeight: 900 }}>Balances only</div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e5eaf1', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 12, padding: '10px 12px', background: '#f8fafc', color: '#94a3b8', fontSize: 11, fontWeight: 850 }}>
                    <div>Holding</div>
                    <div>Balance</div>
                    <div>Type</div>
                  </div>
                  {krakenHoldings.length ? krakenHoldings.map((holding) => (
                    <div key={holding.code} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 12, alignItems: 'center', padding: '12px', borderTop: '1px solid #e5eaf1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: holding.symbol === 'USD' ? '#dcfce7' : '#eef2ff', color: holding.symbol === 'USD' ? '#16a34a' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>
                          {holding.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: '#263647', fontWeight: 850 }}>{holding.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Kraken code: {holding.code}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: '#263647', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                        {formatKrakenAmount(holding.code, holding.amount)}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>{holding.type}</div>
                    </div>
                  )) : (
                    <div style={{ padding: 14, fontSize: 13, color: '#64748b', borderTop: '1px solid #e5eaf1' }}>
                      Connected, but no non-zero balances were returned.
                    </div>
                  )}
                </div>
              </div>
            )}

            {showManualKraken && (
              <div style={{ border: '1px solid #e5eaf1', borderRadius: 10, padding: 18, background: '#ffffff', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 850, color: '#263647', marginBottom: 12 }}>Manual API Key</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={labelStyle}>API Key</label>
                    <div style={{ position: 'relative' }}>
                      <KeyRound size={14} color="#94a3b8" style={{ position: 'absolute', left: 11, top: 12 }} />
                      <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={krakenConnected ? 'Paste new API key to update' : 'Paste API key'}
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
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 14 }}>
                  Use this only if Kraken login connection is not available. Create a read-only Kraken API key with Query Funds permission.
                </div>
                <button
                  onClick={handleKrakenConnect}
                  disabled={submitting || !apiKey || !apiSecret}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: 8,
                    border: '1px solid #c7d2fe',
                    background: submitting || !apiKey || !apiSecret ? '#c7d2fe' : '#4f46e5',
                    color: '#ffffff',
                    cursor: submitting || !apiKey || !apiSecret ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  <Link size={14} />
                  {submitting ? 'Validating...' : krakenConnected ? 'Update API Key' : 'Validate and Connect'}
                </button>
              </div>
            )}
          </>
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

        {!isAlby && !isKraken && (
          <button
            onClick={handleConnect}
            disabled={disabled}
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
        )}
      </div>
    </div>
  )
}
