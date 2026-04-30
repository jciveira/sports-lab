import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { AdminGuard } from './components/AdminGuard'
import { AdminShell } from './components/AdminShell'
import { ViewerShell } from './components/ViewerShell'
import { ViewerPage } from './pages/ViewerPage'
import ScorekeeperPage from './pages/ScorekeeperPage'
import { PlayerCardPage } from './pages/PlayerCardPage'
import { TournamentPage } from './pages/TournamentPage'
import { TournamentBracketPage } from './pages/TournamentBracketPage'
import { PartidosTab } from './pages/PartidosTab'
import { TorneosTab } from './pages/TorneosTab'
import { JugadoresTab } from './pages/JugadoresTab'
import { MasTab } from './pages/MasTab'
import { AdminTorneosPage } from './pages/admin/AdminTorneosPage'
import { AdminEquiposPage } from './pages/admin/AdminEquiposPage'
import { AdminJugadoresPage } from './pages/admin/AdminJugadoresPage'
import { BugReportButton } from './components/BugReportButton'
import { ReloadPrompt } from './components/ReloadPrompt'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Viewer shell with bottom tab navigation */}
        <Route element={<ViewerShell />}>
          <Route path="/partidos" element={<PartidosTab />} />
          <Route path="/torneos" element={<TorneosTab />} />
          <Route path="/jugadores" element={<JugadoresTab />} />
          <Route path="/mas" element={<MasTab />} />
        </Route>

        {/* Root redirects into viewer shell */}
        <Route path="/" element={<Navigate to="/partidos" replace />} />

        {/* Detail pages — full screen, no tab bar */}
        <Route path="/match/:id/view" element={<ViewerPage />} />
        <Route path="/match/:id" element={<ScorekeeperPage />} />
        <Route path="/player/:id/card" element={<PlayerCardPage />} />
        <Route path="/tournament/:id/bracket" element={<TournamentBracketPage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />

        {/* Admin shell — PIN-gated, bottom tab nav */}
        <Route element={<AdminGuard />}>
          <Route element={<AdminShell />}>
            <Route path="/admin/partidos" element={<AdminPage />} />
            <Route path="/admin/torneos" element={<AdminTorneosPage />} />
            <Route path="/admin/equipos" element={<AdminEquiposPage />} />
            <Route path="/admin/jugadores" element={<AdminJugadoresPage />} />
            <Route path="/admin" element={<Navigate to="/admin/partidos" replace />} />
          </Route>
        </Route>
      </Routes>
      <BugReportButton />
      <ReloadPrompt />
    </BrowserRouter>
  )
}
