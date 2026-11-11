import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PALETTE } from '../lib/colors'
import { applyFilters, EMPTY_FILTERS, FABRICS, OCCASIONS, toggle, type Filters } from '../lib/filters'
import type { Blouse, Saree } from '../lib/types'
import { colorBg } from './Swatch'

const BLOUSES: { value: Blouse; label: string }[] = [
  { value: 'stitched', label: 'Stitched' },
  { value: 'unstitched', label: 'Unstitched' },
  { value: 'none', label: 'No blouse' },
]

/** Bottom sheet with every filter. Changes apply only when "Show" is tapped. */
export default function FilterSheet({
  sarees,
  initial,
  onApply,
  onClose,
}: {
  sarees: Saree[]
  initial: Filters
  onApply: (f: Filters) => void
  onClose: () => void
}) {
  const [f, setF] = useState<Filters>(initial)
  const set = (patch: Partial<Filters>) => setF((cur) => ({ ...cur, ...patch }))

  // Fabrics/places offered = the standard list plus anything already used in the collection.
  const fabrics = useMemo(() => [...new Set([...FABRICS, ...sarees.map((s) => s.fabric).filter((v): v is string => !!v)])], [sarees])
  const places = useMemo(() => [...new Set(sarees.map((s) => s.stored_in).filter((v): v is string => !!v))].sort(), [sarees])
  const count = useMemo(() => applyFilters(sarees, f).length, [sarees, f])

  // Close on Escape; stop the page behind from scrolling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 h-full w-full bg-[rgba(20,20,20,0.45)]" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[88dvh] max-w-md flex-col rounded-t-3xl bg-white"
      >
        <div className="flex justify-center pt-2.5">
          <span className="h-1 w-10 rounded-full bg-[#d6d6d2]" />
        </div>
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
          <h2 className="text-xl font-bold">Filters</h2>
          <button type="button" onClick={() => setF({ ...EMPTY_FILTERS, query: f.query })} className="h-11 px-1 text-sm font-medium underline">
            Clear all
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <Section title="Colour">
            <div className="grid w-full grid-cols-6 gap-x-1 gap-y-2">
              {PALETTE.map((p) => {
                const on = f.colors.includes(p.key)
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={on}
                    aria-label={p.name}
                    onClick={() => set({ colors: toggle(f.colors, p.key) })}
                    className="flex flex-col items-center gap-0.5"
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${on ? 'border-ink' : 'border-transparent'}`}>
                      <span className="h-[34px] w-[34px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: colorBg(p.key) }} />
                    </span>
                    <span className={`text-[10px] leading-tight ${on ? 'font-semibold text-ink' : 'text-[#5c5c5c]'}`}>{p.name}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-1 flex w-full gap-2">
              <Chip on={f.colorMatch === 'either'} onClick={() => set({ colorMatch: 'either' })}>
                Body or border
              </Chip>
              <Chip on={f.colorMatch === 'body'} onClick={() => set({ colorMatch: 'body' })}>
                Body colour only
              </Chip>
            </div>
          </Section>

          <Section title="Fabric">
            {fabrics.map((v) => (
              <Chip key={v} on={f.fabrics.includes(v)} onClick={() => set({ fabrics: toggle(f.fabrics, v) })}>
                {v}
              </Chip>
            ))}
          </Section>

          <Section title="Occasion">
            {OCCASIONS.map((v) => (
              <Chip key={v} on={f.occasions.includes(v)} onClick={() => set({ occasions: toggle(f.occasions, v) })}>
                {v}
              </Chip>
            ))}
          </Section>

          <Section title="Blouse">
            {BLOUSES.map((b) => (
              <Chip key={b.value} on={f.blouses.includes(b.value)} onClick={() => set({ blouses: toggle(f.blouses, b.value) })}>
                {b.label}
              </Chip>
            ))}
          </Section>

          {places.length > 0 && (
            <Section title="Stored in">
              {places.map((v) => (
                <Chip key={v} on={f.places.includes(v)} onClick={() => set({ places: toggle(f.places, v) })}>
                  {v}
                </Chip>
              ))}
            </Section>
          )}

          <label className="mt-6 flex cursor-pointer items-center justify-between gap-3 rounded-[14px] bg-[#f6f6f4] px-4 py-3.5">
            <span>
              <span className="block text-[15px] font-semibold">Not worn in 6+ months</span>
              <span className="mt-0.5 block text-[13px] text-muted">Includes sarees never worn</span>
            </span>
            <input
              type="checkbox"
              checked={f.notWornLately}
              onChange={() => set({ notWornLately: !f.notWornLately })}
              className="h-[22px] w-[22px] accent-ink"
            />
          </label>
        </div>

        <div className="border-t border-[#eeeeea] px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onApply(f)}
            className="h-13 w-full rounded-full bg-ink text-base font-semibold text-white"
          >
            {count === 0 ? 'No sarees match' : `Show ${count} saree${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mt-5 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-[#5c5c5c] uppercase">{title}</h3>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-sm ${on ? 'border-ink bg-ink font-semibold text-white' : 'border-[#d6d6d2] text-[#3a3a3a]'}`}
    >
      {children}
    </button>
  )
}
