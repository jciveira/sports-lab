import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMatchStore, FOUL_BONUS_THRESHOLD } from '../stores/useMatchStore'
import { flushPendingEvents } from '../lib/offlineSync'

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function TeamColumn({
  name,
  score,
  fouls,
  timeouts,
  onGoal,
  onFoul,
  onTimeout,
}: {
  name: string
  score: number
  fouls: number
  timeouts: number
  onGoal: (points: 1 | 2 | 3) => void
  onFoul: () => void
  onTimeout: () => void
}) {
  const isBonus = fouls >= FOUL_BONUS_THRESHOLD

  return (
    <div className="flex flex-col items-center gap-3 flex-1 px-2">
      <h2 className="text-sm font-semibold text-bbl-text-muted uppercase tracking-wider truncate max-w-full">
        {name}
      </h2>

      <div className="text-5xl font-bold tabular-nums text-bbl-text">{score}</div>

      <div className="flex flex-col gap-2 w-full">
        <button
          onClick={() => onGoal(2)}
          className="min-h-14 rounded-xl bg-bbl-accent hover:opacity-90 active:opacity-80 font-bold text-lg w-full text-bbl-bg transition-opacity"
        >
          +2
        </button>
        <button
          onClick={() => onGoal(3)}
          className="min-h-14 rounded-xl bg-bbl-accent hover:opacity-90 active:opacity-80 font-bold text-lg w-full text-bbl-bg transition-opacity"
        >
          +3
        </button>
        <button
          onClick={() => onGoal(1)}
          className="min-h-14 rounded-xl bg-bbl-score hover:opacity-90 active:opacity-80 font-bold text-lg w-full text-bbl-bg transition-opacity"
        >
          +1 FT
        </button>
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        <button
          onClick={onFoul}
          className="min-h-12 rounded-xl bg-bbl-clock hover:opacity-90 active:opacity-80 font-semibold text-sm w-full text-white transition-opacity"
        >
          Falta
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-bbl-text">
            Faltas: <span className="font-bold text-bbl-text">{fouls}</span>
          </span>
          {isBonus && (
            <span className="text-xs font-bold bg-bbl-accent text-bbl-bg px-2 py-0.5 rounded-full">
              BONUS
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 w-full">
        <div className="flex gap-1 justify-center">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 ${
                i < timeouts ? 'bg-bbl-accent border-bbl-accent' : 'border-bbl-border bg-transparent'
              }`}
            />
          ))}
        </div>
        <button
          onClick={onTimeout}
          disabled={timeouts <= 0}
          className="min-h-10 rounded-xl bg-bbl-surface-light hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold w-full text-bbl-text transition-opacity"
        >
          Tiempo ({timeouts})
        </button>
      </div>
    </div>
  )
}

function QuarterBreakOverlay({
  quarter,
  onStartNext,
}: {
  quarter: number
  onStartNext: () => void
}) {
  const prevQuarter = quarter - 1
  const isHalftime = prevQuarter === 2
  const breakLabel = isHalftime ? 'Descanso — 10 min' : `Q${prevQuarter} Descanso — 2 min`

  return (
    <div className="fixed inset-0 bg-bbl-bg/95 flex flex-col items-center justify-center gap-6 z-50">
      <div className="text-3xl font-bold text-bbl-text">{breakLabel}</div>
      <div className="text-bbl-text-muted text-lg">Preparados para Q{quarter}</div>
      <button
        onClick={onStartNext}
        className="min-h-14 px-8 rounded-xl bg-bbl-accent hover:opacity-90 active:opacity-80 font-bold text-xl text-bbl-bg transition-opacity"
      >
        Iniciar Q{quarter}
      </button>
    </div>
  )
}

export default function ScorekeeperPage() {
  const { id: matchId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isAdmin = searchParams.get('admin') === '1'

  const {
    match,
    events,
    claimed,
    clockRunning,
    timeRemaining,
    homeFouls,
    awayFouls,
    homeTimeouts,
    awayTimeouts,
    loadMatch,
    claimScorekeeper,
    scoreGoal,
    recordFoul,
    undoLastEvent,
    startClock,
    pauseClock,
    useTimeout,
    endQuarter,
    finishMatch,
  } = useMatchStore()

  const [homeName, setHomeName] = useState('Local')
  const [awayName, setAwayName] = useState('Visitante')
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    if (matchId) loadMatch(matchId)
  }, [matchId, loadMatch])

  useEffect(() => {
    if (!isAdmin && matchId && match && !claimed && !match.scorekeeper_claimed_by) {
      claimScorekeeper(matchId)
    }
  }, [isAdmin, matchId, match, claimed, claimScorekeeper])

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
      flushPendingEvents().catch(console.warn)
    }
    function handleOffline() {
      setIsOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!match) return
    import('../lib/supabase').then(({ supabase }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase.from('teams') as any)
        .select('id, name')
        .in('id', [match.home_team_id, match.away_team_id])
        .then(({ data }: { data: Array<{ id: string; name: string }> | null }) => {
          if (!data) return
          const home = data.find((t) => t.id === match.home_team_id)
          const away = data.find((t) => t.id === match.away_team_id)
          if (home) setHomeName(home.name)
          if (away) setAwayName(away.name)
        })
    })
  }, [match])

  if (!matchId) {
    return (
      <div className="min-h-screen bg-bbl-bg text-bbl-text flex items-center justify-center">
        <p className="text-bbl-text-muted">No se encontró el partido.</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-bbl-bg text-bbl-text flex items-center justify-center">
        <p className="text-bbl-text-muted">Cargando partido…</p>
      </div>
    )
  }

  if (match.status === 'quarter_break') {
    return (
      <div className="min-h-screen bg-bbl-bg text-bbl-text">
        <QuarterBreakOverlay
          quarter={match.quarter}
          onStartNext={() => {
            startClock()
          }}
        />
      </div>
    )
  }

  if (match.status === 'finished') {
    return (
      <div className="min-h-screen bg-bbl-bg text-bbl-text flex flex-col items-center justify-center gap-4">
        <div className="text-2xl font-bold">Partido finalizado</div>
        <div className="text-4xl font-bold tabular-nums text-bbl-score">
          {match.home_score} – {match.away_score}
        </div>
        <div className="text-bbl-text-muted">
          {homeName} vs {awayName}
        </div>
      </div>
    )
  }

  // Non-admin with unclaimed match: show claim gate
  if (!isAdmin && !claimed) {
    return (
      <div className="min-h-screen bg-bbl-bg text-bbl-text flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {homeName} vs {awayName}
          </h1>
          <p className="text-bbl-text-muted text-sm">Q{match.quarter} · {match.status}</p>
        </div>

        {match.scorekeeper_claimed_by ? (
          <div className="text-center">
            <p className="text-bbl-clock font-semibold">Marcador ya reclamado</p>
            <p className="text-bbl-text-muted text-sm mt-1">Otro dispositivo controla este partido.</p>
          </div>
        ) : (
          <button
            onClick={() => claimScorekeeper(match.id)}
            className="min-h-14 px-10 rounded-xl bg-bbl-accent hover:opacity-90 active:opacity-80 font-bold text-xl text-bbl-bg transition-opacity"
          >
            Reclamar marcador
          </button>
        )}
      </div>
    )
  }

  const currentQuarterEvents = events.filter((e) => e.quarter === match.quarter)
  const canUndo = currentQuarterEvents.length > 0

  const quarterLabel = match.quarter <= 4 ? `Q${match.quarter}` : `OT${match.quarter - 4}`

  return (
    <div className="min-h-screen bg-bbl-bg text-bbl-text flex flex-col">
      {isOffline && (
        <div className="bg-bbl-warning/80 text-bbl-bg text-sm font-semibold text-center px-4 py-2">
          Sin conexión — los puntos se guardarán al reconectar
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 bg-bbl-surface border-b border-bbl-border">
        <div className="text-sm font-semibold text-bbl-text-muted">{quarterLabel}</div>
        <div className="text-3xl font-bold tabular-nums tracking-tight text-bbl-text">
          {formatTime(timeRemaining)}
        </div>
        <button
          onClick={clockRunning ? pauseClock : startClock}
          className={`min-h-10 px-5 rounded-xl font-bold text-sm transition-opacity ${
            clockRunning
              ? 'bg-bbl-surface-light text-bbl-text hover:opacity-90'
              : 'bg-bbl-accent text-bbl-bg hover:opacity-90'
          }`}
        >
          {clockRunning ? 'Pausar' : 'Iniciar'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-6 px-4 py-2 bg-bbl-surface border-b border-bbl-border">
        <span className="text-4xl font-bold tabular-nums text-bbl-text">{match.home_score}</span>
        <span className="text-bbl-border text-lg">–</span>
        <span className="text-4xl font-bold tabular-nums text-bbl-text">{match.away_score}</span>
      </div>

      <div className="flex flex-1 gap-2 px-3 py-4">
        <TeamColumn
          name={homeName}
          score={match.home_score}
          fouls={homeFouls}
          timeouts={homeTimeouts}
          onGoal={(pts) => scoreGoal('home', pts)}
          onFoul={() => recordFoul('home')}
          onTimeout={() => useTimeout('home')}
        />

        <div className="w-px bg-bbl-border self-stretch" />

        <TeamColumn
          name={awayName}
          score={match.away_score}
          fouls={awayFouls}
          timeouts={awayTimeouts}
          onGoal={(pts) => scoreGoal('away', pts)}
          onFoul={() => recordFoul('away')}
          onTimeout={() => useTimeout('away')}
        />
      </div>

      <div className="flex gap-2 px-3 pb-6 pt-2 border-t border-bbl-border bg-bbl-surface">
        <button
          onClick={undoLastEvent}
          disabled={!canUndo}
          className="flex-1 min-h-12 rounded-xl bg-bbl-surface-light hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm text-bbl-text transition-opacity"
        >
          Deshacer
        </button>
        <button
          onClick={endQuarter}
          className="flex-1 min-h-12 rounded-xl bg-bbl-surface-light hover:opacity-90 active:opacity-80 font-semibold text-sm text-bbl-text transition-opacity"
        >
          Fin Q{match.quarter}
        </button>
        <button
          onClick={finishMatch}
          className="flex-1 min-h-12 rounded-xl bg-bbl-clock hover:opacity-90 active:opacity-80 font-semibold text-sm text-white transition-opacity"
        >
          Finalizar
        </button>
      </div>
    </div>
  )
}
