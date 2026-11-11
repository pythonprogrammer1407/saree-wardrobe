import type { ColorKey } from './colors'

export type Blouse = 'stitched' | 'unstitched' | 'none'

export interface SareeImage {
  id: string
  public_id: string
  position: number
  is_cover: boolean
}

export interface Saree {
  id: string
  name: string
  fabric: string | null
  weave: string | null
  body_color: ColorKey | null
  border_color: ColorKey | null
  occasions: string[]
  stored_in: string | null
  blouse: Blouse | null
  last_worn: string | null // ISO date
  source: string | null
  notes: string | null
  created_at: string
  saree_images: SareeImage[]
}
