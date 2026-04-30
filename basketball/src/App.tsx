import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { AdminPage } from './pages/AdminPage'
import { AdminGuard } from './components/AdminGuard'
import { ViewerPage } from './pages/ViewerPage'
import ScorekeeperPage from './pages/ScorekeeperPage'
import { PlayerCardPage } from './pages/PlayerCardPage'
import { TournamentPage } from './pages/TournamentPage'
import { TournamentBracketPage } from './pages/TournamentBracketPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<AdminGuard />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
        <Route path="/match/:id/view" element={<ViewerPage />} />
        <Route path="/match/:id" element={<ScorekeeperPage />} />
        <Route path="/player/:id/card" element={<PlayerCardPage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/tournament/:id/bracket" element={<TournamentBracketPage />} />
      </Routes>
    </BrowserRouter>
  )
}
