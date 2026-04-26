import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Shield, HeartCrack } from 'lucide-react'
import { BackButton } from '../components/ui/BackButton'
import { getPlayer, getPlayerAvatarUrl } from '../lib/players'
import { isSupabaseConfigured } from '../lib/supabase'
import { getStatKeys, getStatLabels, computeMedia } from '../lib/ratings'
import type { DbPlayer } from '../lib/database.types'

const ROLE_LABELS: Record<string, string> = {
  GK: 'Portero',
  LW: 'Extremo Izquierdo',
  RW: 'Extremo Derecho',
  LB: 'Lateral Izquierdo',
  RB: 'Lateral Derecho',
  CB: 'Central',
  PV: 'Pivote',
}

const ROLE_SHORT: Record<string, string> = {
  GK: 'POR',
  LW: 'EI',
  RW: 'ED',
  LB: 'LI',
  RB: 'LD',
  CB: 'CEN',
  PV: 'PIV',
}

type PlayerWithTeam = DbPlayer & {
  team: { id: string; name: string; badge_url: string | null } | null
}

export function PlayerCardPage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerWithTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !isSupabaseConfigured) return
    setLoading(true)
    getPlayer(id)
      .then((data) => {
        setPlayer(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Jugador no encontrado')
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    let cancelled = false
    getPlayerAvatarUrl(player?.avatar_url).then((url) => {
      if (!cancelled) setAvatarSrc(url)
    })
    return () => { cancelled = true }
  }, [player?.avatar_url])

  if (!isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6">
        <p className="text-hbl-text-muted text-sm">Supabase no está configurado.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6">
        <p className="text-hbl-text-muted text-sm">Cargando...</p>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-4">
        <p className="text-hbl-clock text-sm">{error ?? 'Jugador no encontrado'}</p>
        <Link to="/" className="text-hbl-accent text-sm underline">Volver al inicio</Link>
      </div>
    )
  }

  const isInjured = player.injured === true
  const isToty = player.card_type === 'toty'
  const roleShort = ROLE_SHORT[player.role] ?? player.role
  const roleFull = ROLE_LABELS[player.role] ?? player.role
  const media = computeMedia(player.ratings)
  const statKeys = player.ratings ? getStatKeys(player.role) : []
  const statLabels = player.ratings ? getStatLabels(player.role) : {}
  const ratings = player.ratings as Record<string, number> | null

  // Base card color tokens
  const accentColor = 'text-hbl-accent'
  const accentBgLight = 'bg-hbl-accent/10'
  const accentBgMid = 'bg-hbl-accent/20'
  const accentBorder = 'border-hbl-accent/30'
  const accentBorderLight = 'border-hbl-accent/20'
  const barGradient = 'from-hbl-accent to-hbl-score'
  const topBarGradient = 'from-hbl-accent via-hbl-score to-hbl-accent'

  // TOTY card — FIFA-style layout for any toty player (ratings optional)
  if (isToty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
        <BackButton to="/" />

        {/* TOTY Card — FIFA-style */}
        <div
          className="relative w-[280px] rounded-xl overflow-hidden"
          style={{
            aspectRatio: '2 / 3',
            background: 'linear-gradient(180deg, #0a1e5e 0%, #0d2b7a 30%, #102e8a 60%, #081a50 100%)',
            boxShadow: '0 0 30px 4px rgba(251, 191, 36, 0.25), 0 0 60px 8px rgba(251, 191, 36, 0.10), 0 8px 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Ornate double border */}
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              border: '2px solid rgba(251, 191, 36, 0.5)',
              boxShadow: 'inset 0 0 0 4px rgba(251, 191, 36, 0.15), inset 0 0 20px rgba(251, 191, 36, 0.08)',
            }}
          />

          {/* Top accent line */}
          <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />

          <div className="relative flex flex-col h-full px-4 pt-3 pb-4">
            {/* Header: Rating left, TOTY badge center, Team right */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col items-center">
                <span className="text-[56px] font-black leading-none text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
                  {media}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400/80 -mt-1">
                  {roleShort}
                </span>
              </div>

              <span className="mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-400 border border-amber-400/30">
                TOTY
              </span>

              {/* Team badge + number — tucked in top-right corner */}
              <div className="flex flex-col items-center gap-0.5">
                {player.team?.badge_url ? (
                  <img
                    src={player.team.badge_url}
                    alt={player.team.name}
                    className="w-8 h-8 rounded-full object-cover opacity-80"
                  />
                ) : player.team ? (
                  <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-400 opacity-40" />
                  </div>
                ) : null}
                <span className="text-[9px] font-bold text-amber-400/60">#{player.number}</span>
              </div>
            </div>

            {/* Avatar area with radial blue glow */}
            <div className="flex items-center justify-center py-3 relative">
              {/* Radial glow behind avatar */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
                }}
              />
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={player.display_name}
                  className="relative w-28 h-28 rounded-full object-cover"
                  style={{
                    border: '3px solid transparent',
                    backgroundClip: 'padding-box',
                    boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.5), 0 0 16px 4px rgba(251, 191, 36, 0.25), 0 0 30px 8px rgba(59, 130, 246, 0.2)',
                  }}
                />
              ) : (
                <div
                  className="relative w-28 h-28 rounded-full bg-blue-900/50 flex items-center justify-center"
                  style={{
                    boxShadow: '0 0 0 3px rgba(251, 191, 36, 0.5), 0 0 16px 4px rgba(251, 191, 36, 0.25), 0 0 30px 8px rgba(59, 130, 246, 0.2)',
                  }}
                >
                  <Shield className="w-12 h-12 text-amber-400 opacity-25" />
                </div>
              )}
            </div>

            {/* Name banner with gold accent */}
            <div className="relative flex items-center justify-center py-2 my-1">
              {/* Gold line accents */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/8 to-transparent" />
              <h1 className="text-xl font-black text-white tracking-wider uppercase drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]">
                {player.display_name}
              </h1>
            </div>

            {isInjured && (
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <HeartCrack className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-medium text-red-400">Lesionado</span>
              </div>
            )}

            {/* Stats: 2-column 3×2 grid */}
            {ratings ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-auto px-2">
                {statKeys.map((key) => {
                  const value = ratings[key]
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/70">
                        {statLabels[key]}
                      </span>
                      <span className="text-lg font-black text-white">{value}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[9px] uppercase tracking-widest text-amber-400/40 text-center mt-auto font-medium">
                Estadísticas próximamente
              </p>
            )}

            {/* Team name at bottom */}
            {player.team && (
              <p className="text-[9px] uppercase tracking-[0.2em] text-amber-400/40 text-center mt-3 font-medium">
                {player.team.name}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Base card
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-hbl-bg p-6 gap-6">
      <BackButton to="/" />

      {/* Card */}
      <div className={`relative w-[300px] max-w-full rounded-2xl overflow-hidden bg-gradient-to-b from-hbl-surface-light to-hbl-surface border shadow-2xl ${isToty ? 'border-amber-400/40' : 'border-hbl-border'}`}>
        {/* Top accent bar */}
        <div className={`h-1.5 bg-gradient-to-r ${topBarGradient}`} />

        {/* Header: number/media + role badge */}
        <div className="flex items-start justify-between px-5 pt-4">
          <div className="flex flex-col items-center">
            {media !== null ? (
              <>
                <span className={`text-4xl font-black leading-none ${accentColor}`}>{media}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${accentColor} opacity-70`}>{roleShort}</span>
              </>
            ) : (
              <>
                <span className={`text-4xl font-black leading-none ${accentColor}`}>{player.number}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${accentColor} opacity-70`}>{roleShort}</span>
              </>
            )}
          </div>

          {/* Team badge */}
          {player.team && (
            <div className="flex flex-col items-center gap-1">
              {player.team.badge_url ? (
                <img
                  src={player.team.badge_url}
                  alt={player.team.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className={`w-10 h-10 rounded-full ${accentBgLight} flex items-center justify-center`}>
                  <Shield className={`w-5 h-5 ${accentColor} opacity-50`} />
                </div>
              )}
              <span className="text-[9px] uppercase tracking-widest text-hbl-text-muted font-medium">
                {player.team.name}
              </span>
            </div>
          )}
        </div>

        {/* Avatar area */}
        <div className="flex items-center justify-center py-6 px-5">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={player.display_name}
              className={`w-32 h-32 rounded-full object-cover border-4 ${accentBorder} shadow-lg`}
            />
          ) : (
            <div className={`w-32 h-32 rounded-full ${accentBgLight} border-4 ${accentBorderLight} flex items-center justify-center shadow-lg`}>
              <Shield className={`w-14 h-14 ${accentColor} opacity-30`} />
            </div>
          )}
        </div>

        {/* Name + role */}
        <div className="flex flex-col items-center gap-1 px-5 pb-4">
          <h1 className="text-2xl font-black text-hbl-text tracking-tight uppercase">
            {player.display_name}
          </h1>
          <div className="flex items-center gap-2">
            {media !== null && (
              <span className="text-xs text-hbl-text-muted">#{player.number}</span>
            )}
            <p className="text-xs text-hbl-text-muted uppercase tracking-widest">{roleFull}</p>
          </div>

          {isInjured && (
            <div className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-hbl-clock/15 border border-hbl-clock/30">
              <HeartCrack className="w-3.5 h-3.5 text-hbl-clock" />
              <span className="text-xs font-medium text-hbl-clock">Lesionado</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`mx-5 border-t ${isToty ? 'border-amber-400/20' : 'border-hbl-border'}`} />

        {/* Stats */}
        {ratings ? (
          <div className="px-5 py-4 flex flex-col gap-2.5">
            {statKeys.map((key) => {
              const value = ratings[key]
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-hbl-text-muted w-12 text-right shrink-0">
                    {statLabels[key]}
                  </span>
                  <div className={`flex-1 h-2.5 rounded-full ${accentBgMid} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient}`}
                      style={{ width: `${Math.min(100, (value / 99) * 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold w-7 text-right ${accentColor}`}>{value}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-hbl-text-muted text-center font-medium">
              Estadísticas próximamente
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
