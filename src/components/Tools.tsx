import { useEffect, useState } from 'react'
import { convert, evaluate, fmt, round2 } from '../lib/money'
import type { Currency } from '../lib/types'
import { Icon } from './Icon'

interface Props {
  rate: number
  asOf?: string
  fetchedAt?: number
  isFallback: boolean
  error: boolean
  onUseAmount: (n: number, currency?: Currency) => void
  onClose: () => void
}

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '(', '+', ')']

function Calculator({ onUse }: { onUse: (n: number) => void }) {
  const [expr, setExpr] = useState('')
  const result = evaluate(expr)

  return (
    <section className="card tool">
      <h2 className="card-title" style={{ margin: 0 }}>Calculator</h2>
      <input
        className="calc-input"
        aria-label="Calculator expression"
        value={expr}
        inputMode="decimal"
        placeholder="0"
        onChange={(e) => setExpr(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && result !== null) setExpr(String(round2(result))) }}
      />
      <div className="calc-result">{result === null ? '0' : result.toLocaleString('en-US', { maximumFractionDigits: 4 })}</div>
      <div className="keypad">
        {KEYS.map((k) => (
          <button key={k} type="button" className={'key' + (/[÷×\-+]/.test(k) ? ' op' : '')} onClick={() => setExpr((x) => x + k)}>{k}</button>
        ))}
        <button type="button" className="key" onClick={() => setExpr((x) => x.slice(0, -1))} aria-label="Delete last"><Icon name="backspace" size={20} /></button>
        <button type="button" className="key" onClick={() => setExpr('')}>C</button>
        <button type="button" className="key eq" onClick={() => result !== null && setExpr(String(round2(result)))}>=</button>
      </div>
      <button
        type="button"
        className="btn block"
        disabled={result === null || result <= 0}
        onClick={() => result !== null && onUse(round2(result))}
      >
        Use result as amount
      </button>
    </section>
  )
}

function Converter(props: Omit<Props, 'onUseAmount' | 'onClose'> & { onUse: (n: number, c: Currency) => void }) {
  const [from, setFrom] = useState<Currency>('USD')
  const [amount, setAmount] = useState('100')
  const to: Currency = from === 'USD' ? 'PHP' : 'USD'
  const n = parseFloat(amount)
  const out = Number.isFinite(n) ? convert(n, from, to, props.rate) : 0
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(t) }, [])

  const mins = props.fetchedAt ? Math.max(0, Math.round((Date.now() - props.fetchedAt) / 60_000)) : null
  const status = props.isFallback
    ? 'Offline estimate — no live rate yet'
    : props.error
      ? `Live rate unavailable · last updated ${mins}m ago`
      : `Live · updated ${mins === 0 ? 'just now' : `${mins}m ago`}${props.asOf ? ` · ECB ${props.asOf}` : ''}`

  return (
    <section className="card tool">
      <h2 className="card-title" style={{ margin: 0 }}>Currency converter</h2>
      <div className="rate-line">
        <strong>$1 = ₱{props.rate.toFixed(3)}</strong>
        <span className={'dot' + (props.isFallback || props.error ? ' warn' : '')} />
      </div>
      <p className="muted small">{status}</p>
      <div className="row">
        <label className="field grow2">
          <span>{from}</span>
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={() => { setFrom(to); setAmount(String(round2(out))) }} aria-label="Swap currencies"><Icon name="swap" size={18} weight="bold" /></button>
      </div>
      <div className="conv-out">{fmt(out, to)}</div>
      <button type="button" className="btn block" disabled={!(n > 0)} onClick={() => props.onUse(n, from)}>
        Use {from} amount in form
      </button>
    </section>
  )
}

export function Tools(props: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <div className="overlay drawer-wrap" onMouseDown={props.onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <h3>Tools</h3>
          <button className="icon-btn" onClick={props.onClose} aria-label="Close tools"><Icon name="close" size={18} weight="bold" /></button>
        </div>
        <Converter {...props} onUse={props.onUseAmount} />
        <Calculator onUse={props.onUseAmount} />
      </aside>
    </div>
  )
}
