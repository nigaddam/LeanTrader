import { useState, useCallback, useEffect, useRef } from 'react'
import {
  listLiveStrategies, getLiveStrategy,
  deployStrategy, stopStrategy,
  getPositions,
} from '../utils/api'

export function useLiveTrading() {
  const [liveStrategies, setLiveStrategies] = useState([])
  const [selectedLive, setSelectedLive] = useState(null)
  const [positions, setPositions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const refreshList = useCallback(async () => {
    try {
      const data = await listLiveStrategies()
      setLiveStrategies(data)
    } catch (e) {
      console.error('Failed to load live strategies', e)
    }
  }, [])

  const selectLive = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getLiveStrategy(id)
      setSelectedLive(data)
    } catch (e) {
      setError('Failed to load live strategy details.')
    } finally {
      setLoading(false)
    }
  }, [])

  const deploy = useCallback(async (strategyId, ticker, amountUsd, confirmLive = false) => {
    setLoading(true)
    setError(null)
    try {
      const data = await deployStrategy(strategyId, ticker, amountUsd, confirmLive)
      await refreshList()
      await selectLive(data.live_strategy_id)
      return data
    } catch (e) {
      setError(e.response?.data?.detail || 'Deploy failed.')
      throw e
    } finally {
      setLoading(false)
    }
  }, [refreshList, selectLive])

  const stop = useCallback(async (liveId) => {
    setLoading(true)
    setError(null)
    try {
      await stopStrategy(liveId)
      await refreshList()
      if (selectedLive?.id === liveId) {
        await selectLive(liveId)
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Stop failed.')
    } finally {
      setLoading(false)
    }
  }, [refreshList, selectLive, selectedLive])

  const refreshPositions = useCallback(async () => {
    try {
      const data = await getPositions()
      setPositions(data)
    } catch (e) {
      console.error('Failed to load positions', e)
    }
  }, [])

  // Auto-refresh selected live strategy every 30s so signal + orders stay fresh
  useEffect(() => {
    if (!selectedLive?.id) return
    pollRef.current = setInterval(() => {
      selectLive(selectedLive.id)
    }, 30_000)
    return () => clearInterval(pollRef.current)
  }, [selectedLive?.id, selectLive])

  return {
    liveStrategies,
    selectedLive,
    positions,
    loading,
    error,
    refreshList,
    selectLive,
    deploy,
    stop,
    refreshPositions,
  }
}
