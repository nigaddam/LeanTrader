import { useState, useCallback, useRef } from 'react'
import { getStrategy, getStrategyCode, listStrategies, runBacktest, getBacktest, listBacktests } from '../utils/api'

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
      return data
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
  const [savedBacktests, setSavedBacktests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshBacktests = useCallback(async () => {
    try {
      const data = await listBacktests()
      setSavedBacktests(data)
    } catch (e) {
      console.error('Failed to load saved backtests', e)
    }
  }, [])

  const fetchBacktest = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const data = await getBacktest(id)
      setBacktestData(data)
      refreshBacktests()
    } catch (e) {
      setError('Failed to load backtest results')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [refreshBacktests])

  const triggerBacktest = useCallback(async (strategyId, ticker = 'BTC/USD') => {
    if (!strategyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await runBacktest(strategyId, ticker)
      setBacktestData(data)
      refreshBacktests()
      return data
    } catch (e) {
      setError('Backtest failed. Check strategy code.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [refreshBacktests])

  return { backtestData, savedBacktests, loading, error, fetchBacktest, triggerBacktest, refreshBacktests }
}

export function useModels() {
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [selectedCode, setSelectedCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const selectedModelIdRef = useRef(null)

  const refreshModels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listStrategies()
      setModels(data)
      if (!selectedModelIdRef.current && data.length) {
        selectedModelIdRef.current = data[0].id
        setSelectedModel(data[0])
        setSelectedCode(await getStrategyCode(data[0].id))
      }
    } catch (e) {
      setError('Failed to load saved models')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  const selectModel = useCallback(async (modelOrId) => {
    const id = typeof modelOrId === 'object' ? modelOrId.id : modelOrId
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const model = typeof modelOrId === 'object' ? modelOrId : await getStrategy(id)
      const code = await getStrategyCode(id)
      selectedModelIdRef.current = id
      setSelectedModel(model)
      setSelectedCode(code)
      return model
    } catch (e) {
      setError('Failed to load model code')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  return { models, selectedModel, selectedCode, loading, error, refreshModels, selectModel }
}
