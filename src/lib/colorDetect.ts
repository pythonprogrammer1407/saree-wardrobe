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
export async function suggestColors(file: Blob): Promise<{ key: ColorKey; share: number }[]> {
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
  for (let i = 0; i < data.length; i += 4) {
    const key = nearestPaletteColor(data[i], data[i + 1], data[i + 2])
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const total = size * size
  return [...counts.entries()]
    .map(([key, n]) => ({ key, share: n / total }))
    .sort((a, b) => b.share - a.share)
    .filter((c) => c.share >= 0.03)
}
