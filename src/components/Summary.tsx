import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { daysSince, fmt, inDisplay } from '../lib/money'
import { Icon } from './Icon'

interface Props {
  onLog: () => void
  onHistory: (pendingOnly: boolean) => void
}

export function Overview({ onLog, onHistory }: Props) {
  const { transactions, settings } = useStore()
  const d = settings.displayCurrency

  const data = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    let income = 0
    let spent = 0
    let count = 0
    const pending = new Map<string, number>()
    let oldest = 0
    let pendingCount = 0
    for (const t of transactions) {
      if (t.date.startsWith(month)) {
        if (t.type === 'income') { income += inDisplay(t.net, t, d); count++ }
        else spent += inDisplay(t.net, t, d)
      }
      for (const l of t.splits) {
        if (l.status !== 'pending') continue
        pendingCount++
        pending.set(l.label, (pending.get(l.label) ?? 0) + inDisplay(l.amount, t, d))
        oldest = Math.max(oldest, daysSince(t.date))
      }
    }
    const recent = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
    return { income, spent, count, pending: [...pending.entries()], oldest, pendingCount, recent }
  }, [transactions, d])

  if (transactions.length === 0) {
    return (
      <div className="card empty">
        <p>Nothing logged yet. Your first payment takes about five seconds.</p>
        <button className="btn primary" onClick={onLog}>
          <Icon name="plus" size={16} weight="bold" /> Log a payment
        </button>
      </div>
    )
  }

  return (
    <>
      {data.pendingCount > 0 && data.oldest >= 7 && (
        <button className="banner" onClick={() => onHistory(true)}>
          <Icon name="warning" size={22} weight="fill" />
          <span><strong>Waiting {data.oldest}+ days.</strong> Some tithes and savings haven’t been allocated yet. Review them.</span>
        </button>
      )}

      <section className="card">
        <h2 className="card-title">This month</h2>
        <div className="ledger-rows">
          <div className="ledger-row"><span>Income after fees <span className="muted small">· {data.count} {data.count === 1 ? 'payment' : 'payments'}</span></span><span>{fmt(data.income, d)}</span></div>
          <div className="ledger-row"><span>Expenses</span><span>− {fmt(data.spent, d)}</span></div>
          <div className="ledger-row total"><span>Kept after expenses</span><span>{fmt(data.income - data.spent, d)}</span></div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Waiting to be allocated</h2>
          {data.pending.length > 0 && (
            <button className="link" onClick={() => onHistory(true)}>Review <Icon name="next" size={12} weight="bold" /></button>
          )}
        </div>
        {data.pending.length === 0 ? (
          <p className="muted small">Everything is allocated. Nice work.</p>
        ) : (
          <div className="ledger-rows">
            {data.pending.map(([label, amt]) => (
              <div className="ledger-row" key={label}><span>{label}</span><strong>{fmt(amt, d)}</strong></div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">Recent</h2>
          <button className="link" onClick={() => onHistory(false)}>All history <Icon name="next" size={12} weight="bold" /></button>
        </div>
        <div className="recent">
          {data.recent.map((t) => (
            <div className="recent-row" key={t.id}>
              <div>
                <strong>{t.party}</strong>
                <span className="muted small">{t.date}{t.channel ? ` · ${t.channel}` : ''}</span>
              </div>
              <strong className={t.type === 'income' ? 'pos' : ''}>
                {t.type === 'income' ? '+' : '−'}{fmt(inDisplay(t.net, t, d), d)}
              </strong>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
