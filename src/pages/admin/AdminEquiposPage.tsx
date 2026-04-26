import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Pencil, Trash2, Check, X, Users, ChevronDown, ChevronRight } from 'lucide-react'
import { useTeamsStore } from '../../hooks/useTeamsStore'
import { usePlayersStore } from '../../hooks/usePlayersStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { isDuplicateTeamName } from '../../lib/team-validation'
import { TeamLogo } from '../../components/ui/TeamPicker'
import { TEAM_CATEGORIES, TEAM_GENDERS, TEAM_REGIONS } from '../../lib/database.types'
import type { DbTeam, TeamCategory, TeamGender, TeamRegion } from '../../lib/database.types'

function isDominicos(name: string): boolean {
  return name.toLowerCase().includes('dominicos')
}

export function AdminEquiposPage() {
  const { teams, loading, error, fetch, update, remove } = useTeamsStore()
  const { players, fetch: fetchPlayers } = usePlayersStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetch()
      fetchPlayers()
    }
  }, [fetch, fetchPlayers])

  const rosterCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of players) {
      if (p.team_id) counts[p.team_id] = (counts[p.team_id] ?? 0) + 1
    }
    return counts
  }, [players])

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aDom = isDominicos(a.name) ? 0 : 1
      const bDom = isDominicos(b.name) ? 0 : 1
      if (aDom !== bDom) return aDom - bDom
      return a.name.localeCompare(b.name)
    })
  }, [teams])

  const regionGroups = useMemo(() => {
    const groups: Record<string, DbTeam[]> = {}
    for (const team of sortedTeams) {
      const key = team.region ?? 'Sin región'
      if (!groups[key]) groups[key] = []
      groups[key].push(team)
    }
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === 'Sin región') return 1
      if (b === 'Sin región') return -1
      return a.localeCompare(b)
    })
  }, [sortedTeams])

  function toggleRegion(region: string) {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-hbl-text">Equipos</h1>
        <p className="text-sm text-hbl-text-muted">
          Supabase no configurado. Establece las variables de entorno.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-hbl-text">Equipos</h1>
        <button
          onClick={() => { setShowCreate(true); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium active:scale-95 transition-transform"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo equipo
        </button>
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      {showCreate && (
        <TeamForm
          teams={teams}
          onSave={async (data) => {
            await useTeamsStore.getState().add(data)
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading && teams.length === 0 ? (
        <p className="text-sm text-hbl-text-muted text-center py-8">Cargando equipos...</p>
      ) : teams.length === 0 && !showCreate ? (
        <p className="text-sm text-hbl-text-muted text-center py-8">Sin equipos aún. Crea tu primer equipo.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {regionGroups.map(([region, regionTeams]) => {
            const isExpanded = expandedRegions.has(region)
            return (
              <div key={region} className="flex flex-col gap-2">
                <button
                  onClick={() => toggleRegion(region)}
                  aria-expanded={isExpanded}
                  className="flex items-center gap-2 py-1 text-xs font-bold uppercase tracking-widest text-hbl-text-muted hover:text-hbl-text transition-colors"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {region} ({regionTeams.length})
                </button>
                {isExpanded && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {regionTeams.map((team) =>
                      editingId === team.id ? (
                        <TeamForm
                          key={team.id}
                          team={team}
                          teams={teams}
                          onSave={async (data) => {
                            await update(team.id, data)
                            setEditingId(null)
                          }}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <TeamCard
                          key={team.id}
                          team={team}
                          rosterCount={rosterCounts[team.id] ?? 0}
                          onEdit={() => { setEditingId(team.id); setShowCreate(false) }}
                          onDelete={() => remove(team.id)}
                        />
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TeamCard({ team, rosterCount, onEdit, onDelete }: {
  team: DbTeam
  rosterCount: number
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const hasRoster = rosterCount > 0

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-xl bg-hbl-surface border transition-opacity ${
        hasRoster ? 'border-hbl-border opacity-100' : 'border-hbl-border/50 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <Link
          to={`/admin/equipos/${team.id}/roster`}
          className="flex items-center gap-2 min-w-0 flex-1"
        >
          <TeamLogo url={team.badge_url} size={36} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate text-hbl-text">{team.name}</p>
            <div className="flex flex-wrap gap-x-2 text-xs text-hbl-text-muted">
              {team.category && <span>{team.category}</span>}
              {team.gender && <span>{team.gender}</span>}
              {team.region && <span>{team.region}</span>}
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <Link
          to={`/admin/equipos/${team.id}/roster`}
          className="flex items-center gap-1 text-xs text-hbl-text-muted hover:text-hbl-accent transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{rosterCount} {rosterCount === 1 ? 'jugador' : 'jugadores'}</span>
        </Link>
        <div className="flex items-center gap-0.5">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors"
            title="Editar equipo"
          >
            <Pencil className="w-3.5 h-3.5 text-hbl-text-muted" />
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => { onDelete(); setConfirmDelete(false) }}
                className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors"
                title="Confirmar eliminar"
              >
                <Check className="w-3.5 h-3.5 text-hbl-clock" />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5 text-hbl-text-muted" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg hover:bg-hbl-surface-light transition-colors"
              title="Eliminar equipo"
            >
              <Trash2 className="w-3.5 h-3.5 text-hbl-text-muted" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamForm({ team, teams, onSave, onCancel }: {
  team?: DbTeam
  teams: DbTeam[]
  onSave: (data: { name: string; badge_url?: string; category?: TeamCategory; gender?: TeamGender; region?: TeamRegion }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(team?.name ?? '')
  const [badgeUrl, setBadgeUrl] = useState(team?.badge_url ?? '')
  const [category, setCategory] = useState<TeamCategory | ''>(team?.category ?? '')
  const [gender, setGender] = useState<TeamGender | ''>(team?.gender ?? '')
  const [region, setRegion] = useState<TeamRegion | ''>(team?.region ?? '')
  const [saving, setSaving] = useState(false)
  const [dupError, setDupError] = useState('')

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed || (!team && !region)) return
    if (isDuplicateTeamName(trimmed, teams, team?.id)) {
      setDupError('Un equipo con este nombre ya existe')
      return
    }
    setDupError('')
    setSaving(true)
    try {
      await onSave({
        name: trimmed,
        badge_url: badgeUrl.trim() || undefined,
        category: category || undefined,
        gender: gender || undefined,
        region: (region as TeamRegion) || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-accent col-span-full">
      <span className="text-xs uppercase tracking-widest text-hbl-text-muted">
        {team ? 'Editar equipo' : 'Nuevo equipo'}
      </span>
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
      <div className="grid grid-cols-2 gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TeamCategory | '')}
          className="px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
        >
          <option value="">Categoría</option>
          {TEAM_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as TeamGender | '')}
          className="px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
        >
          <option value="">Género</option>
          {TEAM_GENDERS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value as TeamRegion | '')}
        className="w-full px-3 py-2 rounded-lg bg-hbl-bg border border-hbl-border text-sm focus:outline-none focus:border-hbl-accent"
      >
        <option value="">{team ? 'Comunidad Autónoma' : 'Comunidad Autónoma *'}</option>
        {TEAM_REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm text-hbl-text-muted hover:bg-hbl-surface-light">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || (!team && !region)}
          className="px-4 py-2 rounded-lg text-sm bg-hbl-accent text-hbl-bg font-medium disabled:opacity-40 active:scale-95 transition-transform"
        >
          {saving ? 'Guardando...' : team ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}
