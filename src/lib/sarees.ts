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
