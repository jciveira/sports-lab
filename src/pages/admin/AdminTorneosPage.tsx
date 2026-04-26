import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Trophy, Users, Plus, Trash2, Radio, Calendar, CheckCircle, ChevronDown, ChevronRight, Pencil, X, Check } from 'lucide-react'
import { listTournaments, deleteTournament, updateTournament } from '../../lib/tournaments'
import type { DbTournament, TeamCategory, TeamGender } from '../../lib/database.types'
import { TEAM_CATEGORIES, TEAM_GENDERS } from '../../lib/database.types'

type Section = 'active' | 'upcoming' | 'finished'

function getSection(t: DbTournament): Section {
  if (t.status === 'finished') return 'finished'
  if (t.status === 'group_stage' || t.status === 'knockouts') return 'active'
  return 'upcoming'
}

function statusBadge(status: string) {
  switch (status) {
    case 'group_stage':
      return <span className="text-[10px] font-bold uppercase text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Fase de grupos</span>
    case 'knockouts':
      return <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">Eliminatorias</span>
    case 'finished':
      return <span className="text-[10px] font-bold uppercase text-hbl-text-muted bg-hbl-surface px-2 py-0.5 rounded-full">Finalizado</span>
    case 'draft':
      return <span className="text-[10px] font-bold uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Borrador</span>
    default:
      return null
  }
}

function categoryLabel(t: DbTournament): string | null {
  if (!t.category && !t.gender) return null
  return [t.category, t.gender].filter(Boolean).join(' ')
}

export function AdminTorneosPage() {
  const [tournaments, setTournaments] = useState<DbTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterGender, setFilterGender] = useState<string>('')

  async function load() {
    try {
      const data = await listTournaments()
      setTournaments(data)
      setError(null)
    } catch {
      setError('No se pudieron cargar los torneos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el torneo "${name}"? Se borrarán todos los partidos asociados.`)) return
    setDeleting(id)
    try {
      await deleteTournament(id)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('No se pudo eliminar el torneo')
    } finally {
      setDeleting(null)
    }
  }

  async function handleEdit(id: string, updates: { name: string; date: string; category: string; gender: string }) {
    try {
      await updateTournament(id, {
        name: updates.name,
        date: updates.date || null,
        category: updates.category || null,
        gender: updates.gender || null,
      })
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                name: updates.name.trim(),
                date: updates.date || null,
                category: (updates.category || null) as TeamCategory | null,
                gender: (updates.gender || null) as TeamGender | null,
              }
            : t,
        ),
      )
      setEditingId(null)
    } catch (err) {
      throw err
    }
  }

  const filtered = tournaments.filter((t) => {
    if (filterCategory && t.category != null && t.category !== filterCategory) return false
    if (filterGender && t.gender != null && t.gender !== filterGender) return false
    return true
  })

  const active = filtered.filter((t) => getSection(t) === 'active')
  const upcoming = filtered.filter((t) => getSection(t) === 'upcoming')
  const finished = filtered.filter((t) => getSection(t) === 'finished')

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-4 gap-4">
      <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-1 pt-2">
        <h1 className="text-2xl font-bold text-hbl-accent">Torneos</h1>
        <p className="text-xs text-hbl-text-muted">Gestión de torneos</p>
      </div>

      <Link
        to="/admin/torneos/nuevo"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-sm active:scale-95 transition-transform"
      >
        <Plus className="w-4 h-4" /> Crear torneo
      </Link>

      {/* Filters */}
      <div className="flex items-center gap-2 w-full max-w-lg">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text"
        >
          <option value="">Todas las categorías</option>
          {TEAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-hbl-text"
        >
          <option value="">Todos los géneros</option>
          {TEAM_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-hbl-accent" />
        </div>
      )}

      {error && <p className="text-hbl-clock text-sm">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-hbl-text-muted text-sm py-12">No hay torneos{filterCategory || filterGender ? ' con estos filtros' : ''}</p>
      )}

      {!loading && active.length > 0 && (
        <TournamentSection
          title="En curso"
          icon={<Radio className="w-3.5 h-3.5 text-green-400" />}
          tournaments={active}
          deleting={deleting}
          editingId={editingId}
          onDelete={handleDelete}
          defaultExpanded
          onEdit={handleEdit}
          onStartEdit={setEditingId}
        />
      )}

      {!loading && upcoming.length > 0 && (
        <TournamentSection
          title="Próximos"
          icon={<Calendar className="w-3.5 h-3.5 text-blue-400" />}
          tournaments={upcoming}
          deleting={deleting}
          editingId={editingId}
          onDelete={handleDelete}
          defaultExpanded
          onEdit={handleEdit}
          onStartEdit={setEditingId}
        />
      )}

      {!loading && finished.length > 0 && (
        <TournamentSection
          title="Finalizados"
          icon={<CheckCircle className="w-3.5 h-3.5 text-hbl-text-muted" />}
          tournaments={finished}
          deleting={deleting}
          editingId={editingId}
          onDelete={handleDelete}
          defaultExpanded={false}
          onEdit={handleEdit}
          onStartEdit={setEditingId}
        />
      )}
    </div>
  )
}

