import { Link } from 'react-router-dom'

/** Temporary stand-in until each screen from the design canvas is built. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">Screen coming next.</p>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full border border-line px-4 py-2" to="/">Collection</Link>
        <Link className="rounded-full border border-line px-4 py-2" to="/add">Add saree</Link>
        <Link className="rounded-full border border-line px-4 py-2" to="/search-photo">Search by photo</Link>
      </nav>
    </main>
  )
}
