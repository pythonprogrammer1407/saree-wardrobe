import { HashRouter, Route, Routes } from 'react-router-dom'
import { isCloudinaryConfigured } from './lib/cloudinary'
import { isSupabaseConfigured } from './lib/supabase'
import Placeholder from './pages/Placeholder'
import SetupNeeded from './pages/SetupNeeded'

// HashRouter (/#/saree/123) because GitHub Pages can't route deep links to index.html.
export default function App() {
  if (!isSupabaseConfigured || !isCloudinaryConfigured) return <SetupNeeded />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Placeholder title="My Sarees" />} />
        <Route path="/saree/:id" element={<Placeholder title="Saree detail" />} />
        <Route path="/add" element={<Placeholder title="Add saree" />} />
        <Route path="/search-photo" element={<Placeholder title="Search by photo" />} />
        <Route path="*" element={<Placeholder title="Not found" />} />
      </Routes>
    </HashRouter>
  )
}
