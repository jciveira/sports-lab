import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { ViewerPage } from './pages/ViewerPage'
import ScorekeeperPage from './pages/ScorekeeperPage'
import { PlayerCardPage } from './pages/PlayerCardPage'
import { TournamentPage } from './pages/TournamentPage'
import { TournamentBracketPage } from './pages/TournamentBracketPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/match/:id/view" element={<ViewerPage />} />
        <Route path="/match/:id" element={<ScorekeeperPage />} />
        <Route path="/player/:id/card" element={<PlayerCardPage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/tournament/:id/bracket" element={<TournamentBracketPage />} />
      </Routes>
    </BrowserRouter>
  )
}
