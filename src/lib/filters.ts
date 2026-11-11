import type { ColorKey } from './colors'
import type { Blouse, Saree } from './types'

export const FABRICS = ['Silk', 'Cotton', 'Cotton silk', 'Linen', 'Georgette', 'Chiffon', 'Organza', 'Tussar', 'Crepe', 'Net', 'Other']
export const OCCASIONS = ['Wedding', 'Festive', 'Office', 'Casual', 'Party']

export interface Filters {
  colors: ColorKey[]
  colorMatch: 'either' | 'body'
  fabrics: string[]
  occasions: string[]
  blouses: Blouse[]
  places: string[]
  notWornLately: boolean
  query: string
}

export const EMPTY_FILTERS: Filters = {
  colors: [],
  colorMatch: 'either',
  fabrics: [],
  occasions: [],
  blouses: [],
  places: [],
  notWornLately: false,
  query: '',
}

/** Number of active filters (search text not counted), for the "Filters (3)" badge. */
export function activeCount(f: Filters): number {
  return (
    (f.colors.length ? 1 : 0) +
    (f.fabrics.length ? 1 : 0) +
    (f.occasions.length ? 1 : 0) +
    (f.blouses.length ? 1 : 0) +
    (f.places.length ? 1 : 0) +
    (f.notWornLately ? 1 : 0)
  )
}

const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000

/** Within a group, any selected value matches (OR); across groups all must match (AND). */
export function applyFilters(sarees: Saree[], f: Filters): Saree[] {
  const q = f.query.trim().toLowerCase()
  const cutoff = Date.now() - SIX_MONTHS_MS
  return sarees.filter((s) => {
    if (f.colors.length) {
      const hit = f.colors.some((c) => s.body_color === c || (f.colorMatch === 'either' && s.border_color === c))
      if (!hit) return false
    }
    if (f.fabrics.length && !f.fabrics.includes(s.fabric ?? '')) return false
    if (f.occasions.length && !f.occasions.some((o) => s.occasions.includes(o))) return false
    if (f.blouses.length && !(s.blouse && f.blouses.includes(s.blouse))) return false
    if (f.places.length && !f.places.includes(s.stored_in ?? '')) return false
    if (f.notWornLately && s.last_worn && new Date(s.last_worn + 'T00:00:00').getTime() > cutoff) return false
    if (q && ![s.name, s.fabric, s.weave, s.stored_in, s.source, ...s.occasions].some((v) => v?.toLowerCase().includes(q))) return false
    return true
  })
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// Kept in memory so filters survive opening a saree and coming back (reset on reload).
let remembered: Filters = EMPTY_FILTERS
export const rememberFilters = (f: Filters) => {
  remembered = f
}
export const recallFilters = () => remembered
