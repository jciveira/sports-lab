import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Camera, Loader2 } from 'lucide-react'
import { usePlayersStore } from '../hooks/usePlayersStore'
import { useTeamsStore } from '../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { uploadPlayerAvatar, getPlayerAvatarUrl } from '../lib/players'
import { TeamPicker, TeamLogo } from '../components/ui/TeamPicker'
import { RatingsEditor } from '../components/RatingsEditor'
import type { DbPlayer, PlayerRatings, CardType } from '../lib/database.types'
import type { PlayerRole } from '../types'

// image/* lets iOS Safari convert HEIC photos to JPEG automatically before delivery;
// specific mime types bypass that conversion and cause silent decode failures on HEIC.
const ACCEPTED_IMAGE_TYPES = 'image/*'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'LW', label: 'Extremo Izquierdo' },
  { value: 'RW', label: 'Extremo Derecho' },
  { value: 'LB', label: 'Lateral Izquierdo' },
  { value: 'CB', label: 'Central' },
  { value: 'RB', label: 'Lateral Derecho' },
  { value: 'PV', label: 'Pivote' },
  { value: 'GK', label: 'Portero' },
]

export function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

export function isDuplicateJersey(number: number, teamId: string, players: DbPlayer[], excludeId?: string): boolean {
  return players.some((p) => p.team_id === teamId && p.number === number && p.id !== excludeId)
}

export function PlayersPage() {
  const { players, loading, error, fetch } = usePlayersStore()
  const { teams, fetch: fetchTeams } = useTeamsStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetch()
      fetchTeams()
    }
  }, [fetch, fetchTeams])

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold text-hbl-accent">Jugadores</h1>
        <p className="text-hbl-text-muted text-sm text-center max-w-xs">
          Supabase no está configurado. Establece <code className="text-hbl-text">VITE_SUPABASE_URL</code> y <code className="text-hbl-text">VITE_SUPABASE_ANON_KEY</code> para gestionar jugadores.
        </p>
      </div>
    )
  }

  // Group players by team
  const teamMap = new Map<string, { team: typeof teams[0] | undefined; players: DbPlayer[] }>()
  for (const player of players) {
    const key = player.team_id ?? '__unassigned__'
    if (!teamMap.has(key)) {
      teamMap.set(key, { team: player.team_id ? teams.find((t) => t.id === player.team_id) : undefined, players: [] })
    }
    teamMap.get(key)!.players.push(player)
  }
  const groups = [...teamMap.values()].sort((a, b) => (a.team?.name ?? '').localeCompare(b.team?.name ?? ''))

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-3xl font-bold text-hbl-accent">Jugadores</h1>
        <p className="text-hbl-text-muted text-sm">Gestiona jugadores por equipo</p>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      <div className="flex flex-col gap-5 w-full max-w-md">
        {loading && players.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">Cargando jugadores...</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-hbl-text-muted text-center py-8">No hay jugadores aún. Añade el primer jugador abajo.</p>
        ) : (
          groups.map(({ team, players: teamPlayers }) => (
            <div key={team?.id ?? 'unknown'} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <TeamLogo url={team?.badge_url} size={20} />
                <span className="text-xs uppercase tracking-widest text-hbl-text-muted font-medium">
                  {team?.name ?? 'Equipo desconocido'}
                </span>
              </div>
              {teamPlayers.map((player) =>
                editingId === player.id ? (
                  <PlayerEditRow
                    key={player.id}
                    player={player}
                    onSave={async ({ display_name, number, role, ratings, card_type }) => {
                      await usePlayersStore.getState().update(player.id, { display_name, number, role, ratings, card_type })
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    onEdit={() => setEditingId(player.id)}
                    onDelete={() => usePlayersStore.getState().remove(player.id)}
                  />
                ),
              )}
            </div>
          ))
        )}
      </div>

      {showCreate ? (
        <PlayerCreateForm onCreated={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
          Nuevo jugador
        </button>
      )}
    </div>
  )
}

