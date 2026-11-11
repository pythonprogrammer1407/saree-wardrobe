import { imageUrl, type ImageSize } from '../lib/cloudinary'
import type { Saree } from '../lib/types'
import { coverImage } from '../lib/sarees'
import { colorBg } from './Swatch'

/**
 * The saree's cover photo, or — when it has none yet — a stand-in drawn from its
 * body and border colours (same look as the design mockups).
 */
export default function SareePhoto({ saree, size = 'thumb', className = '' }: { saree: Saree; size?: ImageSize; className?: string }) {
  const cover = coverImage(saree)
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-soft shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] ${className}`}>
      {cover ? (
        <img
          src={imageUrl(cover.public_id, size)}
          alt={saree.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <div aria-label={`${saree.name} (no photo yet)`} role="img" className="h-full w-full" style={{ background: colorBg(saree.body_color) }}>
          <div
            className="absolute inset-y-0 right-0 w-[26%]"
            style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 6px, rgba(0,0,0,0.06) 6px 12px)' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[20%] border-t-[3px] border-white/45"
            style={{ background: colorBg(saree.border_color) }}
          />
        </div>
      )}
    </div>
  )
}
