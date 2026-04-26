import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react'
import { useTeamsStore } from '../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { isDuplicateTeamName } from '../lib/team-validation'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { DbTeam } from '../lib/database.types'

export function TeamsPage() {
  const { teams, loading, error, fetch, update, remove } = useTeamsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured) fetch()
  }, [fetch])

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold text-hbl-accent">Equipos</h1>
        <p className="text-hbl-text-muted text-sm text-center max-w-xs">
          Supabase no está configurado. Establece <code className="text-hbl-text">VITE_SUPABASE_URL</code> y <code className="text-hbl-text">VITE_SUPABASE_ANON_KEY</code> para gestionar equipos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-hbl-accent">Equipos</h1>
        <p className="text-hbl-text-muted text-sm">Gestiona tus equipos y logos</p>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      <div className="flex flex-col gap-3 w-full max-w-md">
        {loading && teams.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Cargando equipos...</p>
        ) : teams.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Sin equipos aún. Crea tu primer equipo abajo.</p>
        ) : (
          teams.map((team) =>
            editingId === team.id ? (
              <TeamEditRow key={team.id} team={team} onSave={async (updates) => {
                await update(team.id, updates)
                setEditingId(null)
              }} onCancel={() => setEditingId(null)} />
            ) : (
              <TeamRow key={team.id} team={team}
                onEdit={() => setEditingId(team.id)}
                onDelete={() => remove(team.id)}
              />
            )
          )
        )}
      </div>

      {showCreate ? (
        <TeamCreateForm onCreated={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          Nuevo equipo
        </button>
      )}
    </div>
  )
}

function TeamRow({ team, onEdit, onDelete }: { team: DbTeam; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-hbl-surface border border-hbl-border">
      <TeamLogo url={team.badge_url} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{team.name}</p>
        {team.city_district && (
          <p className="text-xs text-hbl-text-muted">{team.city_district}</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link to={`/admin/equipos/${team.id}/roster`} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" title="Gestionar plantilla">
          <Users className="w-4 h-4 text-hbl-accent" />
        </Link>
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors">
          <Pencil className="w-4 h-4 text-hbl-text-muted" />
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button onClick={onDelete} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors">
              <Check className="w-4 h-4 text-hbl-clock" />
            </button>
            <button onClick={() => setConfirmDelete(false)} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors">
              <X className="w-4 h-4 text-hbl-text-muted" />
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg hover:bg-hbl-surface-light transition-colors">
            <Trash2 className="w-4 h-4 text-hbl-text-muted" />
          </button>
        )}
      </div>
    </div>
  )
}

function TeamEditRow({ team, onSave, onCancel }: {
  team: DbTeam
  onSave: (updates: Partial<Pick<DbTeam, 'name' | 'badge_url' | 'nickname' | 'city_district'>>) => Promise<void>
  onCancel: () => void
}) {
  const teams = useTeamsStore((s) => s.teams)
  const [name, setName] = useState(team.name)
  const [badgeUrl, setBadgeUrl] = useState(team.badge_url ?? '')
  const [saving, setSaving] = useState(false)
  const [dupError, setDupError] = useState('')

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (isDuplicateTeamName(trimmed, teams, team.id)) {
      setDupError('Un equipo con este nombre ya existe')
      return
    }
    setDupError('')
    setSaving(true)
    try {
      await onSave({ name: trimmed, badge_url: badgeUrl.trim() || null })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setDupError('') }}
        placeholder="Nombre del equipo"
        maxLength={30}
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      {dupError && <p className="text-xs text-hbl-clock">{dupError}</p>}
      <input
        type="url"
        value={badgeUrl}
        onChange={(e) => setBadgeUrl(e.target.value)}
        placeholder="URL del logo (opcional)"
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function TeamCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const add = useTeamsStore((s) => s.add)
  const teams = useTeamsStore((s) => s.teams)
  const [name, setName] = useState('')
  const [badgeUrl, setBadgeUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [dupError, setDupError] = useState('')

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (isDuplicateTeamName(trimmed, teams)) {
      setDupError('Un equipo con este nombre ya existe')
      return
    }
    setDupError('')
    setSaving(true)
    try {
      await add({ name: trimmed, badge_url: badgeUrl.trim() || undefined })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-md p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
      <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Nuevo equipo</span>
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setDupError('') }}
        placeholder="Nombre del equipo"
        maxLength={30}
        autoFocus
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      {dupError && <p className="text-xs text-hbl-clock">{dupError}</p>}
      <input
        type="url"
        value={badgeUrl}
        onChange={(e) => setBadgeUrl(e.target.value)}
        placeholder="URL del logo (opcional)"
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light">
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-lg text-sm bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