export function PlayerRow({ player, onEdit, onDelete }: { player: DbPlayer; onEdit: () => void; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
      <span className="w-8 h-8 rounded-lg bg-hbl-accent/10 flex items-center justify-center text-sm font-bold text-hbl-accent shrink-0">
        {player.number}
      </span>
      {player.avatar_url ? (
        <img
          src={player.avatar_url}
          alt={player.display_name}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
      ) : (
        <button
          onClick={onEdit}
          aria-label="Añadir foto"
          className="w-9 h-9 rounded-full bg-hbl-surface-light flex items-center justify-center shrink-0"
        >
          <Camera className="w-4 h-4 text-hbl-text-muted opacity-40" />
        </button>
      )}
      <Link to={`/player/${player.id}`} className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate hover:text-hbl-accent transition-colors">{player.display_name}</p>
        <p className="text-xs text-hbl-text-muted">{roleLabel(player.role)}</p>
      </Link>
      <div className="flex items-center gap-1">
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

export function PlayerEditRow({ player, onSave, onCancel }: {
  player: DbPlayer
  onSave: (updates: Partial<Pick<DbPlayer, 'display_name' | 'number' | 'role' | 'ratings' | 'card_type'>>) => Promise<void>
  onCancel: () => void
}) {
  const players = usePlayersStore((s) => s.players)
  const [displayName, setDisplayName] = useState(player.display_name)
  const [number, setNumber] = useState(String(player.number))
  const [role, setRole] = useState(player.role)
  const [ratings, setRatings] = useState<PlayerRatings | null>(player.ratings)
  const [cardType, setCardType] = useState<CardType>(player.card_type ?? 'base')
  const [saving, setSaving] = useState(false)
  const [jerseyError, setJerseyError] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => {
    let cancelled = false
    getPlayerAvatarUrl(player.avatar_url).then((url) => {
      if (!cancelled) setAvatarPreview(url)
    })
    return () => { cancelled = true }
  }, [player.avatar_url])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('La imagen supera 2MB')
      return
    }

    setUploadError('')
    setUploading(true)
    try {
      const { path, previewUrl } = await uploadPlayerAvatar(player.id, file)
      setAvatarPreview(previewUrl)
      // Update local store with the path (not the signed URL) so it stays valid
      await usePlayersStore.getState().update(player.id, { avatar_url: path })
    } catch (err) {
      const isDecodeError = err instanceof Error && err.message === 'Failed to load image'
      setUploadError(isDecodeError ? 'Formato no compatible. Usa JPEG, PNG o WebP.' : 'Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    const trimmedName = displayName.trim()
    const num = parseInt(number, 10)
    if (!trimmedName || isNaN(num) || num < 1 || num > 99) return
    if (player.team_id && isDuplicateJersey(num, player.team_id, players, player.id)) {
      setJerseyError(`El dorsal #${num} ya está ocupado en este equipo`)
      return
    }
    setJerseyError('')
    setSaving(true)
    try {
      await onSave({ display_name: trimmedName, number: num, role, ratings, card_type: cardType })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-hbl-surface border border-hbl-accent">
      {/* Avatar upload */}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer shrink-0 group">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt={player.display_name}
              className="w-14 h-14 rounded-full object-cover border-2 border-hbl-border group-hover:border-hbl-accent transition-colors"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-hbl-bg border-2 border-hbl-border group-hover:border-hbl-accent flex items-center justify-center transition-colors">
              <Camera className="w-5 h-5 text-hbl-text-muted" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-hbl-bg/70">
              <Loader2 className="w-5 h-5 text-hbl-accent animate-spin" />
            </div>
          )}
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleAvatarChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] uppercase tracking-widest text-hbl-text-muted">
            {avatarPreview ? 'Toca para cambiar foto' : 'Añadir foto'}
          </span>
          {uploadError && <span className="text-[10px] text-hbl-clock">{uploadError}</span>}
        </div>
      </div>

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Nombre o apodo"
        maxLength={30}
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={number}
          onChange={(e) => { setNumber(e.target.value); setJerseyError('') }}
          min={1}
          max={99}
          placeholder="#"
          className="w-20 px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-center focus:outline-none focus:border-hbl-accent"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {jerseyError && <p className="text-xs text-hbl-clock">{jerseyError}</p>}
      <RatingsEditor role={role} ratings={ratings} onChange={setRatings} />
      {ratings !== null && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-hbl-text-muted">Tipo carta:</label>
          <select
            value={cardType}
            onChange={(e) => setCardType(e.target.value as CardType)}
            className="flex-1 px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
          >
            <option value="base">Base</option>
            <option value="toty">TOTY</option>
          </select>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !displayName.trim() || !number}
          className="px-4 py-2 rounded-lg text-sm bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export function PlayerCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const add = usePlayersStore((s) => s.add)
  const players = usePlayersStore((s) => s.players)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [number, setNumber] = useState('')
  const [role, setRole] = useState<string>('CB')
  const [saving, setSaving] = useState(false)
  const [jerseyError, setJerseyError] = useState('')

  async function handleCreate() {
    const trimmedName = displayName.trim()
    const num = parseInt(number, 10)
    if (!teamId || !trimmedName || isNaN(num) || num < 1 || num > 99) return
    if (isDuplicateJersey(num, teamId, players)) {
      setJerseyError(`El dorsal #${num} ya está ocupado en este equipo`)
      return
    }
    setJerseyError('')
    setSaving(true)
    try {
      await add({ team_id: teamId, display_name: trimmedName, number: num, role })
      onCreated()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-md p-4 rounded-xl bg-hbl-surface border border-hbl-accent">
      <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Nuevo jugador</span>
      <TeamPicker
        value={teamId}
        onChange={(id) => { setTeamId(id); setJerseyError('') }}
        placeholder="Selecciona equipo"
      />
      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Nombre o apodo"
        maxLength={30}
        autoFocus
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      />
      <div className="flex gap-2">
        <input
          type="number"
          value={number}
          onChange={(e) => { setNumber(e.target.value); setJerseyError('') }}
          min={1}
          max={99}
          placeholder="Dorsal"
          className="w-24 px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm text-center focus:outline-none focus:border-hbl-accent"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>
      {jerseyError && <p className="text-xs text-hbl-clock">{jerseyError}</p>}
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light">
          Cancelar
        </button>
        <button
          onClick={handleCreate}
          disabled={saving || !teamId || !displayName.trim() || !number}
          className="px-4 py-2 rounded-lg text-sm bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Creando...' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
