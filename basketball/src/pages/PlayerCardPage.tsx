import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BackButton } from '../components/BackButton'
import type { Player, PlayerAttributes, PlayerPosition } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const POSITION_LABELS: Record<PlayerPosition, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
}

const ATTR_DISPLAY: { key: keyof PlayerAttributes; label: string }[] = [
  { key: 'tiro', label: 'TIRO' },
  { key: 'pase', label: 'PASE' },
  { key: 'defensa', label: 'DEFENSA' },
  { key: 'fisico', label: 'FÍSICO' },
  { key: 'stamina', label: 'STAMINA' },
  { key: 'vision', label: 'VISIÓN' },
]

function computeOverall(attrs: PlayerAttributes): number {
  const sum = attrs.tiro + attrs.pase + attrs.defensa + attrs.fisico + attrs.stamina + attrs.vision
  return Math.min(99, Math.max(0, Math.round(sum / 6)))
}

interface PlayerWithTeam extends Player {
  teams?: { name: string; nickname: string | null; badge_url: string | null } | null
}

export function PlayerCardPage() {
  const { id } = useParams<{ id: string }>()
  const [player, setPlayer] = useState<PlayerWithTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    async function load() {
      setLoading(true)
      try {
        const { data, error } = await db
          .from('players')
          .select('*, teams(*)')
          .eq('id', id)
          .single()
        if (error || !data) {
          setNotFound(true)
        } else {
          setPlayer(data as PlayerWithTeam)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/jugadores" />
        <p className="text-bbl-text-muted text-sm">Cargando…</p>
      </div>
    )
  }

  if (notFound || !player) {
    return (
      <div className="relative min-h-screen bg-bbl-bg flex items-center justify-center">
        <BackButton to="/jugadores" />
        <p className="text-bbl-text-muted text-sm">Jugador no encontrado.</p>
      </div>
    )
  }

  const attrs = player.attributes
  const overall = attrs ? computeOverall(attrs) : null
  const team = player.teams
  const teamInitials = team?.name
    ? team.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="relative min-h-screen bg-bbl-bg text-bbl-text flex items-center justify-center p-4">
      <BackButton to="/jugadores" />
      <div className="w-full max-w-xs mx-auto flex flex-col gap-4">

        <div className="rounded-2xl bg-bbl-surface border border-bbl-border overflow-hidden">

          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="flex flex-col items-center leading-none">
              <span className="text-5xl font-black text-bbl-accent leading-none">
                {overall !== null ? overall : '—'}
              </span>
              <span className="text-xs font-bold text-bbl-text-muted uppercase tracking-widest mt-1">
                {player.position}
              </span>
            </div>

            {team?.badge_url ? (
              <img
                src={team.badge_url}
                alt={team.name}
                className="w-14 h-14 rounded-full object-cover border border-bbl-border"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-bbl-accent flex items-center justify-center">
                <span className="text-bbl-bg font-black text-lg">{teamInitials}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center py-3">
            <div className="w-28 h-28 rounded-full bg-bbl-accent flex items-center justify-center">
              <span className="text-bbl-bg font-black text-5xl">
                {player.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 px-5 pb-3">
            <p className="text-2xl font-black uppercase tracking-wide text-center leading-tight text-bbl-text">
              {player.display_name}
            </p>
            <p className="text-sm text-bbl-text-muted">
              {POSITION_LABELS[player.position]} &middot; #{player.number}
            </p>
          </div>

          <div className="h-px bg-bbl-border mx-5" />

          <div className="px-5 py-4 flex flex-col gap-2">
            {attrs === null ? (
              <p className="text-sm text-bbl-text-muted text-center py-2">Atributos próximamente</p>
            ) : (
              ATTR_DISPLAY.map(({ key, label }) => {
                const value = attrs[key]
                const pct = Math.min(100, Math.max(0, value))
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-bbl-text-muted w-16 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-bbl-bg overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-bbl-accent to-bbl-score"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-bbl-accent w-6 text-right shrink-0">
                      {value}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {team && (
          <p className="text-center text-xs text-bbl-text-muted uppercase tracking-widest">{team.name}</p>
        )}
      </div>
    </div>
  )
}
