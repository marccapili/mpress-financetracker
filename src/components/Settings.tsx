import { useStore } from '../lib/store'
import { uid } from '../lib/money'
import { useAuth } from '../lib/auth'
import { Icon } from './Icon'
import { CHANNELS, type Channel } from '../lib/types'

export function Settings() {
  const { settings, updateSettings } = useStore()
  const { email, signOut } = useAuth()

  return (
    <div className="settings-grid">
      <section className="card">
        <h2 className="card-title">Default split rules</h2>
        <p className="muted small">Applied to the net amount of every new income. You can still change them per entry.</p>
        {settings.rules.map((r, i) => (
          <div className="row" key={r.id}>
            <input className="grow2" value={r.label} onChange={(e) => updateSettings({ rules: settings.rules.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <div className="inline grow">
              <input inputMode="decimal" value={r.percent} onChange={(e) => updateSettings({ rules: settings.rules.map((x, j) => (j === i ? { ...x, percent: parseFloat(e.target.value) || 0 } : x)) })} />
              <span className="unit">%</span>
            </div>
            <button className="x" onClick={() => updateSettings({ rules: settings.rules.filter((_, j) => j !== i) })} aria-label="Remove rule"><Icon name="close" size={14} weight="bold" /></button>
          </div>
        ))}
        <button className="link" onClick={() => updateSettings({ rules: [...settings.rules, { id: uid(), label: 'New bucket', percent: 10 }] })}><Icon name="plus" size={14} weight="bold" /> Add bucket</button>
      </section>

      <section className="card">
        <h2 className="card-title">Saved % presets</h2>
        <p className="muted small">One-tap options in the custom % popup.</p>
        {settings.presets.map((p, i) => (
          <div className="row" key={i}>
            <input className="grow2" value={p.label} onChange={(e) => updateSettings({ presets: settings.presets.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <div className="inline grow">
              <input inputMode="decimal" value={p.percent} onChange={(e) => updateSettings({ presets: settings.presets.map((x, j) => (j === i ? { ...x, percent: parseFloat(e.target.value) || 0 } : x)) })} />
              <span className="unit">%</span>
            </div>
            <button className="x" onClick={() => updateSettings({ presets: settings.presets.filter((_, j) => j !== i) })} aria-label="Remove preset"><Icon name="close" size={14} weight="bold" /></button>
          </div>
        ))}
        <button className="link" onClick={() => updateSettings({ presets: [...settings.presets, { label: 'New preset', percent: 10 }] })}><Icon name="plus" size={14} weight="bold" /> Add preset</button>
      </section>

      <section className="card">
        <h2 className="card-title">Channel fee defaults</h2>
        {CHANNELS.map((c: Channel) => {
          const f = settings.channelFees[c]
          const set = (patch: Partial<typeof f>) => updateSettings({ channelFees: { ...settings.channelFees, [c]: { ...f, ...patch } } })
          return (
            <div className="row" key={c}>
              <span className="grow label-fixed">{c}</span>
              <div className="inline grow">
                <input inputMode="decimal" value={f.value} onChange={(e) => set({ value: parseFloat(e.target.value) || 0 })} />
                <button className="unit" onClick={() => set({ mode: f.mode === 'percent' ? 'flat' : 'percent' })}>{f.mode === 'percent' ? '%' : 'flat'}</button>
              </div>
            </div>
          )
        })}
        <p className="muted small">Starting values are estimates — set them to what each channel really charges you.</p>
      </section>

      <section className="card">
        <h2 className="card-title">Team</h2>
        <label className="field">
          <span>I am (on this device)</span>
          <select value={settings.me} onChange={(e) => updateSettings({ me: e.target.value })}>
            {settings.members.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        {settings.members.map((m, i) => (
          <label className="field" key={i}>
            <span>Member {i + 1}</span>
            <input value={m} onChange={(e) => {
              const members = settings.members.map((x, j) => (j === i ? e.target.value : x))
              updateSettings({ members, me: settings.me === m ? e.target.value : settings.me })
            }} />
          </label>
        ))}
        <p className="muted small">'I am' is saved on this device only. Rules, presets, fees and names are shared with the team.</p>
        {email && (
          <div className="row">
            <span className="grow muted small">Signed in as {email}</span>
            <button className="btn sm" onClick={signOut}><Icon name="signout" size={14} weight="bold" /> Sign out</button>
          </div>
        )}
      </section>
    </div>
  )
}
