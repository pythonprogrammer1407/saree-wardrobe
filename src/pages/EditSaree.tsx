import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchSaree } from '../lib/sarees'
import type { Saree } from '../lib/types'
import { SareeForm } from './AddSaree'

export default function EditSaree() {
  const { id = '' } = useParams()
  const [saree, setSaree] = useState<Saree | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSaree(id).then(setSaree).catch((e: Error) => setError(e.message))
  }, [id])

  if (saree) return <SareeForm key={saree.id} initial={saree} />
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link to="/" className="text-sm underline">← Back to collection</Link>
      <p className="mt-6 text-sm text-muted">
        {error ? `Couldn't load this saree: ${error}` : saree === null ? "This saree doesn't exist any more." : 'Loading…'}
      </p>
    </main>
  )
}
