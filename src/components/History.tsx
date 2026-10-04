import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { fmt, inDisplay, newLine } from '../lib/money'
import type { Transaction } from '../lib/types'
import { PercentPopup } from './PercentPopup'
import { Icon } from './Icon'

interface Props {
  initialPendingOnly?: boolean
  onToast: (msg: string, undo?: () => void) => void
}

function exportCsv(txs: Transaction[]) {
  const head = ['Date', 'Type', 'Client/Category', 'Channel', 'Currency', 'Gross', 'Fee', 'Net', 'Rate (PHP/USD)', 'Logged by', 'Note', 'Splits']
  const rows = txs.map((t) => [
    t.date, t.type, t.party, t.channel ?? '', t.currency, t.gross, t.fee, t.net, t.rate, t.createdBy, t.note ?? '',
    t.splits.map((l) => `${l.label} ${l.percent}%=${l.amount} [${l.status}${l.destination ? ' → ' + l.destination : ''}]`).join('; '),
  ])
  const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function History({ initialPendingOnly = false, onToast }: Props) {
  const store = useStore()
  const { transactions, settings } = store
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  const [pendingOnly, setPendingOnly] = useState(initialPendingOnly)
  const [month, setMonth] = useState('')
  const [person, setPerson] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [percentFor, setPercentFor] = useState<Transaction | null>(null)
  const d = settings.displayCurrency

  const months = useMemo(() => [...new Set(transactions.map((t) => t.date.slice(0, 7)))].sort().reverse(), [transactions])

  const list = useMemo(
    () =>
      transactions
        .filter((t) => (type === 'all' ? true : t.type === type))
        .filter((t) => (month ? t.date.startsWith(month) : true))
        .filter((t) => (person ? t.createdBy === person : true))
        .filter((t) => (pendingOnly ? t.splits.some((l) => l.status === 'pending') : true))
        .filter((t) => (q ? `${t.party} ${t.note ?? ''} ${t.channel ?? ''}`.toLowerCase().includes(q.toLowerCase()) : true))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [transactions, type, month, person, pendingOnly, q],
  )

  if (transactions.length === 0) {
    return <div className="card empty"><p>No entries yet. Use the red + button to log your first payment.</p></div>
  }

  return (
    <div className="history">
      <div className="card filters">
        <input className="search" placeholder="Search client, note, channel…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row wrap">
          <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </select>
          <select aria-label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select aria-label="Person" value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Everyone</option>
            {settings.members.map((m) => <option key={m}>{m}</option>)}
          </select>
          <label className="check"><input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} /> Pending only</label>
          <button className="btn sm" onClick={() => exportCsv(list)}><Icon name="download" size={15} weight="bold" /> Export CSV</button>
        </div>
      </div>

      {list.length === 0 && <div className="card empty"><p>Nothing matches those filters.</p></div>}

      {list.map((t) => {
        const pending = t.splits.filter((l) => l.status === 'pending').length
        const isOpen = open === t.id
        return (
          <article className={'card tx' + (isOpen ? ' open' : '')} key={t.id}>
            <button className="tx-head" onClick={() => setOpen(isOpen ? null : t.id)} aria-expanded={isOpen}>
              <div className="tx-main">
                <strong>{t.party}</strong>
                <span className="muted small">
                  {t.date} · {t.type === 'income' ? t.channel : 'Expense'} · {t.createdBy}
                </span>
              </div>
              <div className="tx-amt">
                <strong className={t.type === 'income' ? 'pos' : ''}>
                  {t.type === 'income' ? '+' : '−'}{fmt(inDisplay(t.net, t, d), d)}
                </strong>
                {t.currency !== d && <span className="muted small">{fmt(t.net, t.currency)}</span>}
                {t.type === 'income' && t.splits.length > 0 && (
                  <span className={'badge ' + (pending ? 'pending' : 'done')}>
                    {!pending && <Icon name="check" size={12} weight="bold" />}
                    {pending ? `${pending} pending` : 'Allocated'}
                  </span>
                )}
              </div>
            </button>

            {isOpen && (
              <div className="tx-body">
                <div className="pv-row muted small">
                  <span>Gross {fmt(t.gross, t.currency)} − fee {fmt(t.fee, t.currency)}</span>
                  <span>@ ₱{t.rate.toFixed(2)}/$</span>
                </div>
                {t.note && <p className="small">{t.note}</p>}

                {t.splits.map((l) => (
                  <div className={'split ' + l.status} key={l.id}>
                    <div className="split-top">
                      <span>
                        <strong>{l.label}</strong> <span className="muted">{l.percent}%</span>
                      </span>
                      <span>{fmt(inDisplay(l.amount, t, d), d)}</span>
                    </div>
                    <div className="split-act">
                      {l.status === 'pending' ? (
                        <button className="btn sm primary" onClick={() => store.allocate(t.id, l.id)}><Icon name="check" size={14} weight="bold" /> Mark allocated</button>
                      ) : (
                        <>
                          <span className="badge done"><Icon name="check" size={12} weight="bold" /> Allocated {l.allocatedAt}{l.allocatedBy ? ` · ${l.allocatedBy}` : ''}</span>
                          <button className="link" onClick={() => store.unallocate(t.id, l.id)}><Icon name="undo" size={13} weight="bold" /> Undo</button>
                        </>
                      )}
                      <input
                        className="dest"
                        placeholder="Where did it go? (optional)" aria-label={`Destination for ${l.label}`}
                        defaultValue={l.destination ?? ''}
                        onBlur={(e) => e.target.value !== (l.destination ?? '') && store.setDestination(t.id, l.id, e.target.value)}
                      />
                      <button className="x" onClick={() => store.removeSplit(t.id, l.id)} aria-label={`Remove ${l.label}`}><Icon name="close" size={14} weight="bold" /></button>
                    </div>
                  </div>
                ))}

                <div className="row wrap">
                  {t.type === 'income' && (
                    <>
                      {pending > 1 && <button className="btn sm primary" onClick={() => store.allocate(t.id)}><Icon name="check" size={14} weight="bold" /> Mark all allocated</button>}
                      <button className="btn sm" onClick={() => setPercentFor(t)}><Icon name="percent" size={14} weight="bold" /> Custom %</button>
                    </>
                  )}
                  <button
                    className="btn sm danger"
                    onClick={() => {
                      store.deleteTransaction(t.id)
                      onToast(`Deleted ${t.party}`, () => store.restoreTransaction(t))
                    }}
                  >
                    <Icon name="trash" size={14} weight="bold" /> Delete
                  </button>
                </div>
              </div>
            )}
          </article>
        )
      })}

      {percentFor && (
        <PercentPopup
          title={`Add % to ${percentFor.party}`}
          onClose={() => setPercentFor(null)}
          onSubmit={(label, percent) => store.addSplit(percentFor.id, newLine(label, percent, percentFor.net))}
        />
      )}
    </div>
  )
}
