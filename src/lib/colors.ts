/** The fixed colour palette. Keep in sync with the `colors` table seeded in supabase/schema.sql. */
export const PALETTE = [
  { key: 'red', name: 'Red', hex: '#b3202a' },
  { key: 'maroon', name: 'Maroon', hex: '#6d1a24' },
  { key: 'rani', name: 'Rani pink', hex: '#c2185b' },
  { key: 'pink', name: 'Pink', hex: '#e07a9a' },
  { key: 'orange', name: 'Orange', hex: '#e0782f' },
  { key: 'mustard', name: 'Mustard', hex: '#c9962b' },
  { key: 'olive', name: 'Olive', hex: '#6b6b3a' },
  { key: 'green', name: 'Green', hex: '#3f7d3a' },
  { key: 'bottlegreen', name: 'Bottle green', hex: '#1e4d36' },
  { key: 'seagreen', name: 'Sea green', hex: '#5bb8a0' },
  { key: 'teal', name: 'Teal', hex: '#1f7a78' },
  { key: 'peacock', name: 'Peacock blue', hex: '#0f6283' },
  { key: 'blue', name: 'Blue', hex: '#2f5aa8' },
  { key: 'navy', name: 'Navy', hex: '#1f2a4d' },
  { key: 'purple', name: 'Purple', hex: '#6a3d8f' },
  { key: 'cream', name: 'Cream', hex: '#efe4cc' },
  { key: 'white', name: 'White', hex: '#ffffff' },
  { key: 'grey', name: 'Grey', hex: '#8a8a8a' },
  { key: 'black', name: 'Black', hex: '#1a1a1a' },
  { key: 'gold', name: 'Gold', hex: '#c8a24a' },
  { key: 'silver', name: 'Silver', hex: '#c4c7cc' },
  { key: 'multi', name: 'Multi', hex: '#999999' },
] as const

export type ColorKey = (typeof PALETTE)[number]['key']
