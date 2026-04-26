import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Radio, Clock, CheckCircle, Calendar } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { listMatchesWithTeams, autoActivateMatches, formatMatchDate, sortByStartsAt } from '../lib/matches'
import { supabase } from '../lib/supabase'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { MatchWithTeams } from '../lib/matches'

type Section = 'live' | 'scheduled' | 'finished'

function getSection(match: MatchWithTeams): Section {
  const status = match.status
  if (status === 'running' || status === 'paused' || status === 'halftime') return 'live'
  if (status === 'finished') return 'finished'
  return 'scheduled'
}

function statusBadge(status: string) {
  switch (status) {
    case 'running':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400"><Radio className="w-3 h-3 animate-pulse" />En juego</span>
    case 'paused':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400"><Clock className="w-3 h-3" />Pausado</span>
    case 'halftime':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-400"><Clock className="w-3 h-3" />Descanso</span>
    case 'finished':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-hbl-text-muted"><CheckCircle className="w-3 h-3" />Finalizado</span>
    case 'scheduled':
      return <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400"><Calendar className="w-3 h-3" />Programado</span>
    default:
      return null
  }
}

export function GamesPage() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches() {
    try {
      // Auto-activate matches whose starts_at is within 30 min
      await autoActivateMatches().catch(() => {})
      const data = await listMatchesWithTeams()
      setMatches(data)
      setError(null)
    } catch {
      setError('No se pudieron cargar los partidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatches()
  }, [])

  // Subscribe to realtime updates for live score changes
  useEffect(() => {
    const channel = supabase
      .channel('games-page')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => {
        loadMatches()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const live = matches.filter((m) => getSection(m) === 'live')
  const scheduled = sortByStartsAt(matches.filter((m) => getSection(m) === 'scheduled'))
  const finished = sortByStartsAt(matches.filter((m) => getSection(m) === 'finished'))

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-4 gap-4">
      <BackButton to="/" />

      <div className="flex flex-col items-center gap-1 pt-2">
        <h1 className="text-2xl font-bold text-hbl-accent">Centro de partidos</h1>
        <p className="text-xs text-hbl-text-muted">Partidos en directo y resultados</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
        </div>
      )}

      {error && <p className="text-hbl-clock text-sm">{error}</p>}

      {!loading && !error && matches.length === 0 && (
        <p className="text-hbl-text-muted text-sm py-12">No hay partidos todavía</p>
      )}

      {!loading && live.length > 0 && (
        <MatchSection title="En directo" matches={live} />
      )}

      {!loading && scheduled.length > 0 && (
        <MatchSection title="Programados" matches={scheduled} />
      )}

      {!loading && finished.length > 0 && (
        <MatchSection title="Finalizados" matches={finished} />
      )}
    </div>
  )
}

function MatchSection({ title, matches }: { title: string; matches: MatchWithTeams[] }) {
  return (
    <div className="w-full max-w-lg flex flex-col gap-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-hbl-text-muted">{title}</h2>
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  )
}

function MatchCard({ match }: { match: MatchWithTeams }) {
  const isLive = match.status === 'running' || match.status === 'paused' || match.status === 'halftime'
  const isFinished = match.status === 'finished'
  const formattedDate = formatMatchDate(match.starts_at)

  return (
    <Link
      to={`/match/${match.id}`}
      className={`flex flex-col gap-1 px-3 py-3 rounded-lg bg-hbl-surface border text-sm w-full ${
        isLive ? 'border-green-500/50 hover:border-green-400' : 'border-hbl-border hover:border-hbl-accent'
      } transition-colors active:scale-[0.98]`}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo url={match.homeTeamLogo} size={18} />
          <span className="truncate max-w-[80px] font-medium">{match.homeTeamName}</span>
        </div>

        <div className="flex flex-col items-center min-w-[70px]">
          <span className={`font-mono text-base font-bold ${isFinished || isLive ? 'text-hbl-score' : 'text-hbl-text-muted'}`}>
            {isFinished || isLive ? `${match.home_score} - ${match.away_score}` : 'vs'}
          </span>
          {statusBadge(match.status)}
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="truncate max-w-[80px] text-right font-medium">{match.awayTeamName}</span>
          <TeamLogo url={match.awayTeamLogo} size={18} />
        </div>
      </div>

      {formattedDate && (
        <div className="flex items-center gap-1 text-[10px] text-hbl-text-muted">
          <Clock className="w-3 h-3" />{formattedDate}
        </div>
      )}
    </Link>
  )
}
