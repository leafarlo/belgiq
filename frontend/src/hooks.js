/**
 * useBelgiQ — central data fetching hooks
 *
 * In development: Vite proxies /api/* to FastAPI on port 8000
 * In production:  Nginx routes /api/* to FastAPI on port 8000
 *
 * Usage:
 *   const { data: bills, loading, error } = useBills({ source: 'federal' })
 */

import { useState, useEffect, useCallback } from 'react'

const BASE = '/api'

// ── Generic fetch hook ────────────────────────────────────────────────────────

function useFetch(url, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(async () => {
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { load() }, [load, ...deps])

  return { data, loading, error, refetch: load }
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export function useBills({ source, theme, status, limit = 50 } = {}) {
  const params = new URLSearchParams()
  if (source) params.set('source', source)
  if (theme)  params.set('theme', theme)
  if (status) params.set('status', status)
  params.set('limit', limit)

  return useFetch(`${BASE}/bills?${params}`, [source, theme, status, limit])
}

export function useBill(id) {
  return useFetch(id ? `${BASE}/bills/${id}` : null, [id])
}

// ── Politicians ───────────────────────────────────────────────────────────────

export function usePoliticians({ region, party, government } = {}) {
  const params = new URLSearchParams()
  if (region)     params.set('region', region)
  if (party)      params.set('party', party)
  if (government) params.set('government', government)

  return useFetch(`${BASE}/politicians?${params}`, [region, party, government])
}

export function usePolitician(id) {
  return useFetch(id ? `${BASE}/politicians/${id}` : null, [id])
}

// ── Parties ───────────────────────────────────────────────────────────────────

export function useParties() {
  return useFetch(`${BASE}/parties`)
}

// ── Budget ────────────────────────────────────────────────────────────────────

export function useBudget(governmentId = 'federal', year = 2024) {
  return useFetch(`${BASE}/budget?government_id=${governmentId}&year=${year}`, [governmentId, year])
}

// ── Pipeline status ───────────────────────────────────────────────────────────

export function usePipelineStatus() {
  return useFetch(`${BASE}/pipeline/status`)
}
