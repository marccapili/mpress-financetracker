import { useCallback, useRef, useState } from 'react'
import { useStore } from './lib/store'
import { useRate } from './lib/rates'
import type { Currency } from './lib/types'
import { QuickAdd } from './components/QuickAdd'
import { Overview } from './components/Summary'
import { History } from './components/History'
import { Settings } from './components/Settings'
import { Tools } from './components/Tools'
import { Icon, type IconName } from './components/Icon'

type Screen = 'log' | 'overview' | 'history' | 'settings'

interface Toast {
  id: number
  msg: string
  undo?: () => void
}

const TITLES: Record<Screen, { title: string; sub: (n: number) => string }> = {
  log: { title: 'Log a payment', sub: () => 'Amount, client, Enter. The split is done for you.' },
  overview: { title: 'Overview', sub: () => new Date().toLocaleString('en', { month: 'long', year: 'numeric' }) },
  history: { title: 'History', sub: (n) => `${n} ${n === 1 ? 'entry' : 'entries'} across your team` },
  settings: { title: 'Settings', sub: () => 'Rules, fees and names are shared with your team.' },
}

function Backdrop() {
  return (
    <svg aria-hidden className="backdrop" preserveAspectRatio="none" viewBox="0 0 1200 800" fill="none">
      <path d="M-50 620 C 250 480, 420 760, 720 600 S 1150 420, 1260 520" stroke="currentColor" strokeWidth="1.2" />
      <path d="M-80 180 C 200 60, 380 300, 640 200 S 1050 40, 1280 160" stroke="currentColor" strokeWidth="1" />
      <circle cx="1080" cy="700" r="240" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

const syncLabel = { local: 'Local only', synced: 'Synced', syncing: 'Syncing', offline: 'Offline' } as const
const syncIcon: Record<keyof typeof syncLabel, IconName> = { local: 'phone', synced: 'cloud', syncing: 'sync', offline: 'offline' }

export default function App() {
  const { settings, updateSettings, sync, transactions } = useStore()
  const rate = useRate()
  const [screen, setScreen] = useState<Screen>('log')
  const [tools, setTools] = useState(false)
  const [pendingFilter, setPendingFilter] = useState(false)
  const [prefill, setPrefill] = useState<{ amount: number; currency?: Currency; nonce: number } | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number>(0)

  const showToast = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), msg, undo })
    timer.current = window.setTimeout(() => setToast(null), 6000)
  }, [])

  const go = (s: Screen, pending = false) => {
    setPendingFilter(pending)
    setScreen(s)
    window.scrollTo({ top: 0 })
  }

  const d = settings.displayCurrency
  const head = TITLES[screen]

  const navItem = (s: Screen, icon: IconName, label: string) => (
    <button key={s} className={'nav-item' + (screen === s ? ' on' : '')} onClick={() => go(s)} aria-current={screen === s ? 'page' : undefined}>
      <Icon name={icon} size={20} weight={screen === s ? 'fill' : 'regular'} />
      {label}
    </button>
  )

  return (
    <div className="app">
      <Backdrop />
      <header className="top">
        <div className="brand">
          <img src="/logo-icon.png" alt="MPress" />
          <div className="brand-text">
            <strong>MPress Ledger</strong>
            <span className="meta">
              <span>$1 = ₱{rate.rate.toFixed(2)}</span>
              <span className={'sync ' + sync.status}>
                <Icon name={syncIcon[sync.status]} size={12} weight="bold" />
                {syncLabel[sync.status]}{sync.status === 'offline' && sync.queued ? ` · ${sync.queued} queued` : ''}
              </span>
            </span>
          </div>
        </div>
        <div className="top-actions">
          <div className="seg mini" role="group" aria-label="Display currency">
            {(['PHP', 'USD'] as Currency[]).map((c) => (
              <button key={c} className={d === c ? 'on' : ''} aria-pressed={d === c} onClick={() => updateSettings({ displayCurrency: c })}>
                <span className="sym">{c === 'PHP' ? '₱ ' : '$ '}</span>{c}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} aria-label={settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={19} weight="bold" />
          </button>
        </div>
      </header>

      <main className="screen" key={screen}>
        <div>
          <h1 className="screen-title">{head.title}</h1>
          <p className="screen-sub">{head.sub(transactions.length)}</p>
        </div>
        <div className="panel">
          {screen === 'log' && <QuickAdd rate={rate.rate} prefill={prefill} onToast={showToast} />}
          {screen === 'overview' && <Overview onLog={() => go('log')} onHistory={(p) => go('history', p)} />}
          {screen === 'history' && <History key={String(pendingFilter)} initialPendingOnly={pendingFilter} onToast={showToast} />}
          {screen === 'settings' && <Settings />}
        </div>
      </main>

      <nav className="nav" aria-label="Main">
        <div className="nav-inner">
          {navItem('overview', 'overview', 'Overview')}
          {navItem('history', 'history', 'History')}
          <button className="nav-center" onClick={() => go('log')} aria-label="Log a payment" aria-current={screen === 'log' ? 'page' : undefined}>
            <Icon name="plus" size={26} weight="bold" />
          </button>
          <button className="nav-item" onClick={() => setTools(true)}>
            <Icon name="calculator" size={20} />
            Tools
          </button>
          {navItem('settings', 'settings', 'Settings')}
        </div>
      </nav>

      {tools && (
        <Tools
          {...rate}
          onClose={() => setTools(false)}
          onUseAmount={(amount, currency) => {
            setPrefill({ amount, currency, nonce: Date.now() })
            go('log')
            setTools(false)
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={() => { toast.undo?.(); setToast(null) }}>Undo</button>}
        </div>
      )}
    </div>
  )
}
