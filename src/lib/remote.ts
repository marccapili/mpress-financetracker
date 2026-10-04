import { supabase } from './supabase'
import type { Settings, Transaction } from './types'

export type SharedSettings = Pick<Settings, 'rules' | 'presets' | 'channelFees' | 'members'>
export const SHARED_KEYS: (keyof SharedSettings)[] = ['rules', 'presets', 'channelFees', 'members']

export type Op =
  | { kind: 'upsert'; tx: Transaction }
  | { kind: 'delete'; id: string }
  | { kind: 'settings'; data: SharedSettings }

const QUEUE_KEY = 'ledger.queue'

export function loadQueue(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]')
  } catch {
    return []
  }
}
export function saveQueue(q: Op[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

/** Later ops on the same record replace earlier ones. */
export function enqueueOp(queue: Op[], op: Op): Op[] {
  const same = (o: Op) =>
    op.kind === 'settings'
      ? o.kind === 'settings'
      : o.kind !== 'settings' && (o.kind === 'upsert' ? o.tx.id : o.id) === (op.kind === 'upsert' ? op.tx.id : op.id)
  return [...queue.filter((o) => !same(o)), op]
}

function toRow(t: Transaction) {
  return {
    id: t.id,
    type: t.type,
    date: t.date,
    created_at: t.createdAt,
    created_by: t.createdBy,
    currency: t.currency,
    rate: t.rate,
    gross: t.gross,
    fee: t.fee,
    net: t.net,
    party: t.party,
    channel: t.channel ?? null,
    note: t.note ?? null,
    splits: t.splits,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Transaction {
  return {
    id: r.id,
    type: r.type,
    date: r.date,
    createdAt: r.created_at,
    createdBy: r.created_by,
    currency: r.currency,
    rate: Number(r.rate),
    gross: Number(r.gross),
    fee: Number(r.fee),
    net: Number(r.net),
    party: r.party,
    channel: r.channel ?? undefined,
    note: r.note ?? undefined,
    splits: r.splits ?? [],
  }
}

export async function runOp(op: Op) {
  if (!supabase) return
  const res =
    op.kind === 'upsert'
      ? await supabase.from('transactions').upsert(toRow(op.tx))
      : op.kind === 'delete'
        ? await supabase.from('transactions').delete().eq('id', op.id)
        : await supabase.from('team_settings').update({ data: op.data }).eq('id', 1)
  if (res.error) throw res.error
}

export async function fetchAll(): Promise<{ transactions: Transaction[]; shared: Partial<SharedSettings> }> {
  if (!supabase) throw new Error('no supabase')
  const [tx, st] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('team_settings').select('data').eq('id', 1).maybeSingle(),
  ])
  if (tx.error) throw tx.error
  if (st.error) throw st.error
  return { transactions: (tx.data ?? []).map(fromRow), shared: (st.data?.data ?? {}) as Partial<SharedSettings> }
}
