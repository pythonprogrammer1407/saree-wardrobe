const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset)

/** Preset sizes used across the app. f_auto/q_auto serve WebP/AVIF at sensible quality. */
const SIZES = {
  thumb: 'c_fill,ar_3:4,w_400,f_auto,q_auto',
  detail: 'c_limit,w_1200,f_auto,q_auto',
  zoom: 'c_limit,w_2000,f_auto,q_auto',
} as const

export type ImageSize = keyof typeof SIZES

/** Build a delivery URL for a stored image. Only the public_id lives in the database. */
export function imageUrl(publicId: string, size: ImageSize = 'thumb'): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${SIZES[size]}/${publicId}`
}

/** Upload one (already resized) image straight from the browser. Returns its public_id. */
export async function uploadImage(file: Blob): Promise<string> {
  if (!isCloudinaryConfigured) throw new Error('Cloudinary is not configured')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', uploadPreset!)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  const data = (await res.json()) as { public_id: string }
  return data.public_id
}
