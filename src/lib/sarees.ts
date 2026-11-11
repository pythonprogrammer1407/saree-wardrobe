import { supabase } from './supabase'
import type { Saree } from './types'

const SELECT = '*, saree_images(id, public_id, position, is_cover)'

/** All sarees, newest first, with their photos sorted (cover first). */
export async function fetchSarees(): Promise<Saree[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('sarees').select(SELECT).order('created_at', { ascending: false })
  if (error) throw error
  return (data as Saree[]).map(sortImages)
}

export function coverImage(s: Saree) {
  return s.saree_images[0] ?? null
}

function sortImages(s: Saree): Saree {
  const imgs = [...(s.saree_images ?? [])].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position,
  )
  return { ...s, saree_images: imgs }
}

/** "Worn Feb 2026" / "Never worn" */
export function wornLabel(lastWorn: string | null): string {
  if (!lastWorn) return 'Never worn'
  const d = new Date(lastWorn)
  return 'Worn ' + d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export interface NewSaree {
  name: string
  fabric: string | null
  weave: string | null
  body_color: string | null
  border_color: string | null
  body_hex: string | null
  border_hex: string | null
  occasions: string[]
  stored_in: string | null
  blouse: 'stitched' | 'unstitched' | 'none' | null
  last_worn: string | null
  source: string | null
}

/** Insert a saree and its already-uploaded photos (first photo = cover). Returns the new id. */
export async function createSaree(saree: NewSaree, publicIds: string[]): Promise<string> {
  if (!supabase) throw new Error('Not configured')
  const { data, error } = await supabase.from('sarees').insert(saree).select('id').single()
  if (error) throw error
  if (publicIds.length) {
    const rows = publicIds.map((public_id, position) => ({ saree_id: data.id, public_id, position, is_cover: position === 0 }))
    const { error: imgErr } = await supabase.from('saree_images').insert(rows)
    if (imgErr) throw imgErr
  }
  return data.id as string
}

/** Distinct "stored in" values already used, for autocomplete. */
export async function fetchStorageSpots(): Promise<string[]> {
  if (!supabase) return []
  const { data } = await supabase.from('sarees').select('stored_in').not('stored_in', 'is', null)
  return [...new Set((data ?? []).map((r) => r.stored_in as string))].sort()
}

export async function fetchSaree(id: string): Promise<Saree | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('sarees').select(SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? sortImages(data as Saree) : null
}

/** Update a saree's fields and replace its photo list (in order; first = cover). */
export async function updateSaree(id: string, saree: NewSaree, publicIds: string[]): Promise<void> {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase.from('sarees').update(saree).eq('id', id)
  if (error) throw error
  const { error: delErr } = await supabase.from('saree_images').delete().eq('saree_id', id)
  if (delErr) throw delErr
  if (publicIds.length) {
    const rows = publicIds.map((public_id, position) => ({ saree_id: id, public_id, position, is_cover: position === 0 }))
    const { error: imgErr } = await supabase.from('saree_images').insert(rows)
    if (imgErr) throw imgErr
  }
}

export async function setLastWorn(id: string, date: string | null): Promise<void> {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase.from('sarees').update({ last_worn: date }).eq('id', id)
  if (error) throw error
}

/** Deletes the saree and (via cascade) its photo rows. The image files stay in Cloudinary. */
export async function deleteSaree(id: string): Promise<void> {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase.from('sarees').delete().eq('id', id)
  if (error) throw error
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "14 Feb 2026 · 9 months ago" / "Today" / "Never worn" */
export function wornDetail(lastWorn: string | null): string {
  if (!lastWorn) return 'Never worn'
  if (lastWorn === todayISO()) return 'Today'
  const d = new Date(lastWorn + 'T00:00:00')
  const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const days = Math.round((Date.now() - d.getTime()) / 86400000)
  const ago =
    days < 1 ? 'today' : days < 31 ? `${days} day${days === 1 ? '' : 's'} ago` : days < 365 ? `${Math.round(days / 30)} months ago` : `${(days / 365).toFixed(1).replace('.0', '')} years ago`
  return `${date} · ${ago}`
}
