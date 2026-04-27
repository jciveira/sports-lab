# BasketballLab — Architecture

## Vision

A mobile-first PWA for basketball teams: live scoreboard, match history, tournament tracking, and player profiles. Part of the sports-lab monorepo alongside handball-lab. Built as a family learning project (Juan, Mateo, Miguel).

## Contributors

- **Juan** — Admin, architect, dev
- **Mateo** — Requirements, testing, player/UX feedback
- **Miguel** — Requirements, testing, player/UX feedback

## Project Management

- **Tickets**: GitHub Issues on `jciveira/sports-lab` (basketball-specific stories)
- **Workflow**: Kids create issues with requirements → Juan builds → Kids test and close

## Privacy Rules (MANDATORY)

Same rules as handball-lab — this app is used by 11-year-old kids:

- **NO** full names displayed publicly — first name + last initial or nickname only
- **NO** dates of birth, addresses, phone numbers, or emails stored
- **NO** location tracking or geolocation
- **Photos**: optional, uploaded by admin only, stored in Supabase Storage (private bucket)

## Basketball Rules

See [docs/BASKETBALL_RULES.md](docs/BASKETBALL_RULES.md) for the full rule set driving scoreboard logic.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Platform | PWA (installable web app) | No app store friction, works on any phone/tablet |
| Frontend | React + Vite + TypeScript | Consistent with handball-lab |
| UI | Tailwind CSS + shadcn/ui | Mobile-first, consistent across sports |
| Backend | Supabase (Postgres + Realtime + Auth) | Separate project from handball — clean data isolation |
| Offline | IndexedDB (Dexie.js) + sync on reconnect | Game venues may lose signal |
| Auth | Code-based access (no ceremony for scorekeeper) | Consistent with handball-lab post-#142 |

## Access Model

```
Admin (1 account)
  - Creates tournaments, matches, teams, players
  - Full control over everything

Scorekeeper (1 per match, first come first served)
  - First visitor to /match/:id/scorekeeper claims it directly — no code gate
  - Controls: score, clock, fouls, timeouts, quarter transitions

Viewers (shared code per tournament/match)
  - Read-only live view of scoreboard
  - Access match history, player cards, tournament brackets
```

## Data Model

```
teams
  id, name, nickname, badge_url, city_district, created_at

players
  id, team_id, display_name, number, position, avatar_url, attributes (JSONB), created_at
  -- attributes: { tiro, pase, defensa, fisico, stamina, vision } (0–99 each)

tournaments
  id, name, format, num_teams, status (setup/group_phase/knockout/finished), viewer_code

tournament_teams
  id, tournament_id, team_id, group_name, created_at

tournament_matches
  id, tournament_id, phase (group/sf/qf/final), round_index, match_slot
  home_team_id (nullable for unresolved bracket slots), away_team_id (nullable)
  match_id (nullable — links to matches when the match is started)

matches
  id, tournament_id, phase, home_team_id, away_team_id
  home_score, away_score
  status (scheduled/running/paused/quarter_break/finished)
  quarter, time_remaining_seconds, scorekeeper_claimed_by
  started_at, finished_at
  -- NOTE: team fouls are DERIVED from match_events counts — no counter columns

match_events
  id, match_id, type (goal_2/goal_3/freethrow/foul/timeout/quarter_end)
  team_id, player_id (nullable)
  quarter, time_remaining (seconds)
  synced (boolean)
  created_at
```

## MVP Phases

### Phase 1 — Live Scoreboard ✅ COMPLETE
- Admin: create match, assign teams (#9)
- Scorekeeper UI: score +/-, fouls, clock, timeouts, quarter transitions (#8)
- Offline event queue: Dexie.js IndexedDB buffer, flush on reconnect (#6)
- Viewer UI: live scoreboard, Supabase Realtime, reconnect on drop (#7)
- Supabase schema + TypeScript types (#10)
- PWA: manifest, service worker, icons (#5)
- Rules spec locked: 5 fouls/quarter, 8 min quarters, 2 timeouts/half (#11)

### Phase 2 — Stat Tracking + Match History
- Stat Tracker UI: tag goals, assists, blocks, rebounds
- Match History with final scores

### Phase 3 — Tournament Mode ✅ COMPLETE
- Tournament store: createTournament, addTeamToTournament, generateGroupSchedule (round-robin), generateKnockoutDraw, advanceWinner, computeStandings (#4)
- Standings: W/L, pts (Win=2/Loss=0), GD, tiebreak by GD (#4)
- TournamentPage at /tournament/:id — standings + schedule + Realtime (#4)
- TournamentBracketPage at /tournament/:id/bracket — scrollable bracket (#3)
- Admin TournamentSection — create, add teams, trigger group + knockout generation (#4)

### Phase 4 — Player Cards ✅ COMPLETE
- Roster management: add/edit/remove players per team, duplicate jersey guard, max 12 players (#2)
- usePlayersStore: CRUD with Supabase, sorted by jersey number (#2)
- PlayerCardPage at /player/:id/card — FIFA-style card, 6 attribute bars, overall = avg(6 attrs) (#1)
- PlayerAttributes type: tiro, pase, defensa, fisico, stamina, vision (0–99) (#1)
- Admin RosterSection: add form, inline attribute editor, confirmation on remove (#2)

## Project Structure

```
basketball/
  src/
    components/
      scoreboard/
      stats/
      tournament/
      players/
      ui/
    lib/
      supabase.ts
      offline.ts
      rules.ts
    hooks/
    pages/
    types/
  docs/
    BASKETBALL_RULES.md
  public/
```

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| Backend | Supabase (separate project from handball) |
| Routing | React Router 7 |
| State | Zustand + Supabase Realtime |
| Deploy | Vercel (separate project — TBD) |