function TournamentSection({ title, icon, tournaments, deleting, editingId, onDelete, onEdit, onStartEdit, defaultExpanded = true }: {
  title: string
  icon: React.ReactNode
  tournaments: DbTournament[]
  deleting: string | null
  editingId: string | null
  onDelete: (id: string, name: string) => void
  defaultExpanded?: boolean
  onEdit: (id: string, updates: { name: string; date: string; category: string; gender: string }) => Promise<void>
  onStartEdit: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div className="w-full max-w-lg flex flex-col gap-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-hbl-text-muted hover:text-hbl-text transition-colors py-1"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {icon} {title} ({tournaments.length})
      </button>
      {expanded && tournaments.map((t) => (
        <TournamentCard
          key={t.id}
          tournament={t}
          deleting={deleting === t.id}
          editing={editingId === t.id}
          onDelete={() => onDelete(t.id, t.name)}
          onEdit={(updates) => onEdit(t.id, updates)}
          onStartEdit={() => onStartEdit(t.id)}
          onCancelEdit={() => onStartEdit(null)}
        />
      ))}
    </div>
  )
}

function TournamentCard({ tournament: t, deleting: isDeleting, editing, onDelete, onEdit, onStartEdit, onCancelEdit }: {
  tournament: DbTournament
  deleting: boolean
  editing: boolean
  onDelete: () => void
  onEdit: (updates: { name: string; date: string; category: string; gender: string }) => Promise<void>
  onStartEdit: () => void
  onCancelEdit: () => void
}) {
  const label = categoryLabel(t)
  const [editName, setEditName] = useState(t.name)
  const [editDate, setEditDate] = useState(t.date ?? '')
  const [editCategory, setEditCategory] = useState(t.category ?? '')
  const [editGender, setEditGender] = useState(t.gender ?? '')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const isStarted = t.status !== 'draft'

  async function handleSave() {
    if (!editName.trim()) return
    setSaving(true)
    setEditError(null)
    try {
      await onEdit({ name: editName, date: editDate, category: editCategory, gender: editGender })
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 px-3 py-3 rounded-lg bg-hbl-surface border border-hbl-accent">
        {isStarted && (
          <p className="text-xs text-hbl-warning bg-hbl-warning/10 px-2 py-1.5 rounded-lg">
            Este torneo ya ha comenzado. Los cambios en nombre o categoría no afectarán a los partidos existentes.
          </p>
        )}
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          maxLength={50}
          placeholder="Nombre del torneo"
          className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
          autoFocus
        />
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
        />
        <select
          value={editCategory}
          onChange={(e) => setEditCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
        >
          <option value="">Categoría (opcional)</option>
          {TEAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={editGender}
          onChange={(e) => setEditGender(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-hbl-text focus:outline-none focus:border-hbl-accent"
        >
          <option value="">Género (opcional)</option>
          {TEAM_GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        {editError && <p className="text-xs text-hbl-clock">{editError}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={onCancelEdit}
            disabled={saving}
            className="p-1.5 rounded-lg text-hbl-text-muted hover:text-hbl-text transition-colors"
            aria-label="Cancelar edición"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editName.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium disabled:opacity-60 active:scale-95 transition-transform"
            aria-label="Guardar cambios"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-hbl-surface border border-hbl-border">
      <Link
        to={`/tournament/${t.id}`}
        state={{ isAdmin: true }}
        className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
      >
        <Trophy className="w-5 h-5 text-hbl-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{t.name}</span>
            {statusBadge(t.status)}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-hbl-text-muted">
              <Users className="w-3 h-3" />{t.num_teams} equipos
            </span>
            {label && (
              <span className="text-xs text-hbl-text-muted">{label}</span>
            )}
            {t.date && (
              <span className="text-xs text-hbl-text-muted">
                {new Date(t.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onStartEdit() }}
        className="p-2 rounded-lg text-hbl-text-muted hover:text-hbl-accent hover:bg-hbl-bg transition-colors"
        title="Editar torneo"
        aria-label="Editar torneo"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); onDelete() }}
        disabled={isDeleting}
        className="p-2 rounded-lg text-hbl-text-muted hover:text-hbl-clock hover:bg-hbl-bg transition-colors disabled:opacity-40"
        title="Eliminar torneo"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
