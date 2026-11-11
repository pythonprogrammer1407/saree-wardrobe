/**
 * Shrink a photo before upload: longest side ≤ 2000px, JPEG ~85%.
 * A 3–5 MB phone photo becomes ~300–500 KB, which keeps Cloudinary well inside the free tier.
 */
export async function resizeImage(file: File, maxSide = 2000, quality = 0.85): Promise<Blob> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process photo'))), 'image/jpeg', quality),
  )
}

/** Decode a photo, respecting the phone's EXIF rotation. */
export async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error("This photo format isn't supported here. Try a JPG or PNG.")
  }
}
