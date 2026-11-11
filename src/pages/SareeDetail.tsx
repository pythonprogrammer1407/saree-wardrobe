import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import SareePhoto from '../components/SareePhoto'
import { colorBg, colorName } from '../components/Swatch'
import { imageUrl } from '../lib/cloudinary'
import { deleteSaree, fetchSaree, setLastWorn, todayISO, wornDetail } from '../lib/sarees'
import type { Saree } from '../lib/types'

const BLOUSE_LABEL = { stitched: 'Stitched', unstitched: 'Unstitched', none: 'No blouse' } as const

export default function SareeDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [saree, setSaree] = useState<Saree | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [undoDate, setUndoDate] = useState<string | null | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSaree(id).then(setSaree).catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <Message text={`Couldn't load this saree: ${error}`} />
  if (saree === undefined) return <Message text="Loading…" />
  if (saree === null) return <Message text="This saree doesn't exist any more." />

  const images = saree.saree_images
  const wornToday = saree.last_worn === todayISO()

  function goTo(i: number) {
    setPhoto(i)
    strip.current?.scrollTo({ left: i * strip.current.clientWidth, behavior: 'smooth' })
  }

  async function toggleWorn() {
    if (!saree || busy) return
    const next = undoDate !== undefined && wornToday ? undoDate : todayISO()
    const prev = saree.last_worn
    setBusy(true)
    try {
      await setLastWorn(saree.id, next)
      setSaree({ ...saree, last_worn: next })
      setUndoDate(next === todayISO() ? prev : undefined)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  async function remove() {
    if (!saree) return
    setBusy(true)
    try {
      await deleteSaree(saree.id)
      navigate('/', { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const details: [string, string | null][] = [
    ['Fabric', saree.fabric],
    ['Weave', saree.weave],
    ['Occasion', saree.occasions.length ? saree.occasions.join(', ') : null],
    ['Stored in', saree.stored_in],
    ['Blouse', saree.blouse ? BLOUSE_LABEL[saree.blouse] : null],
    ['Bought / gifted', saree.source],
  ]

  return (
    <main className="mx-auto min-h-dvh max-w-md pb-12">
      {/* Photos */}
      <div className="relative">
        {images.length ? (
          <div
            ref={strip}
            onScroll={(e) => setPhoto(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto bg-soft [scrollbar-width:none]"
          >
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => setZoom(true)} aria-label={`Zoom photo ${i + 1}`} className="h-full w-full shrink-0 snap-center">
                <img src={imageUrl(img.public_id, 'detail')} alt={`${saree.name}, photo ${i + 1}`} className="h-full w-full object-cover" loading={i ? 'lazy' : 'eager'} />
              </button>
            ))}
          </div>
        ) : (
          <SareePhoto saree={saree} size="detail" className="aspect-[4/5] rounded-none" />
        )}

        <div className="absolute inset-x-4 top-4 flex justify-between">
          <Link to="/" aria-label="Back to collection" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
            <Icon d="M15 18l-6-6 6-6" />
          </Link>
          <Link to={`/saree/${saree.id}/edit`} aria-label="Edit saree" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
            <Icon d="M4 20h4L19 9l-4-4L4 16v4z" size={18} />
          </Link>
        </div>
        {images.length > 1 && (
          <span className="absolute bottom-4 left-4 rounded-xl bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
            {photo + 1} of {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={photo === i}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-[10px] border-2 ${photo === i ? 'border-ink' : 'border-transparent'}`}
            >
              <img src={imageUrl(img.public_id, 'thumb')} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Title */}
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-2xl font-bold tracking-tight">{saree.name}</h1>
        <p className="mt-1 text-sm text-muted">{[saree.weave || saree.fabric, saree.occasions[0]].filter(Boolean).join(' · ') || ' '}</p>
      </div>

      {/* Colours */}
      <div className="grid grid-cols-2 gap-2.5 px-4 py-2">
        {(['body_color', 'border_color'] as const).map((k) => (
          <div key={k} className="flex items-center gap-2.5 rounded-xl bg-[#f6f6f4] p-3">
            <span className="h-7 w-7 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: colorBg(saree[k]) }} />
            <div>
              <div className="text-[11px] tracking-[0.06em] text-muted uppercase">{k === 'body_color' ? 'Body' : 'Border'}</div>
              <div className="text-sm font-semibold">{colorName(saree[k])}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Last worn */}
      <div className="mx-4 my-2 flex items-center justify-between gap-3 rounded-[14px] border border-line px-4 py-3.5">
        <div>
          <div className="text-xs text-muted">Last worn</div>
          <div className="mt-0.5 text-[15px] font-semibold">{wornDetail(saree.last_worn)}</div>
        </div>
        {wornToday && undoDate === undefined ? null : (
          <button
            type="button"
            onClick={toggleWorn}
            disabled={busy}
            className={`h-11 shrink-0 rounded-full border border-ink px-4 text-sm font-semibold disabled:opacity-60 ${wornToday ? 'bg-white text-ink' : 'bg-ink text-white'}`}
          >
            {wornToday ? 'Undo' : 'Worn today'}
          </button>
        )}
      </div>

      {/* Details */}
      <dl className="mx-4 mt-2">
        {details
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-[#eeeeea] py-3.5 text-sm last:border-b-0">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
      </dl>
      {saree.notes && <p className="mx-4 mt-3 text-sm whitespace-pre-line text-[#3a3a3a]">{saree.notes}</p>}

      {/* Delete */}
      <div className="mx-4 mt-8">
        {confirmDelete ? (
          <div className="rounded-[14px] border border-[#f0c4bf] bg-[#fdf3f2] p-4">
            <p className="text-sm font-semibold text-[#8a1c12]">Delete “{saree.name}”?</p>
            <p className="mt-1 text-[13px] text-[#6b2a22]">This removes it from your collection. It can't be undone.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 flex-1 rounded-full border border-[#d6d6d2] bg-white text-sm font-medium">
                Cancel
              </button>
              <button type="button" onClick={remove} disabled={busy} className="h-11 flex-1 rounded-full bg-[#b3261e] text-sm font-semibold text-white disabled:opacity-60">
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 w-full text-sm font-medium text-[#b3261e]">
            Delete saree
          </button>
        )}
      </div>

      {/* Zoom overlay — pinch to zoom works natively on the full-size image */}
      {zoom && images[photo] && (
        <div role="dialog" aria-label="Photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <img src={imageUrl(images[photo].public_id, 'zoom')} alt={saree.name} className="max-h-full max-w-full object-contain" />
          <button type="button" onClick={() => setZoom(false)} aria-label="Close photo" className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      )}
    </main>
  )
}

function Message({ text }: { text: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link to="/" className="text-sm underline">
        ← Back to collection
      </Link>
      <p className="mt-6 text-sm text-muted">{text}</p>
    </main>
  )
}

function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
