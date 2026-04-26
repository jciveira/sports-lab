import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { Link } from 'react-router-dom'
import { createMatch } from '../lib/matches'
import { isSupabaseConfigured } from '../lib/supabase'
import { CONFIG_PRESETS, DEFAULT_CONFIG, type MatchConfig } from '../lib/rules'
import { TeamPicker } from '../components/ui/TeamPicker'
import { SquadPicker } from '../components/ui/SquadPicker'
import { LinkRow } from '../components/ui/CodeRow'
import type { DbMatch } from '../lib/database.types'

export function AdminNewMatchPage() {
  const [homeTeamId, setHomeTeamId] = useState<string | null>(null)
  const [awayTeamId, setAwayTeamId] = useState<string | null>(null)
  const [homeTeamName, setHomeTeamName] = useState('')
  const [awayTeamName, setAwayTeamName] = useState('')
  const [homeSquad, setHomeSquad] = useState<string[]>([])
  const [awaySquad, setAwaySquad] = useState<string[]>([])
  const [preset, setPreset] = useState('u12-standard')
  const [startsAt, setStartsAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdMatch, setCreatedMatch] = useState<DbMatch | null>(null)

  async function handleCreate() {
    if (!homeTeamId || !awayTeamId) {
      setError('Se requieren ambos equipos')
      return
    }
    if (homeTeamId === awayTeamId) {
      setError('El equipo local y visitante deben ser diferentes')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const presetConfig = CONFIG_PRESETS[preset]?.config ?? {}
      const config: MatchConfig = { ...DEFAULT_CONFIG, ...presetConfig }
      const squads = {
        home: homeSquad.length > 0 ? homeSquad : undefined,
        away: awaySquad.length > 0 ? awaySquad : undefined,
      }
      const match = await createMatch(homeTeamId, awayTeamId, config, undefined, squads, startsAt ? new Date(startsAt).toISOString() : undefined)
      setCreatedMatch(match)
    } catch {
      setError('No se pudo crear el partido — intenta de nuevo')
    } finally {
      setLoading(false)
    }
  }

  if (createdMatch) {
    return <MatchCreated match={createdMatch} homeTeam={homeTeamName} awayTeam={awayTeamName} />
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/" />
        <h1 className="text-3xl font-bold text-hbl-accent">Nuevo partido</h1>
        <p className="text-hbl-text-muted text-sm text-center max-w-xs">
          Supabase no está configurado. Establece <code className="text-hbl-text">VITE_SUPABASE_URL</code> y <code className="text-hbl-text">VITE_SUPABASE_ANON_KEY</code> en tu entorno para crear partidos.
        </p>
        <Link to="/" className="text-hbl-accent text-sm">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-8">
      <BackButton to="/" />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-hbl-accent">Nuevo partido</h1>
        <p className="text-hbl-text-muted text-sm">Elige equipos y reglas, luego comparte los códigos</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Equipo local</span>
          <TeamPicker
            value={homeTeamId}
            onChange={(id, team) => { setHomeTeamId(id); setHomeTeamName(team.name); setHomeSquad([]) }}
            placeholder="Selecciona equipo local"
            excludeId={awayTeamId ?? undefined}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Equipo visitante</span>
          <TeamPicker
            value={awayTeamId}
            onChange={(id, team) => { setAwayTeamId(id); setAwayTeamName(team.name); setAwaySquad([]) }}
            placeholder="Selecciona equipo visitante"
            excludeId={homeTeamId ?? undefined}
          />
        </div>

        {homeTeamId && awayTeamId && (
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Convocatoria</span>
            <SquadPicker
              teamId={homeTeamId}
              teamName={homeTeamName}
              selected={homeSquad}
              onChange={setHomeSquad}
            />
            <SquadPicker
              teamId={awayTeamId}
              teamName={awayTeamName}
              selected={awaySquad}
              onChange={setAwaySquad}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Formato del partido</span>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CONFIG_PRESETS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`p-3 rounded-lg bg-hbl-surface border text-sm text-left active:scale-[0.98] transition-all ${
                  preset === key ? 'border-hbl-accent text-hbl-accent' : 'border-hbl-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Fecha y hora (opcional)</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
          />
        </div>

        {error && (
          <p className="text-sm text-hbl-clock">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !homeTeamId || !awayTeamId}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Creando...' : 'Crear partido'}
        </button>
      </div>
    </div>
  )
}

function MatchCreated({ match, homeTeam, awayTeam }: { match: DbMatch; homeTeam: string; awayTeam: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-hbl-accent">¡Partido creado!</h1>
        <p className="text-hbl-text-muted text-sm">{homeTeam} vs {awayTeam}</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <LinkRow label="Enlace de espectador" url={`${window.location.origin}/match/${match.id}`} hint="Compartir por WhatsApp — el anotador accede por este mismo enlace" />
      </div>

      <Link
        to={`/match/${match.id}`}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-lg active:scale-95 transition-transform"
      >
        Ir al partido
      </Link>

      <Link
        to={`/admin/match/${match.id}`}
        className="text-sm text-hbl-text-muted hover:text-hbl-accent transition-colors"
      >
        Ver códigos más tarde
      </Link>

      <p className="text-xs text-hbl-text-muted/50 mt-2">
        Comparte el enlace con espectadores y anotadores — el primero en entrar reclama el rol.
      </p>
    </div>
  )
}
