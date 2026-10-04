import { useEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'

interface Props {
  title?: string
  onSubmit: (label: string, percent: number) => void
  onClose: () => void
}

export function PercentPopup({ title = 'Add a percentage', onSubmit, onClose }: Props) {
  const { settings } = useStore()
  const [percent, setPercent] = useState('')
  const [label, setLabel] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const p = parseFloat(percent)
  const valid = p > 0 && p <= 100

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onSubmit(label.trim() || `${p}%`, p)
    onClose()
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="row">
          <label className="field grow">
            <span>Percent</span>
            <input ref={ref} inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="e.g. 15" />
          </label>
          <label className="field grow2">
            <span>Name</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Marketing" />
          </label>
        </div>
        {settings.presets.length > 0 && (
          <div className="chips">
            {settings.presets.map((pr) => (
              <button
                type="button"
                key={pr.label}
                className="chip"
                onClick={() => { onSubmit(pr.label, pr.percent); onClose() }}
              >
                {pr.label} · {pr.percent}%
              </button>
            ))}
          </div>
        )}
        <div className="row end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={!valid}>Add <kbd>↵</kbd></button>
        </div>
      </form>
    </div>
  )
}
