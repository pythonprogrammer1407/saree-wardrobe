import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import SareePhoto from '../components/SareePhoto'
import { colorName } from '../components/Swatch'
import { PALETTE, type ColorKey } from '../lib/colors'
import { prepareSampler, shadeDistance, suggestColors, type Picked } from '../lib/colorDetect'
import { fetchSarees } from '../lib/sarees'
import type { Saree } from '../lib/types'

type Where = 'either' | 'body' | 'border'
type Level = 'Same shade' | 'Close shade' | 'Similar'

// ΔE thresholds between exact shades. Photos taken in different light shift a shade by ~5–15,
// so "Same shade" leaves room for that.
const SAME = 12
const CLOSE = 22
const SIMILAR = 32

interface Match {
  saree: Saree
  part: 'Body' | 'Border'
  colour: ColorKey
  hex: string
  exactShade: boolean // false = saree only has a colour name, compared using the palette swatch
  distance: number
  level: Level
}

const paletteHex = (k: ColorKey) => (k === 'multi' ? null : (PALETTE.find((p) => p.key === k)?.hex ?? null))

/**
 * Search by photo — shade match. Photograph a blouse (or fabric / accessory), tap its colour,
 * and see sarees whose body or border shade is closest. Everything runs on the phone.
 */
export default function PhotoSearch() {
  const [mode, setMode] = useState<'colour' | 'similar'>('colour')
  const [sarees, setSarees] = useState<Saree[] | null>(null)
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [found, setFound] = useState<{ key: ColorKey; share: number; hex: string }[]>([])
  const [picked, setPicked] = useState<Picked | null>(null)
  const [mark, setMark] = useState<[number, number] | null>(null)
  const [where, setWhere] = useState<Where>('either')
  const [sampler, setSampler] = useState<((fx: number, fy: number) => Picked) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSarees().then(setSarees).catch((e: Error) => setError(e.message))
  }, [])

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo])

  function choose(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    setError(null)
    setFound([])
    setPicked(null)
    setMark(null)
    setSampler(null)
    setPhoto({ file, url: URL.createObjectURL(file) })
    suggestColors(file)
      .then((cols) => {
        setFound(cols.slice(0, 4))
        if (cols[0]) setPicked({ key: cols[0].key, hex: cols[0].hex })
      })
      .catch((e: Error) => setError(e.message))
    prepareSampler(file)
      .then((fn) => setSampler(() => fn))
      .catch(() => {})
  }

  function tapPhoto(e: React.MouseEvent<HTMLImageElement>) {
    if (!sampler) return
    const r = e.currentTarget.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    setPicked(sampler(fx, fy))
    setMark([fx, fy])
  }

  const matches = useMemo<Match[]>(() => {
    if (!sarees || !picked) return []
    const out: Match[] = []
    for (const s of sarees) {
      const parts: ['Body' | 'Border', ColorKey | null, string | null][] = []
      if (where !== 'border') parts.push(['Body', s.body_color, s.body_hex])
      if (where !== 'body') parts.push(['Border', s.border_color, s.border_hex])
      let best: Match | null = null
      for (const [part, colour, stored] of parts) {
        if (!colour) continue
        const hex = stored ?? paletteHex(colour)
        if (!hex) continue
        const d = shadeDistance(picked.hex, hex)
        if (d > SIMILAR) continue
        const level: Level = d <= SAME ? 'Same shade' : d <= CLOSE ? 'Close shade' : 'Similar'
        if (!best || d < best.distance) best = { saree: s, part, colour, hex, exactShade: !!stored, distance: d, level }
      }
      if (best) out.push(best)
    }
    return out.sort((a, b) => a.distance - b.distance)
  }, [sarees, picked, where])

  const withoutShades = sarees?.filter((s) => !s.body_hex && !s.border_hex).length ?? 0

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-10">
      <header className="flex items-center gap-1 py-3 pr-4 pl-1">
        <Link to="/" aria-label="Back to collection" className="flex h-11 w-11 items-center justify-center">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Search by photo</h1>
      </header>

      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 rounded-[14px] bg-soft p-1">
          {(
            [
              ['colour', 'Match a blouse'],
              ['similar', 'Find this saree'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`h-10 rounded-[10px] text-sm ${mode === m ? 'bg-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-[#4a4a4a]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'similar' ? (
        <div className="mx-4 rounded-2xl bg-[#f6f6f4] p-5">
          <p className="text-[15px] font-semibold">Coming later</p>
          <p className="mt-1.5 text-sm text-[#4a4a4a]">
            “Find this saree” will compare a photo’s pattern, border and colour with your whole collection — handy in a shop to check whether you already own
            something similar. It works best once most of your sarees have photos, so we’ll add it after you’ve built up the collection.
          </p>
          <p className="mt-3 text-sm text-[#4a4a4a]">
            For now, use <strong>Match a blouse</strong> to find sarees by shade.
          </p>
        </div>
      ) : (
        <div className="px-4">
          {photo ? (
            <>
              {/* Shown uncropped so a tap maps exactly onto the photo's pixels. */}
              <div className="relative mx-auto w-fit">
                <img
                  src={photo.url}
                  alt="Your photo — tap to pick a colour"
                  onClick={tapPhoto}
                  className={`block h-auto max-h-[360px] w-auto max-w-full rounded-2xl ${sampler ? 'cursor-crosshair' : ''}`}
                />
                {mark && picked && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_#1a1a1a,0_2px_6px_rgba(0,0,0,0.35)]"
                    style={{ left: `${mark[0] * 100}%`, top: `${mark[1] * 100}%`, background: picked.hex }}
                  />
                )}
              </div>
              <p className="mt-2 text-xs text-muted">Tap the blouse in the photo to pick its exact shade.</p>
            </>
          ) : (
            <div className="rounded-2xl border-[1.5px] border-dashed border-[#b8b8b2] bg-[#fafaf8] px-6 py-10 text-center">
              <p className="text-[15px] font-semibold">Photograph your blouse</p>
              <p className="mt-1 text-sm text-muted">
                We’ll find sarees whose body or border shade is closest. Works for fabric and accessories too. The photo stays on your phone.
              </p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <PhotoButton label={photo ? 'Retake' : 'Take photo'} onClick={() => cameraInput.current?.click()} icon="camera" />
            <PhotoButton label="From gallery" onClick={() => galleryInput.current?.click()} icon="gallery" />
          </div>
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (choose(e.target.files), (e.target.value = ''))} />
          <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => (choose(e.target.files), (e.target.value = ''))} />

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-[#fdecea] px-3.5 py-2.5 text-sm text-[#8a1c12]">
              {error}
            </p>
          )}

          {found.length > 0 && (
            <>
              <h2 className="mt-6 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-[#5c5c5c] uppercase">Colours found</h2>
              <div className="grid grid-cols-4 gap-2">
                {found.map((c) => {
                  const on = !mark && picked?.hex === c.hex
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setPicked({ key: c.key, hex: c.hex })
                        setMark(null)
                      }}
                      className={`flex flex-col items-start gap-1 rounded-xl bg-white p-2 text-left ${on ? 'border-2 border-ink' : 'border border-[#dedede]'}`}
                    >
                      <span className="h-8 w-full rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: c.hex }} />
                      <span className="text-[13px] font-semibold">{colorName(c.key)}</span>
                      <span className="text-[11px] text-muted">{Math.round(c.share * 100)}%</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {picked && (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f6f6f4] p-3">
                <span className="h-10 w-10 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]" style={{ background: picked.hex }} />
                <div>
                  <div className="text-[11px] tracking-[0.06em] text-muted uppercase">Matching this shade</div>
                  <div className="text-sm font-semibold">
                    {colorName(picked.key)} <span className="font-normal text-muted">· {picked.hex}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-[#4a4a4a]">Match with saree</span>
                {(['body', 'border', 'either'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    aria-pressed={where === w}
                    onClick={() => setWhere(w)}
                    className={`h-9 rounded-full border px-3.5 text-[13px] capitalize ${where === w ? 'border-ink bg-ink font-semibold text-white' : 'border-[#d6d6d2] text-[#3a3a3a]'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <h2 className="mt-6 mb-1 text-[13px] font-semibold tracking-[0.06em] text-[#5c5c5c] uppercase">Closest sarees</h2>
              {sarees === null ? (
                <p className="py-4 text-sm text-muted">Loading your collection…</p>
              ) : matches.length === 0 ? (
                <p className="py-4 text-sm text-muted">
                  No close shades. Tap another spot on the blouse{where === 'either' ? '' : ', or switch to “Either”'}.
                </p>
              ) : (
                <ul>
                  {matches.map((m) => (
                    <li key={m.saree.id}>
                      <Link to={`/saree/${m.saree.id}`} className="flex items-center gap-3 border-b border-[#eeeeea] py-2.5">
                        <SareePhoto saree={m.saree} className="h-[68px] w-[52px] shrink-0 rounded-[10px]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{m.saree.name}</span>
                          <span className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                            {/* Blouse shade next to the saree's shade, so you can judge by eye. */}
                            <span className="inline-flex overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]" aria-hidden="true">
                              <span className="h-4 w-4" style={{ background: picked.hex }} />
                              <span className="h-4 w-4" style={{ background: m.hex }} />
                            </span>
                            {m.part} · {colorName(m.colour)}
                            {!m.exactShade && <span className="text-[11px]">(name only)</span>}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold ${
                            m.level === 'Same shade' ? 'bg-ink text-white' : m.level === 'Close shade' ? 'bg-[#e8e8e4] text-ink' : 'border border-[#d6d6d2] text-[#4a4a4a]'
                          }`}
                        >
                          {m.level}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {withoutShades > 0 && (
                <p className="mt-3 text-xs text-muted">
                  {withoutShades} saree{withoutShades === 1 ? ' has' : 's have'} only a colour name, not an exact shade. Open one, tap Edit, and tap its body and
                  border on the photo to make matching precise.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </main>
  )
}

function PhotoButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: 'camera' | 'gallery' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-[#d6d6d2] bg-white text-sm font-medium"
    >
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icon === 'camera' ? (
          <>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </>
        ) : (
          <>
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <circle cx="9" cy="9" r="1.5" />
            <path d="M20 15l-5-5L5 20" />
          </>
        )}
      </svg>
      {label}
    </button>
  )
}
