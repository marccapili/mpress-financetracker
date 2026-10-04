import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthCtx {
  email: string | null
  signOut: () => void
}
const Ctx = createContext<AuthCtx>({ email: null, signOut: () => {} })
export const useAuth = () => useContext(Ctx)

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!ready) return <div className="login"><p className="muted">Loading…</p></div>
  if (supabase && !session) return <Login />

  return (
    <Ctx.Provider value={{ email: session?.user.email ?? null, signOut: () => { supabase?.auth.signOut() } }}>
      {children}
    </Ctx.Provider>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
    setBusy(false)
  }

  return (
    <div className="login">
      <form className="modal" onSubmit={submit}>
        <div className="brand"><img src="/logo-icon.png" alt="MPress" /><div className="brand-text"><strong>MPress Ledger</strong><span className="meta">Team sign-in</span></div></div>
                <label className="field"><span>Email</span>
          <input type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field"><span>Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="bad small" role="alert">{error}</p>}
        <button className="btn primary block lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}
