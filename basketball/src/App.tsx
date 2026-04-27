import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ScorekeeperPage from './pages/ScorekeeperPage'

function PlaceholderPage({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400 text-lg">{label}</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/match/:id" element={<ScorekeeperPage />} />
        <Route path="/match/:id/view" element={<PlaceholderPage label="Viewer coming soon" />} />
        <Route path="/admin" element={<PlaceholderPage label="Admin coming soon" />} />
        <Route path="/login" element={<PlaceholderPage label="Login coming soon" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
