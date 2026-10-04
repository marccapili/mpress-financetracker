import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { computeFee, fmt, inDisplay, newLine, round2, splitAmount, today, uid } from '../lib/money'
import { CHANNELS, CURRENCIES, type Channel, type Currency, type FeeMode, type Transaction, type TxType } from '../lib/types'
import { PercentPopup } from './PercentPopup'
import { Icon } from './Icon'

const CATEGORIES = ['Software', 'Tools', 'Ads', 'Transport', 'Food', 'Bills', 'Other']

interface Draft {
  id: string
  label: string
  percent: string
}

interface Props {
  rate: number
  prefill: { amount: number; currency?: Currency; nonce: number } | null
  onToast: (msg: string, undo?: () => void) => void
}

export function QuickAdd({ rate, prefill, onToast }: Props) {
  const { settings, transactions, addTransaction, deleteTransaction } = useStore()
  const [type, setType] = useState<TxType>('income')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [party, setParty] = useState('')
  const [channel, setChannel] = useState<Channel>('PayPal')
  const [feeMode, setFeeMode] = useState<FeeMode>(settings.channelFees.PayPal.mode)
  const [feeValue, setFeeValue] = useState(String(settings.channelFees.PayPal.value))
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [lines, setLines] = useState<Draft[]>(() =>
    settings.rules.map((r) => ({ id: r.id, label: r.label, percent: String(r.percent) })),
  )
  const [showPercent, setShowPercent] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!prefill) return
    setAmount(String(prefill.amount))
    if (prefill.currency) setCurrency(prefill.currency)
    amountRef.current?.focus()
  }, [prefill])

  // "%" opens the custom percentage popup from anywhere on this tab
  useEffect(() => {
    if (type !== 'income') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '%' && !(t.tagName === 'INPUT' && (t as HTMLInputElement).type === 'date')) {
        e.preventDefault()
        setShowPercent(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [type])

  function pickChannel(c: Channel) {
    setChannel(c)
    setFeeMode(settings.channelFees[c].mode)
    setFeeValue(String(settings.channelFees[c].value))
  }

  const gross = parseFloat(amount) || 0
  const fee = type === 'income' ? computeFee(gross, { mode: feeMode, value: parseFloat(feeValue) || 0 }) : 0
  const net = round2(Math.max(0, gross - fee))
  const parsedLines = lines.map((l) => ({ ...l, p: parseFloat(l.percent) || 0 }))
  const totalPct = parsedLines.reduce((a, l) => a + l.p, 0)
  const remaining = round2(net - parsedLines.reduce((a, l) => a + splitAmount(net, l.p), 0))

  const recentClients = useMemo(() => {
    const seen = new Map<string, Transaction>()
    for (const t of transactions) if (t.type === 'income' && !seen.has(t.party)) seen.set(t.party, t)
    return [...seen.values()].slice(0, 6)
  }, [transactions])

  const recentCategories = useMemo(() => {
    const fromHistory = transactions.filter((t) => t.type === 'expense').map((t) => t.party)
    return [...new Set([...fromHistory, ...CATEGORIES])].slice(0, 8)
  }, [transactions])

  function pickClient(t: Transaction) {
    setParty(t.party)
    setAmount(String(t.gross))
    setCurrency(t.currency)
    if (t.channel) pickChannel(t.channel)
    amountRef.current?.focus()
  }

  const canSubmit = gross > 0 && party.trim().length > 0 && totalPct <= 100

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const tx: Transaction = {
      id: uid(),
      type,
      date,
      createdAt: new Date().toISOString(),
      createdBy: settings.me,
      currency,
      rate,
      gross,
      fee,
      net: type === 'income' ? net : gross,
      party: party.trim(),
      channel: type === 'income' ? channel : undefined,
      note: note.trim() || undefined,
      splits: type === 'income' ? parsedLines.filter((l) => l.p > 0).map((l) => newLine(l.label, l.p, net)) : [],
    }
    addTransaction(tx)
    onToast(
      `${type === 'income' ? 'Income' : 'Expense'} logged · ${fmt(gross, currency)} · ${tx.party}`,
      () => deleteTransaction(tx.id),
    )
    setAmount('')
    setParty('')
    setNote('')
    setDate(today())
    setLines(settings.rules.map((r) => ({ id: r.id, label: r.label, percent: String(r.percent) })))
    amountRef.current?.focus()
  }

  const display = settings.displayCurrency
  const isIncome = type === 'income'

  return (
    <form className="log-grid" onSubmit={submit}>
      <div className="card stack">
        <div className="seg" role="group" aria-label="Entry type">
          <button type="button" className={isIncome ? 'on' : ''} aria-pressed={isIncome} onClick={() => setType('income')}>Income</button>
          <button type="button" className={!isIncome ? 'on' : ''} aria-pressed={!isIncome} onClick={() => setType('expense')}>Expense</button>
        </div>

        <div className="row">
          <label className="field grow2">
            <span>{isIncome ? 'Amount received (gross)' : 'Amount'}</span>
            <input
              ref={amountRef}
              autoFocus
              className="big"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} style={{ height: 64 }}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label className="field">
          <span>{isIncome ? 'Client' : 'Category'}</span>
          <input value={party} onChange={(e) => setParty(e.target.value)} placeholder={isIncome ? 'Who paid you?' : 'e.g. Software'} />
        </label>

        <div className="chips">
          {isIncome
            ? recentClients.map((t) => (
                <button type="button" key={t.id} className="chip" onClick={() => pickClient(t)}>{t.party}</button>
              ))
            : recentCategories.map((c) => (
                <button type="button" key={c} className={'chip' + (party === c ? ' on' : '')} onClick={() => setParty(c)}>{c}</button>
              ))}
        </div>

        {isIncome && (
          <div className="row">
            <label className="field grow">
              <span>Channel</span>
              <select value={channel} onChange={(e) => pickChannel(e.target.value as Channel)}>
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span>Fee</span>
              <div className="inline">
                <input inputMode="decimal" value={feeValue} onChange={(e) => setFeeValue(e.target.value)} aria-label="Fee amount" />
                <button type="button" className="unit" onClick={() => setFeeMode(feeMode === 'percent' ? 'flat' : 'percent')} aria-label="Toggle fee between percent and flat amount">
                  {feeMode === 'percent' ? '%' : currency}
                </button>
              </div>
            </label>
          </div>
        )}

        <div className="row">
          <label className="field col-date">
            <span>Date</span>
            <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field col-note">
            <span>Note (optional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Invoice #, details…" />
          </label>
        </div>
      </div>

      <div className="card preview-card stack">
        <h2 className="card-title" style={{ margin: 0 }}>{isIncome ? 'Where it goes' : 'Summary'}</h2>
        {isIncome ? (
          <div className="preview">
            <div className="pv-row"><span>Gross</span><span>{fmt(gross, currency)}</span></div>
            <div className="pv-row muted"><span>Fee ({channel})</span><span>− {fmt(fee, currency)}</span></div>
            <div className="pv-row big"><span>Net</span><span>{fmt(net, currency)}</span></div>
            <hr />
            {lines.map((l, i) => (
              <div className="pv-row" key={l.id}>
                <span className="pv-label">
                  {l.label}
                  <span className="pct-edit">
                    <input
                      inputMode="decimal"
                      value={l.percent}
                      onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
                      aria-label={`${l.label} percent`}
                    />%
                  </span>
                  <button type="button" className="x" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label={`Remove ${l.label}`}>
                    <Icon name="close" size={14} weight="bold" />
                  </button>
                </span>
                <span>{fmt(splitAmount(net, parsedLines[i].p), currency)}</span>
              </div>
            ))}
            <div>
              <button type="button" className="link" onClick={() => setShowPercent(true)}>
                <Icon name="percent" size={14} weight="bold" /> Custom % <kbd>%</kbd>
              </button>
            </div>
            <hr />
            <div className="pv-row strong">
              <span>Left for you {totalPct > 100 && <em className="bad">· over 100%</em>}</span>
              <span>{fmt(remaining, currency)}</span>
            </div>
            {currency !== display && net > 0 && (
              <div className="pv-row muted small">
                <span>Net in {display}</span>
                <span>≈ {fmt(inDisplay(net, { currency, rate } as Transaction, display), display)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="preview">
            <div className="pv-row big"><span>Spent</span><span>{fmt(gross, currency)}</span></div>
            {currency !== display && gross > 0 && (
              <div className="pv-row muted small">
                <span>In {display}</span>
                <span>≈ {fmt(inDisplay(gross, { currency, rate } as Transaction, display), display)}</span>
              </div>
            )}
          </div>
        )}

        <button type="submit" className="btn primary block lg" disabled={!canSubmit}>
          Log {type} <kbd>↵</kbd>
        </button>
      </div>

      {showPercent && (
        <PercentPopup
          onClose={() => setShowPercent(false)}
          onSubmit={(label, percent) => setLines((ls) => [...ls, { id: uid(), label, percent: String(percent) }])}
        />
      )}
    </form>
  )
}
