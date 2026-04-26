import { useState } from 'react'
import { Scoreboard } from '../components/scoreboard/Scoreboard'
import { MatchSetup } from '../components/scoreboard/MatchSetup'
import { useMatchStore } from '../hooks/useMatchStore'
import { BackButton } from '../components/ui/BackButton'
import type { DbTeam } from '../lib/database.types'

interface TeamInfo {
  id: string
  name: string
  badge_url: string | null
}

export function ScoreboardPage() {
  const status = useMatchStore((s) => s.status)
  const setStatus = useMatchStore((s) => s.setStatus)
  const [homeTeam, setHomeTeam] = useState<TeamInfo | null>(null)
  const [awayTeam, setAwayTeam] = useState<TeamInfo | null>(null)

  function handleTeamChange(side: 'home' | 'away') {
    return (_id: string, team: DbTeam) => {
      const info: TeamInfo = { id: team.id, name: team.name, badge_url: team.badge_url }
      if (side === 'home') setHomeTeam(info)
      else setAwayTeam(info)
    }
  }

  // Show setup screen before game starts
  if (status === 'scheduled') {
    return (
      <div className="relative">
        <BackButton />
        <MatchSetup
          onStart={() => setStatus('paused')}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onHomeTeamChange={handleTeamChange('home')}
          onAwayTeamChange={handleTeamChange('away')}
        />
      </div>
    )
  }

  return (
    <Scoreboard
      homeTeamName={homeTeam?.name ?? 'Local'}
      awayTeamName={awayTeam?.name ?? 'Visitante'}
      homeTeamLogo={homeTeam?.badge_url}
      awayTeamLogo={awayTeam?.badge_url}
      isOperator={true}
    />
  )
}
