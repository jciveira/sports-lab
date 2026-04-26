import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Shield } from 'lucide-react'
import { useTeamsStore } from '../../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../../lib/supabase'
import { isDuplicateTeamName } from '../../lib/team-validation'
import type { DbTeam } from '../../lib/database.types'

interface TeamPickerProps {
  value: string | null
  onChange: (teamId: string, team: DbTeam) => void
  placeholder?: string
  excludeId?: string
}

export function TeamPicker({ value, onChange, placeholder = 'Selecciona equipo', excludeId }: TeamPickerProps) {
  const teams = useTeamsStore((s) => s.teams)
  const loading = useTeamsStore((s) => s.loading)
  const fetch = useTeamsStore((s) => s.fetch)
  const add = useTeamsStore((s) => s.add)
  const [open, setOpen] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [creating, setCreating] = useState(false)
  const [dupError, setDupError] = useState('')

  useEffect(() => {
    if (isSupabaseConfigured && teams.length === 0 && !loading) {
      fetch()
    }
  }, [fetch, teams.length, loading])

  const selected = teams.find((t) => t.id === value)
  const filteredTeams = teams.filter((t) => t.id !== excludeId)

  async function handleQuickCreate() {
    const name = quickName.trim()
    if (!name) return
    if (isDuplicateTeamName(name, teams)) {
      setDupError('Un equipo con este nombre ya existe')
      return
    }
    setDupError('')
    setCreating(true)
    try {
      const team = await add({ name })
      onChange(team.id, team)
      setQuickName('')
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-left hover:border-hbl-accent transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <TeamLogo url={selected.badge_url} size={24} />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-hbl-text-muted/40">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-hbl-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl bg-hbl-surface border border-hbl-border shadow-lg">
          {loading ? (
            <div className="px-4 py-3 text-sm text-hbl-text-muted">Cargando equipos...</div>
          ) : (
            <>
              {filteredTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => {
                    onChange(team.id, team)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-hbl-surface-light transition-colors ${
                    team.id === value ? 'bg-hbl-surface-light text-hbl-accent' : ''
                  }`}
                >
                  <TeamLogo url={team.badge_url} size={20} />
                  <span className="truncate">{team.name}</span>
                </button>
              ))}

              {filteredTeams.length === 0 && (
                <div className="px-4 py-3 text-sm text-hbl-text-muted">Sin equipos aún</div>
              )}

              {/* Quick create */}
              <div className="border-t border-hbl-border px-3 py-2 flex flex-col gap-1">
                {dupError && <p className="text-xs text-hbl-clock px-1">{dupError}</p>}
                <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => { setQuickName(e.target.value); setDupError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuickCreate()}
                  placeholder="Nombre del nuevo equipo..."
                  maxLength={30}
                  className="flex-1 px-2 py-1.5 rounded bg-hbl-bg border border-hbl-border text-sm text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent"
                />
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={!quickName.trim() || creating}
                  className="p-1.5 rounded bg-hbl-accent/20 text-hbl-accent disabled:opacity-30 active:scale-90 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function TeamLogo({ url, size = 24 }: { url?: string | null; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextElementSibling?.classList.remove('hidden')
        }}
      />
    )
  }
  return <Shield className="shrink-0 text-hbl-text-muted" style={{ width: size, height: size }} />
}
