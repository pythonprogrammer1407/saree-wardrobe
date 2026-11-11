import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { colorBg, colorName } from '../components/Swatch'
import { uploadImage } from '../lib/cloudinary'
import { PALETTE, type ColorKey } from '../lib/colors'
import { prepareSampler, suggestColors } from '../lib/colorDetect'
import { resizeImage } from '../lib/image'
import { createSaree, fetchStorageSpots } from '../lib/sarees'
import type { Blouse } from '../lib/types'

const MAX_PHOTOS = 6
const FABRICS = ['Silk', 'Cotton', 'Cotton silk', 'Linen', 'Georgette', 'Chiffon', 'Organza', 'Tussar', 'Crepe', 'Net', 'Other']
const OCCASIONS = ['Wedding', 'Festive', 'Office', 'Casual', 'Party']
const BLOUSES: { value: Blouse; label: string }[] = [
  { value: 'stitched', label: 'Stitched' },
  { value: 'unstitched', label: 'Unstitched' },
  { value: 'none', label: 'None' },
]

interface Photo {
  id: string
  file: File
  preview: string
}

export default function AddSaree() {
  const navigate = useNavigate()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<Photo[]>([])
  const [suggested, setSuggested] = useState<ColorKey[]>([])
  const [body, setBody] = useState<ColorKey | null>(null)
  const [border, setBorder] = useState<ColorKey | null>(null)
  const touched = useRef({ body: false, border: false })
  const [sampler, setSampler] = useState<((fx: number, fy: number) => ColorKey) | null>(null)
  const [picking, setPicking] = useState<'body' | 'border'>('body')
  const [marks, setMarks] = useState<{ body?: [number, number]; border?: [number, number] }>({})

  const [name, setName] = useState('')
  const [fabric, setFabric] = useState('')
  const [weave, setWeave] = useState('')
  const [occasions, setOccasions] = useState<string[]>([])
  const [blouse, setBlouse] = useState<Blouse | null>(null)
  const [storedIn, setStoredIn] = useState('')
  const [source, setSource] = useState('')
  const [lastWorn, setLastWorn] = useState('')
  const [spots, setSpots] = useState<string[]>([])

  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStorageSpots().then(setSpots).catch(() => {})
  }, [])

  // Free preview URLs when leaving the screen.
  const photosRef = useRef(photos)
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  // Re-suggest colours whenever the cover photo changes.
  const coverFile = photos[0]?.file
  useEffect(() => {
    if (!coverFile) return
    let cancelled = false
    suggestColors(coverFile)
      .then((found) => {
        if (cancelled) return
        const keys = found.map((f) => f.key)
        setSuggested(keys)
        if (!touched.current.body && keys[0]) setBody(keys[0])
        if (!touched.current.border && keys[1]) setBorder(keys[1])
      })
      .catch(() => setSuggested([]))
    prepareSampler(coverFile)
      .then((fn) => {
        if (cancelled) return
        setSampler(() => fn)
        setMarks({})
        setPicking('body')
      })
      .catch(() => setSampler(null))
    return () => {
      cancelled = true
    }
  }, [coverFile])

  function addFiles(list: FileList | null) {
    if (!list) return
    const room = MAX_PHOTOS - photos.length
    const added = [...list].slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))
    setPhotos((p) => [...p, ...added])
    if (list.length > room) setError(`Up to ${MAX_PHOTOS} photos per saree.`)
  }

  function removePhoto(id: string) {
    setPhotos((p) => {
      const gone = p.find((x) => x.id === id)
      if (gone) URL.revokeObjectURL(gone.preview)
      return p.filter((x) => x.id !== id)
    })
  }

  function makeCover(id: string) {
    setPhotos((p) => [...p.filter((x) => x.id === id), ...p.filter((x) => x.id !== id)])
  }

  function pickFromPhoto(e: React.MouseEvent<HTMLImageElement>) {
    if (!sampler) return
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const fy = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    const key = sampler(fx, fy)
    if (picking === 'body') {
      touched.current.body = true
      setBody(key)
      setMarks((m) => ({ ...m, body: [fx, fy] }))
      setPicking('border')
    } else {
      touched.current.border = true
      setBorder(key)
      setMarks((m) => ({ ...m, border: [fx, fy] }))
    }
  }

  function toggleOccasion(o: string) {
    setOccasions((cur) => (cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]))
  }

  const autoName = [body && colorName(body), fabric || 'saree'].filter(Boolean).join(' ')

  async function save(e: FormEvent) {
    e.preventDefault()
    if (status) return
    setError(null)
    try {
      const ids: string[] = []
      for (let i = 0; i < photos.length; i++) {
        setStatus(`Uploading photo ${i + 1} of ${photos.length}…`)
        ids.push(await uploadImage(await resizeImage(photos[i].file)))
      }
      setStatus('Saving…')
      await createSaree(
        {
          name: name.trim() || autoName,
          fabric: fabric || null,
          weave: weave.trim() || null,
          body_color: body,
          border_color: border,
          occasions,
          stored_in: storedIn.trim() || null,
          blouse,
          last_worn: lastWorn || null,
          source: source.trim() || null,
        },
        ids,
      )
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus(null)
    }
  }

  return (
    <form onSubmit={save} className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white py-2 pr-2 pl-4">
        <h1 className="text-[22px] font-bold tracking-tight">Add saree</h1>
        <Link to="/" aria-label="Close" className="flex h-11 w-11 items-center justify-center">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
      </header>

      <div className="flex-1 px-4 pb-6">
        <SectionTitle>Photos</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-soft">
              <img src={p.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 ? (
                <span className="absolute top-1.5 left-1.5 rounded-lg bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(p.id)}
                  className="absolute bottom-1.5 left-1.5 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold"
                >
                  Make cover
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90"
              >
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <>
              <AddTile label="Take photo" onClick={() => cameraInput.current?.click()} icon="camera" />
              <AddTile label="Gallery" onClick={() => galleryInput.current?.click()} icon="gallery" />
            </>
          )}
        </div>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
        <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ''))} />
        <p className="mt-2 text-xs text-muted">Tip: full drape, border close-up, pallu. Photos are shrunk before upload.</p>

        <SectionTitle>Colours</SectionTitle>
        {photos[0] ? (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[13px] text-[#4a4a4a]">Tap the photo to pick</span>
              {(['body', 'border'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={picking === m}
                  onClick={() => setPicking(m)}
                  className={`h-9 rounded-full border px-3.5 text-[13px] capitalize ${picking === m ? 'border-ink bg-ink font-semibold text-white' : 'border-[#d6d6d2] text-[#3a3a3a]'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="relative mx-auto w-3/4">
              <img
                src={photos[0].preview}
                alt="Cover photo — tap to pick a colour"
                onClick={pickFromPhoto}
                className={`block h-auto w-full rounded-xl ${sampler ? 'cursor-crosshair' : ''}`}
              />
              {(['body', 'border'] as const).map((m) => {
                const pt = marks[m]
                const key = m === 'body' ? body : border
                if (!pt) return null
                return (
                  <span
                    key={m}
                    aria-hidden="true"
                    className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1"
                    style={{ left: `${pt[0] * 100}%`, top: `${pt[1] * 100}%` }}
                  >
                    <span className="h-6 w-6 rounded-full border-[3px] border-white shadow-[0_0_0_1.5px_#1a1a1a,0_2px_6px_rgba(0,0,0,0.35)]" style={{ background: colorBg(key) }} />
                    <span className="rounded-md bg-black/65 px-1.5 py-0.5 text-[11px] font-semibold text-white capitalize">{m}</span>
                  </span>
                )
              })}
            </div>
            <p className="mt-2 text-center text-xs text-muted">
              {picking === 'body' ? 'Tap the main fabric of the saree.' : 'Now tap the border.'}
            </p>
          </div>
        ) : (
          <p className="-mt-1.5 mb-2.5 text-[13px] text-muted">Add a photo for suggestions, or pick below.</p>
        )}
        <ColorRow
          label="Body"
          value={body}
          suggested={suggested}
          onPick={(k) => ((touched.current.body = true), setBody(k))}
        />
        <div className="h-4" />
        <ColorRow
          label="Border"
          value={border}
          suggested={suggested}
          onPick={(k) => ((touched.current.border = true), setBorder(k))}
        />

        <SectionTitle>Details</SectionTitle>
        <div className="flex flex-col gap-3.5">
          <Field label="Name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Fabric">
              <select value={fabric} onChange={(e) => setFabric(e.target.value)} className={`${inputCls} bg-white px-2.5`}>
                <option value="">Choose…</option>
                {FABRICS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </Field>
            <Field label="Weave / type">
              <input type="text" value={weave} onChange={(e) => setWeave(e.target.value)} placeholder="e.g. Kanjivaram" className={inputCls} />
            </Field>
          </div>

          <div>
            <div className="mb-2 text-[13px] font-medium">Occasion</div>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <Chip key={o} active={occasions.includes(o)} onClick={() => toggleOccasion(o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[13px] font-medium">Blouse</div>
            <div className="grid grid-cols-3 rounded-[14px] bg-soft p-1">
              {BLOUSES.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={blouse === b.value}
                  onClick={() => setBlouse(blouse === b.value ? null : b.value)}
                  className={`h-10 rounded-[10px] text-sm ${blouse === b.value ? 'bg-white font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'text-[#4a4a4a]'}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Stored in">
            <input type="text" list="spots" value={storedIn} onChange={(e) => setStoredIn(e.target.value)} placeholder="e.g. Almirah 1 · Shelf 2" className={inputCls} />
            <datalist id="spots">
              {spots.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>
          <Field label="Last worn (optional)">
            <input type="date" value={lastWorn} onChange={(e) => setLastWorn(e.target.value)} className={`${inputCls} bg-white`} />
          </Field>
          <Field label="Bought / gifted by (optional)">
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Shop or person, year" className={inputCls} />
          </Field>
        </div>

        {error && (
          <p role="alert" className="mt-5 rounded-xl bg-[#fdecea] px-3.5 py-2.5 text-sm text-[#8a1c12]">
            {error}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-[#eeeeea] bg-white px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button type="submit" disabled={!!status} className="h-13 w-full rounded-full bg-ink text-base font-semibold text-white disabled:opacity-70">
          {status ?? 'Save saree'}
        </button>
      </div>
    </form>
  )
}

const inputCls = 'h-12 w-full rounded-xl border border-[#d6d6d2] px-3.5 text-[15px] text-ink outline-none focus:border-ink'

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mt-6 mb-2.5 text-[13px] font-semibold tracking-[0.06em] text-[#5c5c5c] uppercase">{children}</h2>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium">
      {label}
      {children}
    </label>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-sm ${active ? 'border-ink bg-ink font-semibold text-white' : 'border-[#d6d6d2] text-[#3a3a3a]'}`}
    >
      {children}
    </button>
  )
}

function ColorRow({ label, value, suggested, onPick }: { label: string; value: ColorKey | null; suggested: ColorKey[]; onPick: (k: ColorKey) => void }) {
  // Suggested colours first, then the rest of the palette.
  const order = [...suggested, ...PALETTE.map((p) => p.key).filter((k) => !suggested.includes(k))]
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">
        {label} · <span className="font-normal">{value ? colorName(value) : 'not set'}</span>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
        {order.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={colorName(k)}
            aria-pressed={value === k}
            onClick={() => onPick(k)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${value === k ? 'border-ink' : 'border-transparent'}`}
          >
            <span className="h-[34px] w-[34px] rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: colorBg(k) }} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AddTile({ label, onClick, icon }: { label: string; onClick: () => void; icon: 'camera' | 'gallery' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-[#b8b8b2] bg-[#fafaf8] text-[13px] text-[#3a3a3a]"
    >
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
