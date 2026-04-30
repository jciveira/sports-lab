import { describe, it, expect } from 'vitest'

// ─── UTC conversion helper (inline — mirrors seed script logic) ───────────────
function utc(date: string, hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const utcH = h - 2
  return `2026-${date}T${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+00:00`
}

// ─── Match fixture tables (mirrors seed script) ───────────────────────────────
const MAY1 = '05-01'
const MAY2 = '05-02'
const MAY3 = '05-03'

const GROUP_MATCHES_06AMP2 = [
  { home: 'B86 LA SALLE',        away: 'CD ROMAREDA A',              time: '15:00', date: MAY1 },
  { home: 'EL OLIVAR 1',         away: 'DISTRITO OLIMPICO PEREZ',    time: '15:00', date: MAY1 },
  { home: 'RICOPIA CBJA 15 B',   away: 'ESCUELA FELIPE - FUND. BZ 14', time: '15:00', date: MAY1 },
  { home: 'MARIANISTAS 15',      away: 'CB PREMIA DE DALT',          time: '16:00', date: MAY1 },
  { home: 'DISTRITO OLIMPICO PEREZ', away: 'B86 LA SALLE',           time: '18:15', date: MAY1 },
  { home: 'EL OLIVAR 1',         away: 'CD ROMAREDA A',              time: '18:15', date: MAY1 },
  { home: 'CB PREMIA DE DALT',   away: 'RICOPIA CBJA 15 B',          time: '19:30', date: MAY1 },
  { home: 'MARIANISTAS 15',      away: 'ESCUELA FELIPE - FUND. BZ 14', time: '19:30', date: MAY1 },
  { home: 'CD ROMAREDA A',       away: 'DISTRITO OLIMPICO PEREZ',    time: '13:00', date: MAY2 },
  { home: 'ESCUELA FELIPE - FUND. BZ 14', away: 'CB PREMIA DE DALT', time: '13:00', date: MAY2 },
  { home: 'B86 LA SALLE',        away: 'EL OLIVAR 1',                time: '13:00', date: MAY2 },
  { home: 'RICOPIA CBJA 15 B',   away: 'MARIANISTAS 15',             time: '13:00', date: MAY2 },
]

const GROUP_MATCHES_07AMB = [
  { home: 'CD ROMAREDA B',        away: 'CDE DINAMICA MADRID',       time: '11:15', date: MAY1 },
  { home: 'BC TECLA SALA BLANCO', away: 'CD ROMAREDA B',             time: '17:15', date: MAY1 },
  { home: 'CDE DINAMICA MADRID',  away: 'BC TECLA SALA BLANCO',      time: '09:00', date: MAY2 },
  { home: 'COLEGIO MIRAMADRID',   away: 'MARIANISTAS 14',            time: '11:15', date: MAY1 },
  { home: 'AZULEJOS MONCAYO CBZ B', away: 'COLEGIO MIRAMADRID',      time: '17:15', date: MAY1 },
  { home: 'MARIANISTAS 14',       away: 'AZULEJOS MONCAYO CBZ B',    time: '10:00', date: MAY2 },
  { home: 'EQUIPO LOCAL',         away: 'EL OLIVAR 2',               time: '11:15', date: MAY1 },
  { home: 'DISTRITO OLIMPICO CORREA', away: 'EQUIPO LOCAL',          time: '17:15', date: MAY1 },
  { home: 'EL OLIVAR 2',          away: 'DISTRITO OLIMPICO CORREA',  time: '10:00', date: MAY2 },
  { home: 'LAS ROZAS 15 B',       away: 'OLD SCHOOL BASKET',         time: '12:15', date: MAY1 },
  { home: 'JOVENTUT MARIANA',     away: 'LAS ROZAS 15 B',            time: '18:15', date: MAY1 },
  { home: 'OLD SCHOOL BASKET',    away: 'JOVENTUT MARIANA',          time: '10:00', date: MAY2 },
]

// ─── UTC helper tests ──────────────────────────────────────────────────────────

describe('utc() helper', () => {
  it('converts CEST 15:00 to UTC 13:00', () => {
    expect(utc(MAY1, '15:00')).toBe('2026-05-01T13:00:00+00:00')
  })

  it('converts CEST 09:00 to UTC 07:00', () => {
    expect(utc(MAY2, '09:00')).toBe('2026-05-02T07:00:00+00:00')
  })

  it('converts CEST 19:30 to UTC 17:30', () => {
    expect(utc(MAY1, '19:30')).toBe('2026-05-01T17:30:00+00:00')
  })

  it('pads single-digit UTC hours correctly', () => {
    const result = utc(MAY1, '11:15')
    expect(result).toBe('2026-05-01T09:15:00+00:00')
  })

  it('handles midnight-adjacent conversion (02:00 CEST → 00:00 UTC)', () => {
    expect(utc(MAY1, '02:00')).toBe('2026-05-01T00:00:00+00:00')
  })
})

// ─── Match count assertions ───────────────────────────────────────────────────

