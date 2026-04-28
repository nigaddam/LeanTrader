import { useState, useEffect, useCallback } from 'react'

const AUTH_KEY = 'lt_auth_token'
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchMe = useCallback(async (token) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setUser(await res.json())
      } else {
        localStorage.removeItem(AUTH_KEY)
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    // After OAuth redirect, backend appends ?token=JWT to the frontend URL
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      localStorage.setItem(AUTH_KEY, urlToken)
      window.history.replaceState({}, '', window.location.pathname)
      fetchMe(urlToken)
      return
    }

    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      fetchMe(stored)
    } else {
      setAuthLoading(false)
    }
  }, [fetchMe])

  const signIn = useCallback(() => {
    window.location.href = `${BACKEND_URL}/api/auth/google`
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_KEY)
    setUser(null)
  }, [])

  return { user, authLoading, signIn, signOut }
}
