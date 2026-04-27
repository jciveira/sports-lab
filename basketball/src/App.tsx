import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'

function ViewerPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Viewer coming soon — match {id}</p>
    </div>
  )
}

function ScorekeeperPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">Scorekeeper coming soon — match {id}</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/match/:id/view" element={<ViewerPage />} />
        <Route path="/match/:id" element={<ScorekeeperPage />} />
      </Routes>
    </BrowserRouter>
  )
}
