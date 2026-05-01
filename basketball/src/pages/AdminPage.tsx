import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamsStore } from '../stores/useTeamsStore'
import { useMatchesStore, type MatchWithDuration } from '../stores/useMatchesStore'
import { CollapsibleSection } from '../components/CollapsibleSection'
import type { Match, Team } from '../types'

function statusBadge(status: Match['status']) {
  const map: Record<Match['status'], { label: string; colour: string }> = {
    scheduled: { label: 'Programado', colour: 'text-bbl-team-home' },
    running: { label: 'En vivo', colour: 'text-bbl-score' },
    paused: { label: 'Pausado', colour: 'text-bbl-warning' },
    quarter_break: { label: 'Descanso', colour: 'text-bbl-warning' },
    finished: { label: 'Finalizado', colour: 'text-bbl-text-muted' },
  }
  const { label, colour } = map[status] ?? { label: status, colour: 'text-bbl-text-muted' }
  return <span className={`text-xs font-bold uppercase ${colour}`}>{label}</span>
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="px-3 py-1.5 rounded-lg bg-bbl-surface-light border border-bbl-border text-xs text-bbl-text hover:border-bbl-accent hover:text-bbl-accent transition-colors min-h-8 active:scale-95"
    >
      {copied ? '¡Copiado!' : 'Copiar URL'}
    </button>
  )
}

function MatchesSection({ matches, teams, loading }: { matches: MatchWithDuration[]; teams: Team[]; loading: boolean }) {
  const createMatch = useMatchesStore((s) => s.createMatch)
  const storeError = useMatchesStore((s) => s.error)
  const [homeTeamId, setHomeTeamId] = useState('')
  const [awayTeamId, setAwayTeamId] = useState('')
  const [quarterDuration, setQuarterDuration] = useState<8 | 10>(8)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!homeTeamId || !awayTeamId) return
    if (homeTeamId === awayTeamId) {
      setLocalError('Los equipos local y visitante deben ser diferentes')
      return
    }
    setSubmitting(true)
    setLocalError(null)
    const result = await createMatch(homeTeamId, awayTeamId, quarterDuration)
    setSubmitting(false)
    if (result) {
      setHomeTeamId('')
      setAwayTeamId('')
      setQuarterDuration(8)
    } else {
      setLocalError(storeError ?? 'No se pudo crear el partido')
    }
  }

  const viewerBase = `${window.location.origin}/match`

  return (
    <CollapsibleSection title="Partidos">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
        <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Nuevo partido</p>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Equipo local</label>
          <select
            value={homeTeamId}
            onChange={(e) => setHomeTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value="">Seleccionar local</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Equipo visitante</label>
          <select
            value={awayTeamId}
            onChange={(e) => setAwayTeamId(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value="">Seleccionar visitante</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-bbl-text-muted">Duración del cuarto</label>
          <select
            value={quarterDuration}
            onChange={(e) => setQuarterDuration(Number(e.target.value) as 8 | 10)}
            className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text focus:outline-none focus:border-bbl-accent min-h-12"
          >
            <option value={8}>8 minutos</option>
            <option value={10}>10 minutos</option>
          </select>
        </div>

        {localError && <p className="text-sm text-bbl-clock">{localError}</p>}

        <button
          type="submit"
          disabled={submitting || !homeTeamId || !awayTeamId || teams.length < 2}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creando…' : 'Crear partido'}
        </button>

        {teams.length < 2 && (
          <p className="text-xs text-bbl-text-muted text-center">Necesitas al menos 2 equipos para programar un partido.</p>
        )}
      </form>

      {loading ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
      ) : matches.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Sin partidos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {matches.map((match) => {
            const home = teams.find((t) => t.id === match.home_team_id)
            const away = teams.find((t) => t.id === match.away_team_id)
            const viewerUrl = `${viewerBase}/${match.id}/view`
            return (
              <li key={match.id} className="flex flex-col gap-2 p-3 rounded-xl bg-bbl-surface border border-bbl-border">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate text-bbl-text">
                    {home?.name ?? 'Desconocido'} vs {away?.name ?? 'Desconocido'}
                  </p>
                  {statusBadge(match.status)}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-bbl-text-muted font-mono truncate">/match/{match.id}/view</span>
                  <CopyButton url={viewerUrl} />
                </div>
                {match.status !== 'finished' && (
                  <Link
                    to={`/match/${match.id}?admin=1`}
                    className={`flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-sm min-h-11 active:scale-95 transition-transform ${
                      match.status === 'scheduled'
                        ? 'bg-bbl-accent text-bbl-bg'
                        : 'bg-bbl-warning/20 border border-bbl-warning text-bbl-warning'
                    }`}
                  >
                    {match.status === 'scheduled' ? 'Activar' : 'Continuar'}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </CollapsibleSection>
  )
}

export function AdminPage() {
  const teams = useTeamsStore((s) => s.teams)
  const teamsLoading = useTeamsStore((s) => s.loading)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  const matches = useMatchesStore((s) => s.matches)
  const matchesLoading = useMatchesStore((s) => s.loading)
  const fetchMatches = useMatchesStore((s) => s.fetchMatches)

  useEffect(() => {
    void fetchTeams()
    void fetchMatches()
  }, [fetchTeams, fetchMatches])

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <MatchesSection matches={matches} teams={teams} loading={matchesLoading || teamsLoading} />
      </div>
    </div>
  )
}
