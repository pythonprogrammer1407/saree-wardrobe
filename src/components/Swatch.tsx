import { PALETTE, type ColorKey } from '../lib/colors'

const MULTI = 'conic-gradient(#b3202a, #c9962b, #3f7d3a, #1f7a78, #2f5aa8, #6a3d8f, #b3202a)'

/** CSS background for a palette colour ("multi" is a rainbow wheel). */
export function colorBg(key: ColorKey | null | undefined): string {
  if (!key) return '#e4e4e0'
  if (key === 'multi') return MULTI
  return PALETTE.find((p) => p.key === key)?.hex ?? '#e4e4e0'
}

export function colorName(key: ColorKey | null | undefined): string {
  return PALETTE.find((p) => p.key === key)?.name ?? '—'
}

/** Small round colour dot with a hairline edge so white/cream stay visible. */
export function Dot({ color, size = 10 }: { color: ColorKey | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]"
      style={{ width: size, height: size, background: colorBg(color) }}
    />
  )
}
