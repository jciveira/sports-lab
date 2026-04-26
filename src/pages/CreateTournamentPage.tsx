import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Trophy, Wand2, Plus } from 'lucide-react'
import { useTeamsStore } from '../hooks/useTeamsStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { createTournament } from '../lib/tournaments'
import { TeamLogo } from '../components/ui/TeamPicker'
import type { DbTeam } from '../lib/database.types'

type Step = 'info' | 'category1' | 'category2' | 'confirm'

interface CategorySetup {
  name: string
  groupA: string[]
  groupB: string[]
}

const EMPTY_CATEGORY: CategorySetup = { name: '', groupA: [], groupB: [] }

export function CreateTournamentPage() {
  const navigate = useNavigate()
  const { teams, loading: teamsLoading, fetch: fetchTeams } = useTeamsStore()
  const [step, setStep] = useState<Step>('info')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [cat1, setCat1] = useState<CategorySetup>({ ...EMPTY_CATEGORY, name: 'Niños' })
  const [cat2, setCat2] = useState<CategorySetup>({ ...EMPTY_CATEGORY, name: 'Niñas' })
  const [hasSecondCategory, setHasSecondCategory] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSupabaseConfigured) fetchTeams()
  }, [fetchTeams])

  async function handleCreate() {
    setCreating(true)
    setError(null)
    try {
      const categoriesPayload = [
        { name: cat1.name || 'Categoría 1', groups: [{ label: 'A', teamIds: cat1.groupA }, { label: 'B', teamIds: cat1.groupB }] },
      ]
      if (hasSecondCategory) {
        categoriesPayload.push({
          name: cat2.name || 'Categoría 2',
          groups: [{ label: 'A', teamIds: cat2.groupA }, { label: 'B', teamIds: cat2.groupB }],
        })
      }
      const id = await createTournament({ name, date, categories: categoriesPayload })
      navigate(`/tournament/${id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err ? String((err as { message: unknown }).message) : 'Unknown error'
      setError(`No se pudo crear el torneo: ${msg}`)
      setCreating(false)
    }
  }

  const stepLabels = hasSecondCategory
    ? ['Información', cat1.name || 'Cat 1', cat2.name || 'Cat 2', 'Confirmar']
    : ['Información', cat1.name || 'Cat 1', 'Confirmar']

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <p className="text-hbl-text-muted text-sm">Supabase required for tournaments.</p>
        <Link to="/" className="text-hbl-accent text-sm">Volver al inicio</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <Link to="/" className="absolute top-4 left-4 text-hbl-text-muted hover:text-hbl-text transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="flex flex-col items-center gap-2">
        <Trophy className="w-8 h-8 text-hbl-accent" />
        <h1 className="text-3xl font-bold text-hbl-accent">Nuevo torneo</h1>
        <StepIndicator labels={stepLabels} currentIdx={
          step === 'info' ? 0
            : step === 'category1' ? 1
            : step === 'category2' ? 2
            : hasSecondCategory ? 3 : 2
        } />
      </div>

      {error && <p className="text-sm text-hbl-clock">{error}</p>}

      {step === 'info' && (
        <InfoStep
          name={name}
          date={date}
          onNameChange={setName}
          onDateChange={setDate}
          onNext={() => setStep('category1')}
        />
      )}

      {step === 'category1' && (
        <GroupAssignmentStep
          categoryName={cat1.name}
          onCategoryNameChange={(n) => setCat1({ ...cat1, name: n })}
          teams={teams}
          teamsLoading={teamsLoading}
          setup={cat1}
          onChange={setCat1}
          usedTeamIds={hasSecondCategory ? [...cat2.groupA, ...cat2.groupB] : []}
          onBack={() => setStep('info')}
          onNext={hasSecondCategory ? () => setStep('category2') : undefined}
          onSkipToConfirm={() => setStep('confirm')}
          onAddCategory={() => { setHasSecondCategory(true); setStep('category2') }}
          showAddCategory={!hasSecondCategory}
        />
      )}

      {step === 'category2' && hasSecondCategory && (
        <GroupAssignmentStep
          categoryName={cat2.name}
          onCategoryNameChange={(n) => setCat2({ ...cat2, name: n })}
          teams={teams}
          teamsLoading={teamsLoading}
          setup={cat2}
          onChange={setCat2}
          usedTeamIds={[...cat1.groupA, ...cat1.groupB]}
          onBack={() => setStep('category1')}
          onNext={() => setStep('confirm')}
          showAddCategory={false}
        />
      )}

      {step === 'confirm' && (
        <ConfirmStep
          name={name}
          date={date}
          categories={hasSecondCategory ? [cat1, cat2] : [cat1]}
          teams={teams}
          creating={creating}
          onBack={() => setStep(hasSecondCategory ? 'category2' : 'category1')}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

function StepIndicator({ labels, currentIdx }: { labels: string[]; currentIdx: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => (
        <div key={`${label}-${i}`} className="flex items-center gap-1">
          <span className={`px-2 py-0.5 rounded-full ${i === currentIdx ? 'bg-hbl-accent text-hbl-bg' : i < currentIdx ? 'bg-hbl-surface-light text-hbl-accent' : 'bg-hbl-surface text-hbl-text-muted'}`}>
            {label}
          </span>
          {i < labels.length - 1 && <span className="text-hbl-text-muted">›</span>}
        </div>
      ))}
    </div>
  )
}

function InfoStep({ name, date, onNameChange, onDateChange, onNext }: {
  name: string
  date: string
  onNameChange: (v: string) => void
  onDateChange: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Nombre del torneo"
        maxLength={50}
        autoFocus
        className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent"
      />
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text focus:outline-none focus:border-hbl-accent"
      />
      <button
        onClick={onNext}
        disabled={!name.trim() || !date}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-40 active:scale-95 transition-transform"
      >
        Siguiente <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function GroupAssignmentStep({ categoryName, onCategoryNameChange, teams, teamsLoading, setup, onChange, usedTeamIds, onBack, onNext, onSkipToConfirm, onAddCategory, showAddCategory }: {
  categoryName: string
  onCategoryNameChange: (name: string) => void
  teams: DbTeam[]
  teamsLoading: boolean
  setup: CategorySetup
  onChange: (s: CategorySetup) => void
  usedTeamIds: string[]
  onBack: () => void
  onNext?: () => void
  onSkipToConfirm?: () => void
  onAddCategory?: () => void
  showAddCategory: boolean
}) {
  const addTeam = useTeamsStore((s) => s.add)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const assigned = new Set([...setup.groupA, ...setup.groupB])
  const available = teams.filter((t) => !assigned.has(t.id) && !usedTeamIds.includes(t.id))
  const isComplete = setup.groupA.length === 4 && setup.groupB.length === 4
  const totalNeeded = 8 - setup.groupA.length - setup.groupB.length
  const needsMoreTeams = available.length < totalNeeded && !isComplete

  async function handleAutoGenerate() {
    setGenerating(true)
    setGenerateError(null)
    try {
      const existingNames = new Set(teams.map((t) => t.name.toLowerCase()))
      const count = totalNeeded - available.length
      for (let i = 0; i < count; i++) {
        let num = teams.length + i + 1
        while (existingNames.has(`team ${num}`)) num++
        const name = `Team ${num}`
        existingNames.add(name.toLowerCase())
        await addTeam({ name })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudieron generar los equipos'
      setGenerateError(msg)
    } finally {
      setGenerating(false)
    }
  }

  function addToGroup(teamId: string, group: 'A' | 'B') {
    const key = group === 'A' ? 'groupA' : 'groupB'
    if (setup[key].length >= 4) return
    onChange({ ...setup, [key]: [...setup[key], teamId] })
  }

  function removeFromGroup(teamId: string, group: 'A' | 'B') {
    const key = group === 'A' ? 'groupA' : 'groupB'
    onChange({ ...setup, [key]: setup[key].filter((id) => id !== teamId) })
  }

  function getTeam(id: string) {
    return teams.find((t) => t.id === id)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-md">
      {/* Editable category name */}
      <div className="flex items-center justify-center gap-2">
        <input
          type="text"
          value={categoryName}
          onChange={(e) => onCategoryNameChange(e.target.value)}
          placeholder="Nombre de categoría (ej. Niños, U12, Mixto)"
          maxLength={30}
          className="text-xl font-bold text-center bg-transparent border-b border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent w-full max-w-[250px] pb-1"
        />
      </div>

      {/* Groups side by side */}
      <div className="grid grid-cols-2 gap-3">
        {(['A', 'B'] as const).map((label) => {
          const key = label === 'A' ? 'groupA' : 'groupB'
          const groupTeams = setup[key]
          return (
            <div key={label} className="flex flex-col gap-2 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
              <span className="text-xs uppercase tracking-widest text-hbl-text-muted text-center">
                Grupo {label} ({groupTeams.length}/4)
              </span>
              {groupTeams.map((id) => {
                const team = getTeam(id)
                return (
                  <div key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-hbl-bg">
                    <TeamLogo url={team?.badge_url} size={20} />
                    <span className="text-sm flex-1 truncate">{team?.name ?? id}</span>
                    <button onClick={() => removeFromGroup(id, label)} className="text-xs text-hbl-text-muted hover:text-hbl-clock">×</button>
                  </div>
                )
              })}
              {groupTeams.length < 4 && (
                <div className="text-xs text-hbl-text-muted/40 text-center py-1">
                  {4 - groupTeams.length} más necesarios
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Available teams */}
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Equipos disponibles</span>
        {teamsLoading ? (
          <p className="text-sm text-hbl-text-muted">Cargando...</p>
        ) : needsMoreTeams ? (
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-hbl-surface border border-hbl-border">
            <p className="text-sm text-hbl-text-muted">
              Se necesitan {totalNeeded - available.length} equipo{totalNeeded - available.length > 1 ? 's' : ''} más. Genera equipos temporales y renómbralos después.
            </p>
            {generateError && <p className="text-xs text-hbl-clock">{generateError}</p>}
            <button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-hbl-accent text-hbl-bg text-sm font-medium disabled:opacity-60 active:scale-95 transition-transform"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? 'Generando...' : `Generar ${totalNeeded - available.length} equipos`}
            </button>
          </div>
        ) : null}
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {available.map((team) => (
            <div key={team.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-hbl-surface border border-hbl-border">
              <TeamLogo url={team.badge_url} size={20} />
              <span className="text-sm flex-1 truncate">{team.name}</span>
              <button
                onClick={() => addToGroup(team.id, 'A')}
                disabled={setup.groupA.length >= 4}
                className="px-2 py-0.5 text-xs rounded bg-hbl-surface-light border border-hbl-border disabled:opacity-20 active:scale-95"
              >
                → A
              </button>
              <button
                onClick={() => addToGroup(team.id, 'B')}
                disabled={setup.groupB.length >= 4}
                className="px-2 py-0.5 text-xs rounded bg-hbl-surface-light border border-hbl-border disabled:opacity-20 active:scale-95"
              >
                → B
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="px-4 py-2 text-sm text-hbl-text-muted hover:text-hbl-text">
            ← Atrás
          </button>
          {onNext ? (
            <button
              onClick={onNext}
              disabled={!isComplete}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-40 active:scale-95 transition-transform"
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {showAddCategory && onAddCategory && (
                <button
                  onClick={onAddCategory}
                  disabled={!isComplete}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-sm font-medium disabled:opacity-40 active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" /> Agregar categoría
                </button>
              )}
              {onSkipToConfirm && (
                <button
                  onClick={onSkipToConfirm}
                  disabled={!isComplete}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {showAddCategory ? 'Confirmar' : 'Siguiente'} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfirmStep({ name, date, categories, teams, creating, onBack, onCreate }: {
  name: string
  date: string
  categories: CategorySetup[]
  teams: DbTeam[]
  creating: boolean
  onBack: () => void
  onCreate: () => void
}) {
  function getTeamName(id: string) {
    return teams.find((t) => t.id === id)?.name ?? id
  }

  function renderGroup(label: string, teamIds: string[]) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Grupo {label}</span>
        {teamIds.map((id) => (
          <span key={id} className="text-sm pl-2">{getTeamName(id)}</span>
        ))}
      </div>
    )
  }

  const totalMatches = categories.length * 12 // 6 per group × 2 groups per category

  return (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <div className="flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Torneo</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Fecha</span>
          <span className="font-medium">{date}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Categorías</span>
          <span className="font-medium">{categories.map((c) => c.name || 'Sin nombre').join(', ')}</span>
        </div>
      </div>

      {categories.map((cat, i) => (
        <div key={i} className="flex flex-col gap-3 p-4 rounded-xl bg-hbl-surface border border-hbl-border">
          <h3 className="font-medium text-hbl-accent">{cat.name || `Categoría ${i + 1}`}</h3>
          <div className="grid grid-cols-2 gap-4">
            {renderGroup('A', cat.groupA)}
            {renderGroup('B', cat.groupB)}
          </div>
        </div>
      ))}

      <p className="text-xs text-hbl-text-muted text-center">
        Esto creará {totalMatches} partidos de grupo (6 por grupo × {categories.length} categoría{categories.length > 1 ? 's' : ''}).
      </p>

      <div className="flex items-center justify-between">
        <button onClick={onBack} disabled={creating} className="px-4 py-2 text-sm text-hbl-text-muted hover:text-hbl-text">
          ← Atrás
        </button>
        <button
          onClick={onCreate}
          disabled={creating}
          className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-hbl-accent text-hbl-bg font-bold disabled:opacity-60 active:scale-95 transition-transform"
        >
          {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
          {creating ? 'Creando...' : 'Crear torneo'}
        </button>
      </div>
    </div>
  )
}
