import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import {
  addAdminAsset,
  listAdminAssets,
  listAdminRuns,
  refreshAdminAsset,
  triggerAdminRefresh,
  updateAdminAsset,
} from '../utils/api'

const SECRET_KEY = 'lt_admin_api_secret'

const pill = (status) => {
  const colors = {
    success: ['#dcfce7', '#166534'],
    failed: ['#fee2e2', '#991b1b'],
    running: ['#dbeafe', '#1d4ed8'],
    fresh: ['#dcfce7', '#166534'],
    stale: ['#fef3c7', '#92400e'],
    missing: ['#f1f5f9', '#475569'],
  }
  const [bg, fg] = colors[status] || ['#f1f5f9', '#475569']
  return { background: bg, color: fg }
}

function SecretBar({ secret, setSecret }) {
  const [draft, setDraft] = useState(secret)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc' }}>
      <ShieldCheck size={18} color="#2563eb" />
      <input
        type="password"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder="X-Admin-Secret (optional in local dev)"
        style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 11px', fontSize: 13 }}
      />
      <button
        onClick={() => { sessionStorage.setItem(SECRET_KEY, draft); setSecret(draft) }}
        style={{ border: 'none', borderRadius: 8, background: '#0f172a', color: '#fff', padding: '9px 14px', fontWeight: 700, cursor: 'pointer' }}
      >
        Save
      </button>
    </div>
  )
}

