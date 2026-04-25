import { useState, useCallback } from 'react'
import { getStrategy, getStrategyCode, runBacktest, getBacktest } from '../utils/api'

export function useStrategy() {
  const [strategy, setStrategy] = useState(null)
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchStrategy = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getStrategy(id)
      setStrategy(data)
      const codeData = await getStrategyCode(id)
      setCode(codeData)
    } catch (e) {
      console.error('Failed to fetch strategy', e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { strategy, code, loading, fetchStrategy }
}

export function useBacktest() {
  const [backtestData, setBacktestData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchBacktest = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getBacktest(id)
      setBacktestData(data)
    } catch (e) {
      setError('Failed to load backtest results')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const triggerBacktest = useCallback(async (strategyId) => {
    if (!strategyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await runBacktest(strategyId)
      setBacktestData(data)
      return data
    } catch (e) {
      setError('Backtest failed. Check strategy code.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { backtestData, loading, error, fetchBacktest, triggerBacktest }
}
