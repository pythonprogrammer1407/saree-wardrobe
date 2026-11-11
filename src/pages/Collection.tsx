import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FilterSheet from '../components/FilterSheet'
import SareePhoto from '../components/SareePhoto'
import { colorBg, colorName, Dot } from '../components/Swatch'
import { signOut } from '../lib/auth'
import { PALETTE, type ColorKey } from '../lib/colors'
import { activeCount, applyFilters, EMPTY_FILTERS, recallFilters, rememberFilters, type Filters } from '../lib/filters'
import { fetchSarees, wornLabel } from '../lib/sarees'
import type { Saree } from '../lib/types'

const ALL_BG = 'conic-gradient(#b3202a, #c9962b, #3f7d3a, #1f7a78, #2f5aa8, #6a3d8f, #e07a9a, #b3202a)'
const BLOUSE_LABEL = { stitched: 'Stitched blouse', unstitched: 'Unstitched blouse', none: 'No blouse' } as const

export default function Collection() {
  const [sarees, setSarees] = useState<Saree[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<Filters>(recallFilters)
  const [sheetOpen, setSheetOpen] = useState(false)

  const setFilters = useCallback((next: Filters) => {
    rememberFilters(next)
    setFiltersState(next)
  }, [])
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  useEffect(() => {
    fetchSarees().then(setSarees).catch((e: Error) => setError(e.message))
  }, [])

  const shown = useMemo(() => (sarees ? applyFilters(sarees, filters) : []), [sarees, filters])
  const total = sarees?.length ?? 0
  const nActive = activeCount(filters)
  const filtering = nActive > 0 || filters.query.trim() !== ''

  // The colour strip is a shortcut: tap one colour to show only it, tap again (or All) to clear.
  function pickStripColor(k: ColorKey | 'all') {
    if (k === 'all') return setFilters({ ...filters, colors: [] })
    const only = filters.colors.length === 1 && filters.colors[0] === k
    setFilters({ ...filters, colors: only ? [] : [k] })
  }

  // One removable chip per active value, so it's always clear what's being filtered.
  const chips: { label: string; remove: () => void }[] = [
    ...filters.colors.map((c) => ({ label: colorName(c), remove: () => setFilters({ ...filters, colors: filters.colors.filter((x) => x !== c) }) })),
    ...filters.fabrics.map((v) => ({ label: v, remove: () => setFilters({ ...filters, fabrics: filters.fabrics.filter((x) => x !== v) }) })),
    ...filters.occasions.map((v) => ({ label: v, remove: () => setFilters({ ...filters, occasions: filters.occasions.filter((x) => x !== v) }) })),
    ...filters.blouses.map((v) => ({ label: BLOUSE_LABEL[v], remove: () => setFilters({ ...filters, blouses: filters.blouses.filter((x) => x !== v) }) })),
    ...filters.places.map((v) => ({ label: v, remove: () => setFilters({ ...filters, places: filters.places.filter((x) => x !== v) }) })),
  ]

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <header className="flex items-center justify-between px-4 pt-6 pb-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">My Sarees</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {sarees === null ? 'Loading…' : filtering ? `${shown.length} of ${total} shown` : `${total} sarees in your collection`}
          </p>
        </div>
        <Link to="/add" aria-label="Add saree" className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white">
          <PlusIcon />
        </Link>
      </header>

      <div className="flex gap-2 px-4 pt-2 pb-1">
        <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl bg-soft px-3.5 text-muted">
          <SearchIcon />
          <input
            type="search"
            aria-label="Search sarees"
            placeholder="Search name, fabric, almirah…"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            className="flex-1 bg-transparent text-[15px] text-ink outline-none"
          />
        </label>
        <Link to="/search-photo" aria-label="Search by photo" className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft">
          <CameraIcon />
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 pt-3.5 pb-1.5 [scrollbar-width:none]">
        <ColorButton label="All" bg={ALL_BG} active={filters.colors.length === 0} onClick={() => pickStripColor('all')} />
        {PALETTE.map((p) => (
          <ColorButton key={p.key} label={p.name} bg={colorBg(p.key)} active={filters.colors.includes(p.key)} onClick={() => pickStripColor(p.key)} />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pt-2.5 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${nActive ? 'border-ink bg-ink text-white' : 'border-ink'}`}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filters{nActive ? ` · ${nActive}` : ''}
        </button>
        <button
          type="button"
          aria-pressed={filters.notWornLately}
          onClick={() => setFilters({ ...filters, notWornLately: !filters.notWornLately })}
          className={`h-9 shrink-0 rounded-full border px-3.5 text-[13px] ${filters.notWornLately ? 'border-ink bg-ink font-semibold text-white' : 'border-[#dedede] text-[#3a3a3a]'}`}
        >
          Not worn lately
        </button>
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={c.remove}
            aria-label={`Remove filter ${c.label}`}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-soft px-3.5 text-[13px] text-ink"
          >
            {c.label}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ))}
        {filtering && (
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="h-9 shrink-0 px-2 text-[13px] text-muted underline">
            Clear
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mx-4 mt-4 rounded-xl bg-[#fdecea] px-3.5 py-2.5 text-sm text-[#8a1c12]">
          Couldn't load sarees: {error}
        </p>
      )}

      {sarees !== null && total === 0 && (
        <div className="px-8 py-16 text-center">
          <p className="text-[15px] font-semibold">No sarees yet</p>
          <p className="mt-1 text-sm text-muted">Add your first saree to start your catalogue.</p>
          <Link to="/add" className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white">
            Add saree
          </Link>
        </div>
      )}

      {total > 0 && shown.length === 0 && (
        <div className="px-8 py-12 text-center">
          <p className="text-sm text-muted">No sarees match these filters.</p>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="mt-3 h-11 rounded-full border border-ink px-5 text-sm font-medium">
            Clear filters
          </button>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-x-3 gap-y-5 px-4 pt-3.5">
        {shown.map((s) => (
          <li key={s.id}>
            <Link to={`/saree/${s.id}`} className="flex flex-col gap-2">
              <SareePhoto saree={s} className="aspect-[3/4]" />
              <div>
                <div className="text-sm leading-tight font-semibold">{s.name}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <Dot color={s.body_color} />
                  <Dot color={s.border_color} />
                  <span className="truncate text-xs text-muted">{[s.fabric, wornLabel(s.last_worn)].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 text-center">
        <button type="button" onClick={signOut} className="h-11 px-4 text-sm text-muted underline">
          Sign out
        </button>
      </div>

      {sheetOpen && sarees && (
        <FilterSheet
          sarees={sarees}
          initial={filters}
          onClose={closeSheet}
          onApply={(f) => {
            setFilters(f)
            setSheetOpen(false)
          }}
        />
      )}
    </main>
  )
}

function ColorButton({ label, bg, active, onClick }: { label: string; bg: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex w-[54px] shrink-0 flex-col items-center gap-1.5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${active ? 'border-ink' : 'border-transparent'}`}>
        <span className="h-[34px] w-[34px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: bg }} />
      </span>
      <span className={`text-center text-xs leading-tight ${active ? 'font-semibold text-ink' : 'text-[#5c5c5c]'}`}>{label}</span>
    </button>
  )
}

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" {...svg}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" strokeWidth="2" {...svg}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" strokeWidth="1.8" {...svg}>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