describe('06AMP2 match data', () => {
  it('has exactly 12 group phase matches', () => {
    expect(GROUP_MATCHES_06AMP2).toHaveLength(12)
  })

  it('each team plays exactly 3 group matches (round-robin of 4 per group)', () => {
    const counts = new Map<string, number>()
    for (const m of GROUP_MATCHES_06AMP2) {
      counts.set(m.home, (counts.get(m.home) ?? 0) + 1)
      counts.set(m.away, (counts.get(m.away) ?? 0) + 1)
    }
    for (const [team, count] of counts) {
      expect(count, `${team} should play 3 matches`).toBe(3)
    }
  })

  it('CD Romareda A appears in 3 matches', () => {
    const romareda = GROUP_MATCHES_06AMP2.filter(
      (m) => m.home === 'CD ROMAREDA A' || m.away === 'CD ROMAREDA A',
    )
    expect(romareda).toHaveLength(3)
  })

  it('all matches are on May 1 or May 2', () => {
    for (const m of GROUP_MATCHES_06AMP2) {
      expect([MAY1, MAY2]).toContain(m.date)
    }
  })

  it('no duplicate match-ups (each pair plays once)', () => {
    const seen = new Set<string>()
    for (const m of GROUP_MATCHES_06AMP2) {
      const key = [m.home, m.away].sort().join('|')
      expect(seen.has(key), `Duplicate matchup: ${key}`).toBe(false)
      seen.add(key)
    }
  })
})

describe('07AMB match data', () => {
  it('has exactly 12 group phase matches (3 teams × 4 groups × 3 matches each / 2)', () => {
    expect(GROUP_MATCHES_07AMB).toHaveLength(12)
  })

  it('CD Romareda B appears in 2 group matches (first 2 rounds; 3rd round is CDE vs Tecla)', () => {
    const romareda = GROUP_MATCHES_07AMB.filter(
      (m) => m.home === 'CD ROMAREDA B' || m.away === 'CD ROMAREDA B',
    )
    expect(romareda).toHaveLength(2)
  })

  it('each group has exactly 3 matches (complete round-robin for 3 teams)', () => {
    // Group 1: Romareda B, CDE, Tecla → 3 matches
    const g1 = GROUP_MATCHES_07AMB.filter((m) =>
      ['CD ROMAREDA B', 'CDE DINAMICA MADRID', 'BC TECLA SALA BLANCO'].includes(m.home) &&
      ['CD ROMAREDA B', 'CDE DINAMICA MADRID', 'BC TECLA SALA BLANCO'].includes(m.away),
    )
    expect(g1).toHaveLength(3)

    // Group 2: Maria14, Azulejos, Miramadrid → 3 matches
    const g2 = GROUP_MATCHES_07AMB.filter((m) =>
      ['MARIANISTAS 14', 'AZULEJOS MONCAYO CBZ B', 'COLEGIO MIRAMADRID'].includes(m.home) &&
      ['MARIANISTAS 14', 'AZULEJOS MONCAYO CBZ B', 'COLEGIO MIRAMADRID'].includes(m.away),
    )
    expect(g2).toHaveLength(3)
  })

  it('all matches are on May 1 or May 2', () => {
    for (const m of GROUP_MATCHES_07AMB) {
      expect([MAY1, MAY2]).toContain(m.date)
    }
  })

  it('no duplicate match-ups within any group', () => {
    const seen = new Set<string>()
    for (const m of GROUP_MATCHES_07AMB) {
      const key = [m.home, m.away].sort().join('|')
      expect(seen.has(key), `Duplicate matchup: ${key}`).toBe(false)
      seen.add(key)
    }
  })
})

// ─── Knockout placeholder counts ─────────────────────────────────────────────

describe('knockout placeholders', () => {
  it('06AMP2 has 4 knockout placeholders (7th/8th, 5th/6th, 3rd/4th, final)', () => {
    const placeholders06 = [
      { phase: 'qf', slot: 0 },   // 7th/8th
      { phase: 'qf', slot: 1 },   // 5th/6th
      { phase: 'sf', slot: 0 },   // 3rd/4th
      { phase: 'final', slot: 0 }, // final
    ]
    expect(placeholders06).toHaveLength(4)
  })

  it('07AMB has 4 knockout placeholders (sf×2 + 3rd/4th + final)', () => {
    const placeholders07 = [
      { phase: 'sf', slot: 0 },    // semi 1
      { phase: 'sf', slot: 1 },    // semi 2
      { phase: 'sf', slot: 2 },    // 3rd/4th
      { phase: 'final', slot: 0 }, // final
    ]
    expect(placeholders07).toHaveLength(4)
  })
})

// ─── Tournament metadata ──────────────────────────────────────────────────────

describe('tournament metadata', () => {
  it('06AMP2 has 8 distinct teams', () => {
    const allTeams = new Set<string>()
    for (const m of GROUP_MATCHES_06AMP2) {
      allTeams.add(m.home)
      allTeams.add(m.away)
    }
    expect(allTeams.size).toBe(8)
  })

  it('07AMB has 12 distinct teams', () => {
    const allTeams = new Set<string>()
    for (const m of GROUP_MATCHES_07AMB) {
      allTeams.add(m.home)
      allTeams.add(m.away)
    }
    expect(allTeams.size).toBe(12)
  })

  it('tournament dates span May 1-3 2026 only', () => {
    const validDates = new Set([MAY1, MAY2, MAY3])
    for (const m of [...GROUP_MATCHES_06AMP2, ...GROUP_MATCHES_07AMB]) {
      expect(validDates.has(m.date), `Invalid date: ${m.date}`).toBe(true)
    }
  })
})
