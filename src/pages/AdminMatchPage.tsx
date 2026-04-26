import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { getMatch } from '../lib/matches'
import { supabase } from '../lib/supabase'
import { saveSession } from '../lib/session'
import { LinkRow } from '../components/ui/CodeRow'
import type { DbMatch } from '../lib/database.types'

export function AdminMatchPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [match, setMatch] = useState<DbMatch | null>(null)
  const [homeTeamName, setHomeTeamName] = useState('Local')
  const [awayTeamName, setAwayTeamName] = useState('Visitante')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) return

    async function load() {
      try {
        const dbMatch = await getMatch(matchId!)
        if (!dbMatch) {
          setError('Partido no encontrado')
          setLoading(false)
          return
        }
        setMatch(dbMatch)

        const { data: homeTeam } = await supabase
          .from('teams')
          .select('name')
          .eq('id', dbMatch.home_team_id)
          .single()
        const { data: awayTeam } = await supabase
          .from('teams')
          .select('name')
          .eq('id', dbMatch.away_team_id)
          .single()

        if (homeTeam) setHomeTeamName(homeTeam.name)
        if (awayTeam) setAwayTeamName(awayTeam.name)
      } catch {
        setError('No se pudo cargar el partido')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [matchId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-hbl-bg">
        <Loader2 className="w-8 h-8 animate-spin text-hbl-accent" />
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg gap-4 p-6">
        <p className="text-hbl-clock">{error ?? 'Partido no encontrado'}</p>
        <Link to="/" className="flex items-center gap-2 text-hbl-accent">
          <ArrowLeft className="w-4 h-4" /> Volver al inicio
        </Link>
      </div>
    )
  }

  const viewerUrl = `${window.location.origin}/match/${match.id}`
  const statusLabels: Record<string, string> = {
    scheduled: 'Programado',
    running: 'En juego',
    paused: 'Pausado',
    halftime: 'Descanso',
    finished: 'Finalizado',
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <BackButton to="/games" />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-hbl-accent">Administrar partido</h1>
        <p className="text-hbl-text-muted text-sm">{homeTeamName} vs {awayTeamName}</p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          match.status === 'finished' ? 'bg-hbl-text-muted/20 text-hbl-text-muted' :
          match.status === 'running' ? 'bg-hbl-score/20 text-hbl-score' :
          'bg-hbl-accent/20 text-hbl-accent'
        }`}>
          {statusLabels[match.status] ?? match.status}
        </span>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <LinkRow
          label="Enlace del partido"
          url={viewerUrl}
          hint="Compartir con espectadores y anotador"
        />
      </div>

      <button
        onClick={() => {
          saveSession(match.id, 'admin')
          navigate(`/match/${match.id}`)
        }}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold active:scale-95 transition-transform"
      >
        Ver partido
      </button>
    </div>
  )
}
