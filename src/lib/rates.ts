import { useEffect, useState } from 'react'

const KEY = 'ledger.rate'
const FALLBACK = 58
const REFRESH_MS = 10 * 60 * 1000

interface Cached {
  rate: number
  fetchedAt: number
  asOf: string
}

function load(): Cached | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}

export function useRate() {
  const [cached, setCached] = useState<Cached | null>(load)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function refresh() {
      try {
        const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=PHP')
        const json = await res.json()
        const rate = json?.rates?.PHP
        if (typeof rate !== 'number') throw new Error('bad rate')
        const next = { rate, fetchedAt: Date.now(), asOf: json.date }
        localStorage.setItem(KEY, JSON.stringify(next))
        if (!cancelled) { setCached(next); setError(false) }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    refresh()
    const t = setInterval(refresh, REFRESH_MS)
    const onOnline = () => refresh()
    window.addEventListener('online', onOnline)
    return () => { cancelled = true; clearInterval(t); window.removeEventListener('online', onOnline) }
  }, [])

  return {
    rate: cached?.rate ?? FALLBACK,
    asOf: cached?.asOf,
    fetchedAt: cached?.fetchedAt,
    isFallback: !cached,
    error,
  }
}
