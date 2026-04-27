import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ViewerPage } from './pages/ViewerPage'

function PlaceholderPage({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <h1 className="text-2xl font-bold text-gray-400">{label}</h1>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/match" replace />} />
        <Route
          path="/match"
          element={<PlaceholderPage label="No match selected" />}
        />
        <Route path="/match/:id/view" element={<ViewerPage />} />
        <Route
          path="/match/:id"
          element={<PlaceholderPage label="Scorekeeper coming soon" />}
        />
        <Route
          path="/admin"
          element={<PlaceholderPage label="Admin coming soon" />}
        />
        <Route
          path="/login"
          element={<PlaceholderPage label="Login coming soon" />}
        />
      </Routes>
    </BrowserRouter>
  )
}
