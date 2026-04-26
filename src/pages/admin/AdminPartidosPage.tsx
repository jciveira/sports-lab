import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Radio, Calendar, CheckCircle, Play, Flag, Trash2, Check, X, ExternalLink, Loader2, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { listMatchesWithTeams, deleteMatch, activateMatch, finishMatch, updateMatchSchedule, formatMatchDate, toDatetimeLocal } from '../../lib/matches'
import { isSupabaseConfigured } from '../../lib/supabase'
import { TeamLogo } from '../../components/ui/TeamPicker'
import type { MatchWithTeams } from '../../lib/matches'

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

function AdminMatchCard({
  match,
  onActivate,
  onFinish,
  onDelete,
  onUpdateSchedule,
}: {
  match: MatchWithTeams
  onActivate: () => void
  onFinish: () => void
  onDelete: () => void
  onUpdateSchedule: (startsAt: string | null) => Promise<void>
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [busy, setBusy] = useState(false)
  const [editDate, setEditDate] = useState(false)
  const [dateValue, setDateValue] = useState(match.starts_at ? toDatetimeLocal(match.starts_at) : '')
  const isLive = LIVE_STATUSES.has(match.status)
  const isScheduled = match.status === 'scheduled'
  const showScore = isLive || match.status === 'finished'
  const formattedDate = formatMatchDate(match.starts_at)

  async function handleActivate() {
    setBusy(true)
    try { await onActivate() } finally { setBusy(false) }
  }

  async function handleFinish() {
    setBusy(true)
    try { await onFinish() } finally { setBusy(false); setConfirmFinish(false) }
  }

  async function handleDelete() {
    setBusy(true)
    try { await onDelete() } finally { setBusy(false); setConfirmDelete(false) }
  }

  async function handleSaveDate() {
    setBusy(true)
    try {
      const iso = dateValue ? new Date(dateValue).toISOString() : null
      await onUpdateSchedule(iso)
      setEditDate(false)
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
      <div className="flex items-center gap-2">
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

      <div className="flex items-center gap-2 flex-wrap">
        {statusBadge(match.status)}
        <span className="text-[10px] text-hbl-text-muted">{formatDate(match.created_at)}</span>
        {formattedDate && (
          <span className="flex items-center gap-1 text-[10px] text-hbl-accent">
            <Clock className="w-3 h-3" />{formattedDate}
          </span>
        )}
        {match.status !== 'finished' && !editDate && (
          <button
            onClick={() => setEditDate(true)}
            className="ml-auto p-1 rounded hover:bg-hbl-surface-light transition-colors"
            aria-label="Editar fecha y hora"
          >
            <Clock className="w-3.5 h-3.5 text-hbl-text-muted" />
          </button>
        )}
      </div>

      {editDate && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg bg-hbl-surface border border-hbl-accent text-xs text-hbl-text focus:outline-none"
          />
          <button onClick={handleSaveDate} disabled={busy} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Guardar fecha">
            <Check className="w-3.5 h-3.5 text-hbl-accent" />
          </button>
          <button onClick={() => setEditDate(false)} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Cancelar">
            <X className="w-3.5 h-3.5 text-hbl-text-muted" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {isScheduled && (
          <button
            onClick={handleActivate}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-hbl-accent text-hbl-bg text-xs font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Activar
          </button>
        )}

        {isLive && !confirmFinish && (
          <button
            onClick={() => setConfirmFinish(true)}
            disabled={busy}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs font-medium disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Flag className="w-3 h-3 text-hbl-clock" />
            Finalizar
          </button>
        )}

        {isLive && confirmFinish && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-hbl-text-muted">¿Finalizar?</span>
            <button onClick={handleFinish} disabled={busy} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Confirmar finalizar">
              <Check className="w-3.5 h-3.5 text-hbl-clock" />
            </button>
            <button onClick={() => setConfirmFinish(false)} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Cancelar">
              <X className="w-3.5 h-3.5 text-hbl-text-muted" />
            </button>
          </div>
        )}

        {isLive && (
          <Link
            to={`/admin/match/${match.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-hbl-surface-light border border-hbl-border text-xs font-medium active:scale-95 transition-transform"
          >
            <ExternalLink className="w-3 h-3" />
            Abrir marcador
          </Link>
        )}

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="ml-auto p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors"
            aria-label="Eliminar partido"
          >
            <Trash2 className="w-3.5 h-3.5 text-hbl-text-muted" />
          </button>
        ) : (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-hbl-text-muted">¿Eliminar?</span>
            <button onClick={handleDelete} disabled={busy} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Confirmar eliminar">
              <Check className="w-3.5 h-3.5 text-hbl-clock" />
            </button>
            <button onClick={() => setConfirmDelete(false)} className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors" aria-label="Cancelar eliminar">
              <X className="w-3.5 h-3.5 text-hbl-text-muted" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  icon,
  label,
  matches,
  emptyLabel,
  defaultExpanded,
  onActivate,
  onFinish,
  onDelete,
  onUpdateSchedule,
}: {
  icon: React.ReactNode
  label: string
  matches: MatchWithTeams[]
  emptyLabel: string
  defaultExpanded: boolean
  onActivate: (id: string) => Promise<void>
  onFinish: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdateSchedule: (id: string, startsAt: string | null) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex items-center gap-2 px-1 hover:opacity-80 transition-opacity text-left"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-hbl-text-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-hbl-text-muted" />}
        {icon}
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted font-medium">{label}</span>
        <span className="text-xs text-hbl-text-muted/60 ml-auto">{matches.length}</span>
      </button>
      {expanded && (
        matches.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-2">{emptyLabel}</p>
        ) : (
          matches.map((m) => (
            <AdminMatchCard
              key={m.id}
              match={m}
              onActivate={() => onActivate(m.id)}
              onFinish={() => onFinish(m.id)}
              onDelete={() => onDelete(m.id)}
              onUpdateSchedule={(startsAt) => onUpdateSchedule(m.id, startsAt)}
            />
          ))
        )
      )}
    </div>
  )
}

export function AdminPartidosPage() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadMatches() {
    try {
      const data = await listMatchesWithTeams(true)
      setMatches(data)
      setError(null)
    } catch {
      setError('No se pudieron cargar los partidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) loadMatches()
    else setLoading(false)
  }, [])

  async function handleActivate(id: string) {
    await activateMatch(id)
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'paused' } : m)),
    )
  }

  async function handleFinish(id: string) {
    await finishMatch(id)
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'finished' } : m)),
    )
  }

  async function handleDelete(id: string) {
    await deleteMatch(id)
    setMatches((prev) => prev.filter((m) => m.id !== id))
  }

  async function handleUpdateSchedule(id: string, startsAt: string | null) {
    await updateMatchSchedule(id, startsAt)
    setMatches((prev) => prev.map((m) => (m.id === id ? { ...m, starts_at: startsAt } : m)))
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-hbl-text">Partidos</h1>
        <p className="text-sm text-hbl-text-muted">Supabase no está configurado.</p>
      </div>
    )
  }

  const live = matches.filter((m) => LIVE_STATUSES.has(m.status))
  const scheduled = matches.filter((m) => m.status === 'scheduled')
  const finished = matches.filter((m) => m.status === 'finished')

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-hbl-text">Partidos</h1>
        <Link
          to="/admin/partidos/nuevo"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium active:scale-95 transition-transform"
        >
          <PlusCircle className="w-4 h-4" />
          Crear partido
        </Link>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
        </div>
      ) : (
        <>
          <Section
            icon={<Radio className="w-3.5 h-3.5 text-green-400" />}
            label="En directo"
            matches={live}
            emptyLabel="No hay partidos en directo"
            defaultExpanded={true}
            onActivate={handleActivate}
            onFinish={handleFinish}
            onDelete={handleDelete}
            onUpdateSchedule={handleUpdateSchedule}
          />
          <Section
            icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />}
            label="Programados"
            matches={scheduled}
            emptyLabel="No hay partidos programados"
            defaultExpanded={true}
            onActivate={handleActivate}
            onFinish={handleFinish}
            onDelete={handleDelete}
            onUpdateSchedule={handleUpdateSchedule}
          />
          <Section
            icon={<CheckCircle className="w-3.5 h-3.5 text-hbl-text-muted" />}
            label="Finalizados"
            matches={finished}
            emptyLabel="No hay partidos finalizados"
            defaultExpanded={false}
            onActivate={handleActivate}
            onFinish={handleFinish}
            onDelete={handleDelete}
            onUpdateSchedule={handleUpdateSchedule}
          />
        </>
      )}
    </div>
  )
}
