import type { Currency, Fee, SplitLine, Transaction } from './types'

export const round2 = (n: number) => Math.round(n * 100) / 100

export function fmt(n: number, c: Currency) {
  return new Intl.NumberFormat(c === 'PHP' ? 'en-PH' : 'en-US', {
    style: 'currency',
    currency: c,
  }).format(Number.isFinite(n) ? n : 0)
}

/** rate = PHP per 1 USD */
export function convert(amount: number, from: Currency, to: Currency, rate: number) {
  if (from === to) return amount
  return from === 'USD' ? amount * rate : amount / rate
}

export function computeFee(gross: number, fee: Fee) {
  return round2(fee.mode === 'percent' ? (gross * fee.value) / 100 : fee.value)
}

export function splitAmount(net: number, percent: number) {
  return round2((net * percent) / 100)
}

/** Convert a transaction amount into the display currency using its saved rate. */
export function inDisplay(amount: number, tx: Transaction, display: Currency) {
  return convert(amount, tx.currency, display, tx.rate)
}

export const today = () => {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export const uid = () => crypto.randomUUID()

export function newLine(label: string, percent: number, net: number): SplitLine {
  return {
    id: uid(),
    label,
    percent,
    amount: splitAmount(net, percent),
    status: 'pending',
  }
}

/** Safe arithmetic evaluator for the calculator (+ - * / parentheses, unary minus). */
export function evaluate(expr: string): number | null {
  const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '').replace(/\s+/g, '')
  if (!s || /[^0-9+\-*/().]/.test(s)) return null
  let i = 0
  const peek = () => s[i]
  function number(): number {
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i))
    if (!m) throw new Error('num')
    i += m[0].length
    return parseFloat(m[0])
  }
  function factor(): number {
    if (peek() === '-') { i++; return -factor() }
    if (peek() === '+') { i++; return factor() }
    if (peek() === '(') {
      i++
      const v = sum()
      if (peek() !== ')') throw new Error('paren')
      i++
      return v
    }
    return number()
  }
  function term(): number {
    let v = factor()
    while (peek() === '*' || peek() === '/') {
      const op = s[i++]
      const r = factor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  function sum(): number {
    let v = term()
    while (peek() === '+' || peek() === '-') {
      const op = s[i++]
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  try {
    const v = sum()
    if (i !== s.length || !Number.isFinite(v)) return null
    return v
  } catch {
    return null
  }
}
