import { useState } from 'react'
import { Play, Settings } from 'lucide-react'
import { useMatchStore } from '../../hooks/useMatchStore'
import { CONFIG_PRESETS, type MatchConfig } from '../../lib/rules'
import { isSupabaseConfigured } from '../../lib/supabase'
import { TeamPicker } from '../ui/TeamPicker'
import type { DbTeam } from '../../lib/database.types'

interface TeamInfo {
  id: string
  name: string
  badge_url: string | null
}

interface MatchSetupProps {
  onStart: () => void
  homeTeam?: TeamInfo | null
  awayTeam?: TeamInfo | null
  onHomeTeamChange?: (id: string, team: DbTeam) => void
  onAwayTeamChange?: (id: string, team: DbTeam) => void
}

export function MatchSetup({ onStart, homeTeam, awayTeam, onHomeTeamChange, onAwayTeamChange }: MatchSetupProps) {
  const config = useMatchStore((s) => s.config)
  const setConfig = useMatchStore((s) => s.setConfig)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [homeNameLocal, setHomeNameLocal] = useState('')
  const [awayNameLocal, setAwayNameLocal] = useState('')

  function applyPreset(key: string) {
    const preset = CONFIG_PRESETS[key]
    if (preset) setConfig(preset.config)
  }

  function updateField<K extends keyof MatchConfig>(key: K, value: MatchConfig[K]) {
    setConfig({ [key]: value })
  }

  const canStart = isSupabaseConfigured
    ? Boolean(homeTeam && awayTeam && homeTeam.id !== awayTeam?.id)
    : Boolean(homeNameLocal.trim() && awayNameLocal.trim())

  function handleStart() {
    if (!isSupabaseConfigured && homeNameLocal.trim() && awayNameLocal.trim()) {
      onHomeTeamChange?.('local-home', { id: 'local-home', name: homeNameLocal.trim(), badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' })
      onAwayTeamChange?.('local-away', { id: 'local-away', name: awayNameLocal.trim(), badge_url: null, nickname: null, city_district: null, category: null, gender: null, region: null, created_at: '' })
    }
    onStart()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-8">
      <h1 className="text-3xl font-bold text-hbl-accent">Configuración del partido</h1>
      <p className="text-hbl-text-muted text-sm">Configura antes de empezar el juego</p>

      {/* Team selection */}
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {isSupabaseConfigured ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Equipo local</span>
              <TeamPicker
                value={homeTeam?.id ?? null}
                onChange={onHomeTeamChange ?? (() => {})}
                placeholder="Selecciona equipo local"
                excludeId={awayTeam?.id}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Equipo visitante</span>
              <TeamPicker
                value={awayTeam?.id ?? null}
                onChange={onAwayTeamChange ?? (() => {})}
                placeholder="Selecciona equipo visitante"
                excludeId={homeTeam?.id}
              />
            </div>
          </>
        ) : (
          <>
            <input
              type="text"
              value={homeNameLocal}
              onChange={(e) => setHomeNameLocal(e.target.value)}
              placeholder="Nombre del equipo local"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent transition-colors"
            />
            <input
              type="text"
              value={awayNameLocal}
              onChange={(e) => setAwayNameLocal(e.target.value)}
              placeholder="Nombre del equipo visitante"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-hbl-surface border border-hbl-border text-hbl-text placeholder:text-hbl-text-muted/40 focus:outline-none focus:border-hbl-accent transition-colors"
            />
          </>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <span className="text-xs uppercase tracking-widest text-hbl-text-muted">Preconfigurados</span>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CONFIG_PRESETS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="p-3 rounded-lg bg-hbl-surface border border-hbl-border text-sm text-left hover:border-hbl-accent active:scale-[0.98] transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Current config summary */}
      <div className="flex flex-col gap-3 w-full max-w-sm bg-hbl-surface rounded-xl border border-hbl-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Formato</span>
          <span className="font-medium">{config.halves} × {config.halfDurationMinutes} min</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Tiempos muertos por parte</span>
          <span className="font-medium">{config.timeoutsPerHalf}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-hbl-text-muted">Duración de exclusión</span>
          <span className="font-medium">{config.exclusionDurationSeconds / 60} min</span>
        </div>
      </div>

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-hbl-text-muted hover:text-hbl-text transition-colors"
      >
        <Settings className="w-4 h-4" />
        {showAdvanced ? 'Ocultar' : 'Mostrar'} configuración avanzada
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-4 w-full max-w-sm bg-hbl-surface rounded-xl border border-hbl-border p-4">
          <NumberField label="Partes" value={config.halves} min={1} max={6}
            onChange={(v) => updateField('halves', v)} />
          <NumberField label="Duración de parte (min)" value={config.halfDurationMinutes} min={5} max={45}
            onChange={(v) => updateField('halfDurationMinutes', v)} />
          <NumberField label="Tiempos muertos por parte" value={config.timeoutsPerHalf} min={0} max={3}
            onChange={(v) => updateField('timeoutsPerHalf', v)} />
          <NumberField label="Duración del t. muerto (seg)" value={config.timeoutDurationSeconds} min={30} max={120}
            onChange={(v) => updateField('timeoutDurationSeconds', v)} />
          <NumberField label="Duración de exclusión (seg)" value={config.exclusionDurationSeconds} min={60} max={300}
            onChange={(v) => updateField('exclusionDurationSeconds', v)} />
          <NumberField label="Máx exclusiones por equipo" value={config.maxExclusionsPerTeam} min={1} max={5}
            onChange={(v) => updateField('maxExclusionsPerTeam', v)} />
          <NumberField label="Jugadores en cancha" value={config.playersOnCourt} min={4} max={7}
            onChange={(v) => updateField('playersOnCourt', v)} />
          <NumberField label="Tamaño máx del equipo" value={config.maxSquadSize} min={7} max={20}
            onChange={(v) => updateField('maxSquadSize', v)} />
        </div>
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        className="flex items-center gap-3 px-8 py-4 rounded-xl bg-hbl-accent text-hbl-bg font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform"
      >
        <Play className="w-6 h-6" />
        Empezar partido
      </button>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded bg-hbl-surface-light border border-hbl-border text-center disabled:opacity-30 active:scale-90 transition-transform"
        >
          -
        </button>
        <span className="w-10 text-center font-medium">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded bg-hbl-surface-light border border-hbl-border text-center disabled:opacity-30 active:scale-90 transition-transform"
        >
          +
        </button>
      </div>
    </div>
  )
}
