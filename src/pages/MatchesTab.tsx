import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Calendar, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { listMatchesWithTeams } from '../lib/matches'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { MatchWithTeams } from '../lib/matches'

const LIVE_STATUSES = new Set(['running', 'paused', 'halftime'])

function statusBadge(status: string) {
  if (LIVE_STATUSES.has(status)) {
    const label = status === 'running' ? 'En juego' : status === 'halftime' ? 'Descanso' : 'Pausado'
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400">
        <Radio className="w-3 h-3" />{label}
      </span>
    )
  }
  if (status === 'finished') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-hbl-text-muted">
        <CheckCircle className="w-3 h-3" />Finalizado
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400">
      <Calendar className="w-3 h-3" />Programado
    </span>
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function MatchCard({ match }: { match: MatchWithTeams }) {
  const isLiveOrFinished = LIVE_STATUSES.has(match.status) || match.status === 'finished'
  const showScore = LIVE_STATUSES.has(match.status) || match.status === 'finished'

  const inner = (
    <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-hbl-surface border border-hbl-border active:scale-[0.98] transition-transform">
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <TeamLogo url={match.homeTeamLogo} size={18} />
        <span className="text-sm font-medium truncate max-w-[80px]">{match.homeTeamName}</span>
        {showScore ? (
          <span className="text-sm font-bold font-mono text-hbl-accent px-1">
            {match.home_score} – {match.away_score}
          </span>
        ) : (
          <span className="text-xs text-hbl-text-muted px-1">vs</span>
        )}
        <span className="text-sm font-medium truncate max-w-[80px]">{match.awayTeamName}</span>
        <TeamLogo url={match.awayTeamLogo} size={18} />
      </div>
      <div className="flex items-center gap-2">
        {statusBadge(match.status)}
        <span className="text-[10px] text-hbl-text-muted">{formatDate(match.created_at)}</span>
      </div>
    </div>
  )

  if (isLiveOrFinished) {
    return <Link to={`/match/${match.id}`}>{inner}</Link>
  }
  return <div>{inner}</div>
}

function Section({
  icon,
  label,
  matches,
  defaultOpen,
  emptyLabel,
}: {
  icon: React.ReactNode
  label: string
  matches: MatchWithTeams[]
  defaultOpen: boolean
  emptyLabel: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-1 py-0.5 text-left w-full"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-hbl-text-muted shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-hbl-text-muted shrink-0" />
        )}
        {icon}
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted font-medium">
          {label}
        </span>
        <span className="text-xs text-hbl-text-muted/60 ml-auto">{matches.length}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2">
          {matches.length === 0 ? (
            <p className="text-sm text-hbl-text-muted text-center py-3">{emptyLabel}</p>
          ) : (
            matches.map((m) => <MatchCard key={m.id} match={m} />)
          )}
        </div>
      )}
    </div>
  )
}

type GenderFilter = 'Todos' | 'Masculino' | 'Femenino'

const GENDER_CHIPS: GenderFilter[] = ['Todos', 'Masculino', 'Femenino']

export function MatchesTab() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [tournamentFilter, setTournamentFilter] = useState<string>('all')
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  async function loadMatches() {
    try {
      const data = await listMatchesWithTeams(true)
      setMatches(data)
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    loadMatches()

    const channel = supabase
      .channel('matches-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadMatches()
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [])

  // Derive unique tournaments for dropdown
  const tournaments = [...new Map(
    matches
      .filter((m) => m.tournament_id && m.tournamentName)
      .map((m) => [m.tournament_id!, m.tournamentName!])
  ).entries()]
  const showTournamentFilter = tournaments.length > 1

  // Apply filters
  const filtered = matches.filter((m) => {
    if (genderFilter !== 'Todos' && m.gender !== genderFilter) return false
    if (tournamentFilter !== 'all' && m.tournament_id !== tournamentFilter) return false
    return true
  })

  const live = filtered.filter((m) => LIVE_STATUSES.has(m.status))
  const scheduled = filtered.filter((m) => m.status === 'scheduled')
  const finished = filtered.filter((m) => m.status === 'finished')
  const anyFiltered = genderFilter !== 'Todos' || tournamentFilter !== 'all'
  const noResults = anyFiltered && filtered.length === 0

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60dvh] p-6 gap-4">
        <Radio className="w-12 h-12 text-hbl-accent opacity-40" />
        <p className="text-sm text-hbl-text-muted text-center max-w-xs">
          Supabase no está configurado.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60dvh]">
        <Clock className="w-6 h-6 animate-pulse text-hbl-accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto">
      <h1 className="text-lg font-bold text-hbl-text">Partidos</h1>

      {/* Gender filter chips */}
      <div className="flex gap-2 flex-wrap">
        {GENDER_CHIPS.map((g) => (
          <button
            key={g}
            onClick={() => setGenderFilter(g)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              genderFilter === g
                ? 'bg-hbl-accent text-hbl-bg'
                : 'bg-hbl-surface border border-hbl-border text-hbl-text-muted hover:border-hbl-accent'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Tournament dropdown — only when multiple tournaments */}
      {showTournamentFilter && (
        <select
          value={tournamentFilter}
          onChange={(e) => setTournamentFilter(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
        >
          <option value="all">Todos los torneos</option>
          {tournaments.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      )}

      {noResults ? (
        <p className="text-sm text-hbl-text-muted text-center py-8">
          No hay partidos con estos filtros
        </p>
      ) : (
        <>
          <Section
            icon={<Radio className="w-3.5 h-3.5 text-green-400" />}
            label="En directo"
            matches={live}
            defaultOpen={true}
            emptyLabel="No hay partidos en directo"
          />
          <Section
            icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />}
            label="Programados"
            matches={scheduled}
            defaultOpen={false}
            emptyLabel="No hay partidos programados"
          />
          <Section
            icon={<CheckCircle className="w-3.5 h-3.5 text-hbl-text-muted" />}
            label="Finalizados"
            matches={finished}
            defaultOpen={false}
            emptyLabel="No hay partidos finalizados"
          />
        </>
      )}
    </div>
  )
}
