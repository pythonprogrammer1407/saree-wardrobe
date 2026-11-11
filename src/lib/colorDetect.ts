import { PALETTE, type ColorKey } from './colors'
import { loadBitmap } from './image'

type Lab = [number, number, number]

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** sRGB (0–255) → CIE Lab, so distances match how different colours look to the eye. */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const lin = (c: number) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

const dist = (a: Lab, b: Lab) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

const PALETTE_LAB = PALETTE.filter((p) => p.key !== 'multi').map((p) => ({
  key: p.key as ColorKey,
  lab: rgbToLab(...hexToRgb(p.hex)),
}))

/** Nearest named palette colour for one pixel. */
export function nearestPaletteColor(r: number, g: number, b: number): ColorKey {
  const lab = rgbToLab(r, g, b)
  let best = PALETTE_LAB[0]
  let bestD = Infinity
  for (const p of PALETTE_LAB) {
    const d = dist(lab, p.lab)
    if (d < bestD) {
      bestD = d
      best = p
    }
  }
  return best.key
}

/**
 * Suggest body + border colours from a photo.
 * Looks at the centre 70% of the image (to skip most of the background), counts which
 * palette colour each pixel is nearest to, and returns the top colours by share.
 * It's a suggestion — the person confirms with one tap.
 */
export async function suggestColors(file: Blob): Promise<{ key: ColorKey; share: number; hex: string }[]> {
  const bitmap = await loadBitmap(file)
  const size = 80
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const cropW = bitmap.width * 0.7
  const cropH = bitmap.height * 0.7
  ctx.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, size, size)
  bitmap.close()

  const { data } = ctx.getImageData(0, 0, size, size)
  const counts = new Map<ColorKey, number>()
  const groups = new Map<ColorKey, number[]>()
  for (let i = 0; i < data.length; i += 4) {
    const key = nearestPaletteColor(data[i], data[i + 1], data[i + 2])
    counts.set(key, (counts.get(key) ?? 0) + 1)
    const g = groups.get(key) ?? []
    g.push(i)
    groups.set(key, g)
  }
  const total = size * size
  return [...counts.entries()]
    .map(([key, n]) => ({ key, share: n / total, hex: medianHex(data, groups.get(key)!) }))
    .sort((a, b) => b.share - a.share)
    .filter((c) => c.share >= 0.03)
}

const ZARI_OR_NEUTRAL = new Set<ColorKey>(['gold', 'silver', 'grey', 'black', 'white', 'cream'])

/**
 * Prepare a tap-to-pick sampler for a photo. The returned function takes a tap position
 * as fractions of the image (0–1) and returns the palette colour for a patch around it.
 * The photo is read at 1000px so individual threads stay visible, and when a real colour
 * makes up at least a fifth of the patch it wins over zari / neutral threads
 * (a teal border woven with gold zari reads as teal, not gold or grey).
 */
export interface Picked {
  key: ColorKey
  hex: string
}

export async function prepareSampler(file: Blob): Promise<(fx: number, fy: number) => Picked> {
  const bitmap = await loadBitmap(file)
  const w = Math.min(1000, bitmap.width)
  const h = Math.max(1, Math.round((bitmap.height * w) / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const { data } = ctx.getImageData(0, 0, w, h)

  return (fx, fy) => {
    const cx = Math.round(fx * (w - 1))
    const cy = Math.round(fy * (h - 1))
    const r = Math.max(4, Math.round(w / 60))
    const counts = new Map<ColorKey, number>()
    const pixels = new Map<ColorKey, number[]>()
    let total = 0
    for (let y = Math.max(0, cy - r); y <= Math.min(h - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(w - 1, cx + r); x++) {
        const i = (y * w + x) * 4
        const key = nearestPaletteColor(data[i], data[i + 1], data[i + 2])
        counts.set(key, (counts.get(key) ?? 0) + 1)
        const px = pixels.get(key) ?? []
        px.push(i)
        pixels.set(key, px)
        total++
      }
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
    const colourful = ranked.find(([k]) => !ZARI_OR_NEUTRAL.has(k))
    const key = colourful && colourful[1] / total >= 0.2 ? colourful[0] : ranked[0][0]
    // Exact shade = median of only the pixels that belong to the winning colour (zari threads excluded).
    return { key, hex: medianHex(data, pixels.get(key)!) }
  }
}

const LAB_BY_KEY = new Map<ColorKey, Lab>(PALETTE_LAB.map((p) => [p.key, p.lab]))

/** How different two palette colours look (CIE76 ΔE). 0 = same; under ~25 reads as "close". */
export function paletteDistance(a: ColorKey, b: ColorKey): number {
  if (a === b) return 0
  const la = LAB_BY_KEY.get(a)
  const lb = LAB_BY_KEY.get(b)
  if (!la || !lb) return Infinity // "multi" only matches itself
  return dist(la, lb)
}

function medianHex(data: Uint8ClampedArray, idx: number[]): string {
  const med = (o: number) => {
    const v = idx.map((i) => data[i + o]).sort((a, b) => a - b)
    return v[v.length >> 1]
  }
  return '#' + [med(0), med(1), med(2)].map((n) => n.toString(16).padStart(2, '0')).join('')
}

/** Perceptual difference between two exact shades (CIE76 ΔE). Under ~10 looks like the same shade. */
export function shadeDistance(a: string, b: string): number {
  return dist(rgbToLab(...hexToRgb(a)), rgbToLab(...hexToRgb(b)))
}