export default function DataAdminPanel() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(SECRET_KEY) || '')
  const [runs, setRuns] = useState([])
  const [assets, setAssets] = useState([])
  const [runFilter, setRunFilter] = useState({ status: '', failed_only: false })
  const [assetFilter, setAssetFilter] = useState({ enabled_only: false, production_only: false, stale_only: false, provider: '', asset_type: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ symbol: '', name: '', asset_type: 'stock', provider: 'yfinance', provider_symbol: '', enabled: true, production_enabled: true })

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const [runData, assetData] = await Promise.all([
        listAdminRuns({ ...runFilter, limit: 50 }, secret),
        listAdminAssets(assetFilter, secret),
      ])
      setRuns(runData.runs || [])
      setAssets(assetData.assets || [])
    } catch (err) {
      setMessage(err.response?.data?.detail || err.message || 'Failed to load data admin state')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAssets = useMemo(() => assets, [assets])

  const refreshBatch = async (assetType) => {
    setLoading(true)
    try {
      await triggerAdminRefresh(assetType, secret)
      setMessage(`Queued ${assetType || 'all'} refresh`)
      await load()
    } catch (err) {
      setMessage(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAsset = async (asset, patch) => {
    await updateAdminAsset(asset.symbol, patch, secret)
    await load()
  }

  const addAsset = async (e) => {
    e.preventDefault()
    if (!form.symbol.trim() || !form.name.trim()) {
      setMessage('Symbol and name are required.')
      return
    }
    try {
      await addAdminAsset(form, secret)
      setForm({ symbol: '', name: '', asset_type: 'stock', provider: 'yfinance', provider_symbol: '', enabled: true, production_enabled: true })
      setMessage('Asset added.')
      await load()
    } catch (err) {
      setMessage(err.response?.data?.detail || err.message)
    }
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#ffffff', padding: 28 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: -0.6, color: '#0f172a' }}>Data Operations</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>Lightweight controls for asset refreshes, stale data, and job history.</p>
        </div>

        <SecretBar secret={secret} setSecret={setSecret} />

        {message && (
          <div style={{ padding: 12, borderRadius: 10, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', fontSize: 13, fontWeight: 700 }}>
            {message}
          </div>
        )}

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Recent Data Runs</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Newest first. Use this when a refresh looks odd.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select value={runFilter.status} onChange={e => setRunFilter({ ...runFilter, status: e.target.value, failed_only: false })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8 }}>
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
              <button onClick={() => setRunFilter({ ...runFilter, failed_only: !runFilter.failed_only, status: '' })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: runFilter.failed_only ? '#fee2e2' : '#fff', padding: '8px 10px', cursor: 'pointer' }}>Failed only</button>
              <button onClick={load} disabled={loading} style={{ border: 'none', borderRadius: 8, background: '#0f172a', color: '#fff', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Refresh</button>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', textAlign: 'left' }}>
              <tr>{['Started', 'Job', 'Status', 'Assets', 'Success', 'Failed', 'Duration', 'Error'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{run.started_at ? new Date(run.started_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{run.job_name}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}><span style={{ ...pill(run.status), borderRadius: 999, padding: '3px 8px', fontWeight: 800 }}>{run.status}</span></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{run.asset_count ?? '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{run.success_count ?? '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{run.failure_count ?? '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{run.duration_seconds ? `${run.duration_seconds}s` : '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', color: '#b91c1c' }}>{run.error_message || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Asset Health</h2>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: 12 }}>Enable, production-toggle, and manually refresh individual assets.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => refreshBatch('stock')} style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>Refresh stocks</button>
              <button onClick={() => refreshBatch('crypto')} style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>Refresh crypto</button>
              <button onClick={() => refreshBatch('candles')} style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '8px 10px', cursor: 'pointer' }}>Refresh candles</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <Search size={15} color="#94a3b8" />
            <select value={assetFilter.asset_type} onChange={e => setAssetFilter({ ...assetFilter, asset_type: e.target.value })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8 }}>
              <option value="">All types</option><option value="stock">Stock</option><option value="etf">ETF</option><option value="crypto">Crypto</option>
            </select>
            <select value={assetFilter.provider} onChange={e => setAssetFilter({ ...assetFilter, provider: e.target.value })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 8 }}>
              <option value="">All providers</option><option value="yfinance">yfinance</option><option value="kraken">Kraken</option>
            </select>
            {[
              ['enabled_only', 'Enabled only'],
              ['production_only', 'Production only'],
              ['stale_only', 'Stale/missing only'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569' }}>
                <input type="checkbox" checked={assetFilter[key]} onChange={e => setAssetFilter({ ...assetFilter, [key]: e.target.checked })} /> {label}
              </label>
            ))}
            <button onClick={load} style={{ marginLeft: 'auto', border: 'none', borderRadius: 8, background: '#334155', color: '#fff', padding: '8px 12px', cursor: 'pointer' }}>Apply</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: '#fff', color: '#64748b', textAlign: 'left' }}>
              <tr>{['Symbol', 'Name', 'Type', 'Provider', 'Enabled', 'Prod', 'Latest price', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: 12, borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => (
                <tr key={asset.symbol}>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9', fontWeight: 800 }}>{asset.symbol}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{asset.name}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{asset.type}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{asset.provider}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}><input type="checkbox" checked={asset.enabled} onChange={e => toggleAsset(asset, { enabled: e.target.checked })} /></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}><input type="checkbox" checked={asset.production_enabled} onChange={e => toggleAsset(asset, { production_enabled: e.target.checked })} /></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}>{asset.last_updated_at ? new Date(asset.last_updated_at).toLocaleString() : '-'}</td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}><span style={{ ...pill(asset.refresh_status), borderRadius: 999, padding: '3px 8px', fontWeight: 800 }}>{asset.refresh_status}</span></td>
                  <td style={{ padding: 12, borderBottom: '1px solid #f1f5f9' }}><button onClick={async () => { await refreshAdminAsset(asset.symbol, secret); await load() }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 9px', cursor: 'pointer' }}>Refresh</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Add Asset</h2>
          <form onSubmit={addAsset} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1.5fr 130px 140px 150px', gap: 10, alignItems: 'center' }}>
            <input value={form.symbol} onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="Symbol" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
            <select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}><option value="stock">Stock</option><option value="etf">ETF</option><option value="crypto">Crypto</option></select>
            <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }}><option value="yfinance">yfinance</option><option value="kraken">Kraken</option></select>
            <input value={form.provider_symbol} onChange={e => setForm({ ...form, provider_symbol: e.target.value })} placeholder="Provider symbol" style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: 10 }} />
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Enabled</label>
            <label style={{ fontSize: 12 }}><input type="checkbox" checked={form.production_enabled} onChange={e => setForm({ ...form, production_enabled: e.target.checked })} /> Production enabled</label>
            <button type="submit" style={{ gridColumn: 'span 2', border: 'none', borderRadius: 8, background: '#2563eb', color: '#fff', padding: '10px 12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Plus size={15} /> Add asset</button>
          </form>
        </section>
      </div>
    </div>
  )
}
