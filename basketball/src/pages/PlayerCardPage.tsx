import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Player not found.</p>
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
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-xs mx-auto flex flex-col gap-4">

        {/* Card shell */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">

          {/* Top band: overall + team */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="flex flex-col items-center leading-none">
              <span className="text-5xl font-black text-orange-400 leading-none">
                {overall !== null ? overall : '—'}
              </span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                {player.position}
              </span>
            </div>

            {/* Team badge or initials */}
            {team?.badge_url ? (
              <img
                src={team.badge_url}
                alt={team.name}
                className="w-14 h-14 rounded-full object-cover border border-gray-700"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-orange-400 flex items-center justify-center">
                <span className="text-gray-950 font-black text-lg">{teamInitials}</span>
              </div>
            )}
          </div>

          {/* Avatar: initial circle */}
          <div className="flex justify-center py-3">
            <div className="w-28 h-28 rounded-full bg-orange-400 flex items-center justify-center">
              <span className="text-gray-950 font-black text-5xl">
                {player.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>

          {/* Name + position + number */}
          <div className="flex flex-col items-center gap-1 px-5 pb-3">
            <p className="text-2xl font-black uppercase tracking-wide text-center leading-tight">
              {player.display_name}
            </p>
            <p className="text-sm text-gray-400">
              {POSITION_LABELS[player.position]} &middot; #{player.number}
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-800 mx-5" />

          {/* Attributes */}
          <div className="px-5 py-4 flex flex-col gap-2">
            {attrs === null ? (
              <p className="text-sm text-gray-500 text-center py-2">Atributos próximamente</p>
            ) : (
              ATTR_DISPLAY.map(({ key, label }) => {
                const value = attrs[key]
                const pct = Math.min(100, Math.max(0, value))
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-gray-400 w-16 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-orange-400 w-6 text-right shrink-0">
                      {value}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Team name footer */}
        {team && (
          <p className="text-center text-xs text-gray-600 uppercase tracking-widest">{team.name}</p>
        )}
      </div>
    </div>
  )
}
