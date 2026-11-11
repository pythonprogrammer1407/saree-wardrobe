import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SareePhoto from '../components/SareePhoto'
import { colorBg, Dot } from '../components/Swatch'
import { signOut } from '../lib/auth'
import { PALETTE, type ColorKey } from '../lib/colors'
import { fetchSarees, wornLabel } from '../lib/sarees'
import type { Saree } from '../lib/types'

type ColorFilter = ColorKey | 'all'

const ALL_BG = 'conic-gradient(#b3202a, #c9962b, #3f7d3a, #1f7a78, #2f5aa8, #6a3d8f, #e07a9a, #b3202a)'

export default function Collection() {
  const [sarees, setSarees] = useState<Saree[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [color, setColor] = useState<ColorFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchSarees().then(setSarees).catch((e: Error) => setError(e.message))
  }, [])

  const shown = useMemo(() => {
    if (!sarees) return []
    const q = query.trim().toLowerCase()
    return sarees.filter((s) => {
      if (color !== 'all' && s.body_color !== color && s.border_color !== color) return false
      if (!q) return true
      return [s.name, s.fabric, s.weave, s.stored_in, ...s.occasions].some((v) => v?.toLowerCase().includes(q))
    })
  }, [sarees, color, query])

  const total = sarees?.length ?? 0
  const filtering = color !== 'all' || query.trim() !== ''

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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-ink outline-none"
          />
        </label>
        <Link to="/search-photo" aria-label="Search by photo" className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft">
          <CameraIcon />
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-4 pt-3.5 pb-1.5 [scrollbar-width:none]">
        <ColorButton label="All" bg={ALL_BG} active={color === 'all'} onClick={() => setColor('all')} />
        {PALETTE.map((p) => (
          <ColorButton key={p.key} label={p.name} bg={colorBg(p.key)} active={color === p.key} onClick={() => setColor(p.key)} />
        ))}
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
        <p className="px-8 py-12 text-center text-sm text-muted">No sarees match. Try another colour or search.</p>
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
                  <span className="truncate text-xs text-muted">
                    {[s.fabric, wornLabel(s.last_worn)].filter(Boolean).join(' · ')}
                  </span>
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
    </main>
  )
}

function ColorButton({ label, bg, active, onClick }: { label: string; bg: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="flex w-[54px] shrink-0 flex-col items-center gap-1.5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${active ? 'border-ink' : 'border-transparent'}`}>
        <span className="h-[34px] w-[34px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: bg }} />
      </span>
      <span className={`text-xs ${active ? 'font-semibold text-ink' : 'text-[#5c5c5c]'}`}>{label}</span>
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
