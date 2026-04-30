import { useEffect, useState } from 'react'
import { useTeamsStore } from '../../stores/useTeamsStore'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import type { Team } from '../../types'

function TeamsSection({ teams, loading }: { teams: Team[]; loading: boolean }) {
  const createTeam = useTeamsStore((s) => s.createTeam)
  const storeError = useTeamsStore((s) => s.error)
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [badgeUrl, setBadgeUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setLocalError(null)
    const result = await createTeam(name.trim(), nickname.trim() || undefined, badgeUrl.trim() || undefined)
    setSubmitting(false)
    if (result) {
      setName('')
      setNickname('')
      setBadgeUrl('')
    } else {
      setLocalError(storeError ?? 'No se pudo crear el equipo')
    }
  }

  return (
    <CollapsibleSection title="Equipos">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 p-4 rounded-2xl bg-bbl-surface border border-bbl-border">
        <p className="text-xs uppercase tracking-widest text-bbl-text-muted">Nuevo equipo</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nombre del equipo *"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Apodo (opcional)"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        <input
          type="url"
          value={badgeUrl}
          onChange={(e) => setBadgeUrl(e.target.value)}
          placeholder="URL del escudo (opcional)"
          className="w-full px-4 py-3 rounded-xl bg-bbl-surface-light border border-bbl-border text-bbl-text placeholder:text-bbl-text-muted/40 focus:outline-none focus:border-bbl-accent min-h-12"
        />
        {localError && <p className="text-sm text-bbl-clock">{localError}</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex items-center justify-center px-6 py-3 rounded-xl bg-bbl-accent text-bbl-bg font-bold min-h-12 disabled:opacity-40 active:scale-95 transition-transform"
        >
          {submitting ? 'Creando…' : 'Crear equipo'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Cargando…</p>
      ) : teams.length === 0 ? (
        <p className="text-sm text-bbl-text-muted text-center py-4">Sin equipos. Crea el primero arriba.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {teams.map((team) => (
            <li key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-bbl-surface border border-bbl-border">
              {team.badge_url && (
                <img src={team.badge_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-bbl-text">{team.name}</p>
                {team.nickname && <p className="text-xs text-bbl-text-muted truncate">{team.nickname}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}

export function AdminEquiposPage() {
  const teams = useTeamsStore((s) => s.teams)
  const teamsLoading = useTeamsStore((s) => s.loading)
  const fetchTeams = useTeamsStore((s) => s.fetchTeams)

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text">
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        <TeamsSection teams={teams} loading={teamsLoading} />
      </div>
    </div>
  )
}
