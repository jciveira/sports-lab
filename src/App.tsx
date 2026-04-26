import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ScoreboardPage } from './pages/ScoreboardPage'
import { MatchPage } from './pages/MatchPage'
import { AdminNewMatchPage } from './pages/AdminNewMatchPage'
import { AdminMatchPage } from './pages/AdminMatchPage'
import { AdminMatchesPage } from './pages/AdminMatchesPage'
import { CreateTournamentPage } from './pages/admin/CreateTournamentPage'
import { TournamentPage } from './pages/TournamentPage'
import { HelpPage } from './pages/HelpPage'
import { SuggestionsPage } from './pages/SuggestionsPage'
import { GamesPage } from './pages/GamesPage'
import { TournamentsPage } from './pages/TournamentsPage'
import { PlayerCardPage } from './pages/PlayerCardPage'
import { RosterPage } from './pages/RosterPage'
import { MatchesTab } from './pages/MatchesTab'
import { TournamentsTab } from './pages/TournamentsTab'
import { ViewerTournamentPage } from './pages/ViewerTournamentPage'
import { RostersTab } from './pages/RostersTab'
import { MoreTab } from './pages/MoreTab'
import { AdminGuard } from './components/AdminGuard'
import { ViewerShell } from './components/ViewerShell'
import { AdminShell } from './components/AdminShell'
import { AdminPartidosPage } from './pages/admin/AdminPartidosPage'
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
          <Route path="/partidos" element={<MatchesTab />} />
          <Route path="/torneos" element={<TournamentsTab />} />
          <Route path="/torneos/:id" element={<ViewerTournamentPage />} />
          <Route path="/plantillas" element={<RostersTab />} />
          <Route path="/mas" element={<MoreTab />} />
        </Route>

        {/* Root redirects into viewer shell */}
        <Route path="/" element={<Navigate to="/partidos" replace />} />

        {/* Detail pages — full screen, no tab bar */}
        <Route path="/games" element={<GamesPage />} />
        <Route path="/scoreboard" element={<ScoreboardPage />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
        <Route path="/player/:id" element={<PlayerCardPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />

        {/* Admin shell — PIN-gated, bottom tab nav */}
        <Route element={<AdminGuard />}>
          <Route element={<AdminShell />}>
            {/* Tab pages */}
            <Route path="/admin/partidos" element={<AdminPartidosPage />} />
            <Route path="/admin/torneos" element={<AdminTorneosPage />} />
            <Route path="/admin/equipos" element={<AdminEquiposPage />} />
            <Route path="/admin/jugadores" element={<AdminJugadoresPage />} />

            {/* Detail pages (tab bar hidden via useMatch in AdminShell) */}
            <Route path="/admin/partidos/nuevo" element={<AdminNewMatchPage />} />
            <Route path="/admin/match/:matchId" element={<AdminMatchPage />} />
            <Route path="/admin/matches" element={<AdminMatchesPage />} />
            <Route path="/admin/equipos/:teamId/roster" element={<RosterPage />} />
            <Route path="/admin/torneos/nuevo" element={<CreateTournamentPage />} />

            {/* Legacy routes redirect to new tab paths */}
            <Route path="/admin/new-match" element={<Navigate to="/admin/partidos/nuevo" replace />} />
            <Route path="/admin/teams" element={<Navigate to="/admin/equipos" replace />} />
            <Route path="/admin/players" element={<Navigate to="/admin/jugadores" replace />} />
            <Route path="/admin/tournament/new" element={<Navigate to="/admin/torneos/nuevo" replace />} />

            {/* Default admin route → partidos tab */}
            <Route path="/admin" element={<Navigate to="/admin/partidos" replace />} />
          </Route>
        </Route>
      </Routes>
      <BugReportButton />
      <ReloadPrompt />
    </BrowserRouter>
  )
}
