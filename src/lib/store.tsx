import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Settings, SplitLine, Transaction } from './types'
import { today } from './money'
import { supabase } from './supabase'
import { SHARED_KEYS, enqueueOp, fetchAll, loadQueue, runOp, saveQueue, type Op, type SharedSettings } from './remote'

const TX_KEY = 'ledger.transactions'
const SET_KEY = 'ledger.settings'
const MIGRATED_KEY = 'ledger.migrated'

export const defaultSettings: Settings = {
  rules: [
    { id: 'tithes', label: 'Tithes', percent: 10 },
    { id: 'savings', label: 'Savings', percent: 30 },
  ],
  presets: [
    { label: 'Partner share', percent: 50 },
    { label: 'Referral', percent: 10 },
  ],
  channelFees: {
    PayPal: { mode: 'percent', value: 4.4 },
    Wise: { mode: 'percent', value: 0.6 },
    GCash: { mode: 'percent', value: 0 },
    Bank: { mode: 'flat', value: 0 },
    Other: { mode: 'percent', value: 0 },
  },
  displayCurrency: 'PHP',
  theme: 'light',
  me: 'Me',
  members: ['Me', 'Partner'],
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export type SyncStatus = 'local' | 'synced' | 'syncing' | 'offline'

interface Ctx {
  transactions: Transaction[]
  settings: Settings
  sync: { status: SyncStatus; queued: number }
  addTransaction: (tx: Transaction) => void
  deleteTransaction: (id: string) => void
  restoreTransaction: (tx: Transaction) => void
  addSplit: (txId: string, line: SplitLine) => void
  removeSplit: (txId: string, lineId: string) => void
  allocate: (txId: string, lineId?: string) => void
  unallocate: (txId: string, lineId: string) => void
  setDestination: (txId: string, lineId: string, destination: string) => void
  updateSettings: (patch: Partial<Settings>) => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => read(TX_KEY, []))
  const [settings, setSettings] = useState<Settings>(() => ({ ...defaultSettings, ...read(SET_KEY, {}) }))
  const [status, setStatus] = useState<SyncStatus>(supabase ? 'syncing' : 'local')
  const [queued, setQueued] = useState(0)

  const txRef = useRef(transactions)
  const setRef = useRef(settings)
  const queueRef = useRef<Op[]>(loadQueue())
  const flushing = useRef(false)

  useEffect(() => { txRef.current = transactions; localStorage.setItem(TX_KEY, JSON.stringify(transactions)) }, [transactions])
  useEffect(() => { setRef.current = settings; localStorage.setItem(SET_KEY, JSON.stringify(settings)) }, [settings])
  useEffect(() => { document.documentElement.dataset.theme = settings.theme }, [settings.theme])

  /** Overlay not-yet-synced local changes on top of what the server returned. */
  const overlay = (remote: Transaction[]) => {
    let out = remote
    for (const op of queueRef.current) {
      if (op.kind === 'delete') out = out.filter((t) => t.id !== op.id)
      else if (op.kind === 'upsert') out = [op.tx, ...out.filter((t) => t.id !== op.tx.id)]
    }
    return out
  }

  const refresh = useCallback(async () => {
    if (!supabase) return
    try {
      const { transactions: remote, shared } = await fetchAll()
      setTransactions(overlay(remote))
      if (!queueRef.current.some((o) => o.kind === 'settings')) {
        const patch: Partial<Settings> = {}
        for (const k of SHARED_KEYS) if (shared[k] !== undefined) (patch as Record<string, unknown>)[k] = shared[k]
        if (Object.keys(patch).length) setSettings((s) => ({ ...s, ...patch }))
      }
    } catch {
      setStatus('offline')
    }
  }, [])

  const flush = useCallback(async () => {
    if (!supabase || flushing.current) return
    flushing.current = true
    setStatus('syncing')
    try {
      while (queueRef.current.length) {
        await runOp(queueRef.current[0])
        queueRef.current = queueRef.current.slice(1)
        saveQueue(queueRef.current)
        setQueued(queueRef.current.length)
      }
      setStatus('synced')
    } catch {
      setStatus('offline')
    } finally {
      flushing.current = false
    }
  }, [])

  const push = useCallback((op: Op) => {
    if (!supabase) return
    queueRef.current = enqueueOp(queueRef.current, op)
    saveQueue(queueRef.current)
    setQueued(queueRef.current.length)
    flush()
  }, [flush])

  // Initial sync, realtime, reconnect handling
  useEffect(() => {
    if (!supabase) return
    // One-time: push anything logged on this device before sync existed
    if (!localStorage.getItem(MIGRATED_KEY)) {
      for (const tx of txRef.current) queueRef.current = enqueueOp(queueRef.current, { kind: 'upsert', tx })
      saveQueue(queueRef.current)
      localStorage.setItem(MIGRATED_KEY, '1')
    }
    setQueued(queueRef.current.length)
    flush().then(refresh)

    let t: number | undefined
    const soon = () => { window.clearTimeout(t); t = window.setTimeout(refresh, 300) }
    const channel = supabase
      .channel('ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, soon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_settings' }, soon)
      .subscribe()
    const retry = () => flush().then(refresh)
    window.addEventListener('online', retry)
    const poll = window.setInterval(retry, 60_000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(poll)
      window.removeEventListener('online', retry)
      supabase?.removeChannel(channel)
    }
  }, [flush, refresh])

  const value = useMemo<Ctx>(() => {
    /** Apply a change to one transaction locally and queue it for the server. */
    const edit = (id: string, fn: (t: Transaction) => Transaction) => {
      const cur = txRef.current.find((t) => t.id === id)
      if (!cur) return
      const next = fn(cur)
      setTransactions((all) => all.map((t) => (t.id === id ? next : t)))
      push({ kind: 'upsert', tx: next })
    }
    const editLines = (txId: string, lineId: string | undefined, fn: (l: SplitLine) => SplitLine) =>
      edit(txId, (t) => ({ ...t, splits: t.splits.map((l) => (lineId === undefined || l.id === lineId ? fn(l) : l)) }))
    const create = (tx: Transaction) => {
      setTransactions((all) => (all.some((t) => t.id === tx.id) ? all : [tx, ...all]))
      push({ kind: 'upsert', tx })
    }

    return {
      transactions,
      settings,
      sync: { status, queued },
      addTransaction: create,
      restoreTransaction: create,
      deleteTransaction: (id) => {
        setTransactions((all) => all.filter((t) => t.id !== id))
        push({ kind: 'delete', id })
      },
      addSplit: (txId, line) => edit(txId, (t) => ({ ...t, splits: [...t.splits, line] })),
      removeSplit: (txId, lineId) => edit(txId, (t) => ({ ...t, splits: t.splits.filter((l) => l.id !== lineId) })),
      allocate: (txId, lineId) =>
        editLines(txId, lineId, (l) =>
          l.status === 'allocated' ? l : { ...l, status: 'allocated', allocatedAt: today(), allocatedBy: settings.me },
        ),
      unallocate: (txId, lineId) =>
        editLines(txId, lineId, (l) => ({ ...l, status: 'pending', allocatedAt: undefined, allocatedBy: undefined })),
      setDestination: (txId, lineId, destination) => editLines(txId, lineId, (l) => ({ ...l, destination })),
      updateSettings: (patch) => {
        const next = { ...setRef.current, ...patch }
        setSettings(next)
        if (SHARED_KEYS.some((k) => k in patch)) {
          const data = Object.fromEntries(SHARED_KEYS.map((k) => [k, next[k]])) as SharedSettings
          push({ kind: 'settings', data })
        }
      },
    }
  }, [transactions, settings, status, queued, push])

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore outside StoreProvider')
  return ctx
}
