import { isCloudinaryConfigured } from '../lib/cloudinary'
import { isSupabaseConfigured } from '../lib/supabase'

/** Shown when .env.local (or the GitHub secrets) are missing. */
export default function SetupNeeded() {
  const rows = [
    { label: 'Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)', ok: isSupabaseConfigured },
    { label: 'Cloudinary (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET)', ok: isCloudinaryConfigured },
  ]
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Setup needed</h1>
      <p className="mt-2 text-sm text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in the keys, then restart <code>npm run dev</code>.
      </p>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3 rounded-xl bg-soft p-3 text-sm">
            <span className="font-semibold">{r.ok ? 'Done' : 'Missing'}</span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </main>
  )
}
