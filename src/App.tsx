import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { isCloudinaryConfigured } from './lib/cloudinary'
import { isSupabaseConfigured } from './lib/supabase'
import AddSaree from './pages/AddSaree'
import Collection from './pages/Collection'
import Login from './pages/Login'
import Placeholder from './pages/Placeholder'
import SetupNeeded from './pages/SetupNeeded'

export default function App() {
  if (!isSupabaseConfigured || !isCloudinaryConfigured) return <SetupNeeded />
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

// Everything is behind login. HashRouter (/#/saree/123) because GitHub Pages
// can't route deep links to index.html.
function Gate() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Login />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Collection />} />
        <Route path="/saree/:id" element={<Placeholder title="Saree detail" />} />
        <Route path="/add" element={<AddSaree />} />
        <Route path="/search-photo" element={<Placeholder title="Search by photo" />} />
        <Route path="*" element={<Placeholder title="Not found" />} />
      </Routes>
    </HashRouter>
  )
}
