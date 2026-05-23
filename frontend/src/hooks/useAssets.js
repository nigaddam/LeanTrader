import { useCallback, useEffect, useRef, useState } from 'react'
import { listAssets } from '../utils/api'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 min

export default function useAssets(assetType = null) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  const fetch = useCallback(async () => {
    try {
      const data = await listAssets(assetType ? { asset_type: assetType } : {})
      setAssets(data.assets || [])
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [assetType])

  useEffect(() => {
    setLoading(true)
    fetch()
    timerRef.current = setInterval(fetch, POLL_INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [fetch])

  return { assets, loading, error, refresh: fetch, lastUpdated }
}
