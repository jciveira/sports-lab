# HandBallLab — MVP Architecture

## Vision

A mobile-first PWA for handball teams: live scoreboard, match history, tournament tracking, and player profiles. Built as a family learning project (Juan, Mateo, Miguel) with the goal of shipping a real product used during league games and tournaments.

## Contributors

- **Juan** — Admin, architect, dev
- **Mateo** — Requirements, testing, player/UX feedback
- **Miguel** — Requirements, testing, player/UX feedback

## Project Management

- **Tickets**: GitHub Issues on the personal repo (stories, bugs, features)
- **UI Mocks**: Excalidraw (free, no login, tablet-friendly) — export images and attach to issues
- **CI/CD**: GitHub Actions workflows
- **Workflow**: Kids create issues with requirements/mocks → Juan builds → Kids test and close

## Privacy Rules (MANDATORY)

This app is used by 11-year-old kids. Strict data minimization:

- **NO** full names displayed publicly — use first name + last initial or nickname only
- **NO** dates of birth, addresses, phone numbers, or emails stored
- **NO** location tracking or geolocation
- **Photos**: optional, uploaded by admin only, stored in Supabase Storage (private bucket)
- **Player profiles contain ONLY**: first name/nickname, jersey number, role, team, strengths (icons), stats (from matches), avatar/photo (optional)
- **Team profiles contain ONLY**: team name, badge/logo, city/district (not address), roster (first names + numbers)

## Handball Rules

See [docs/HANDBALL_RULES.md](docs/HANDBALL_RULES.md) for the full rule set driving scoreboard logic.
Defaults are codified in `src/lib/rules.ts` and configurable per tournament/match.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Platform | PWA (installable web app) | No app store friction, works on any phone/tablet |
| Frontend | React + Vite + TypeScript | Modern, great learning path, huge ecosystem |
| UI | Tailwind CSS + shadcn/ui | Mobile-first, clean components, fast to build |
| Backend | Supabase (Postgres + Realtime + Auth) | Free tier, real-time subscriptions, simple setup |
| Offline | IndexedDB (Dexie.js) + sync on reconnect | Venues may lose signal — scoreboard must never freeze |
| Auth | Link-based access + 1 admin account | Single match URL shared for all roles; scorekeeper claims by first visit (no code gate) |

## Access Model

```
Admin (1 account)
  - Creates tournaments, matches, teams, players
  - Full control over everything

Scorekeeper (1 per match, first come first served)
  - First visitor to the match URL claims the role directly — no code required
  - Controls: score +/-, clock, exclusions, timeouts, half-time

Stat Tracker (1 per match, first come first served)
  - First visitor to the stat tracker URL claims the role directly — no code required
  - Controls: tag who scored, assists, saves, turnovers

Viewers (open access via match URL)
  - Read-only live view of scoreboard + stats
  - Access match history, player cards, tournament brackets
```

## Live Match — Two-Operator Flow

```
Scorekeeper                    Supabase Realtime              Stat Tracker
    |                                |                            |
    |-- "Goal Team A" ------------->|----> Viewers see +1         |
    |                                |<--- "Goal by #7, ast #4" --|
    |                                |----> Viewers see details   |
    |-- "Exclusion #3 (2min)" ---->|----> Viewers see exclusion  |
    |-- "Timeout Team B" --------->|----> Viewers see timeout    |
```

- Scorekeeper pushes raw events (team-level)
- Stat Tracker enriches events (player-level)
- If Stat Tracker misses one, score is still correct — stats are just incomplete
- If connection drops: events queue in IndexedDB, sync when back online

## Data Model

```
teams
  id, name, nickname, badge_url, city_district, created_at

players
  id, team_id, display_name (first name or nickname only), number
  role (Wing/Back/Pivot/GK/...), avatar_url (optional)
  strengths (icon keys[])

tournaments
  id, name, format (groups+knockouts), num_teams, status
  viewer_code

matches
  id, tournament_id, phase (group/semi/final), group_label (A/B)
  home_team_id, away_team_id
  home_score, away_score
  status (scheduled/running/paused/halftime/finished)
  scorekeeper_code, stat_tracker_code
  scorekeeper_claimed_by, stat_tracker_claimed_by
  started_at, finished_at

match_events
  id, match_id, type (goal/assist/save/exclusion/timeout/halftime)
  team_id, player_id (nullable — untagged events OK)
  related_event_id (links assist → goal)
  minute, half
  synced (boolean — for offline queue)
  created_at

suggestions
  id, text, name (optional first name/nickname), created_at
  (queued in IndexedDB when offline, synced to Supabase when back online)

player_stats (materialized view or computed)
  player_id, tournament_id
  goals, assists, saves, exclusions
  matches_played
```

## Tournament Structure (8 teams default)

```
Group A (4 teams)          Group B (4 teams)
  Round-robin (6 matches)    Round-robin (6 matches)

        |                          |
   Top 2 from A              Top 2 from B
        |                          |
     Semi 1: A1 vs B2       Semi 2: B1 vs A2
              |                    |
              +---- Final ---------+
```

- Admin creates tournament → auto-generates group fixtures
- After group phase: admin confirms standings → auto-generates semis
- After semis: auto-generates final

## Player Card

```
+---------------------------+
|  [Photo/Avatar]           |
|  #7 Mateo Civeira         |
|  Wing | Team Sharks       |
|                           |
|  Strengths: [speed] [shot]|
|                           |
|  Lab Stats (Season)       |
|  Goals: 12  Assists: 5    |
|  Saves: -   Excl: 1      |
|                           |
|  Badges: [TBD]            |
+---------------------------+
```

- Stats aggregated from match_events across tournament/season
- Strengths: picked from a predefined icon set
- Badges: achievement-based (future — e.g., "Hat Trick", "Clean Sheet")

## MVP Phases

### Phase 1 — Live Scoreboard ✅ COMPLETE
- Admin: create match, assign teams, manage teams with logos
- Scorekeeper UI: big buttons for score +/-, clock, exclusions, timeouts, reset score
- Viewer UI: live scoreboard display, back button to exit
- Supabase Realtime for sync; offline queue with IndexedDB (Dexie v2)
- Access code system (viewer / scorekeeper / stat_tracker)
- PWA: manifest + service worker, installable on mobile
- In-app suggestions form (`/suggestions`) — Spanish UI, offline-safe

### Phase 2 — Stat Tracking + Match History
- Stat Tracker UI: tag goals to players, assists, saves
- Match History: list of past matches with final scores + key stats
- MVP stat entry (manual, select player from roster)

### Phase 3 — Tournament Mode
- Admin: create tournament (8 teams), manage groups
- Auto-generate group fixtures
- Group standings table (W/D/L/GD/Pts)
- Bracket view for knockouts
- Team profiles (name, badge, roster)

### Phase 4 — Player Cards
- Player profile page with stats, strengths, role
- Aggregated stats from all matches
- Shareable card view (screenshot-friendly)

### Phase 5 — League Season (TBD)
- Season-long tracking
- Cumulative standings
- Details to be defined based on league format

## Project Structure

The repo is a monorepo under `experiments/` with one subdir per sport:

```
handball-lab/          ← this app (handball)
  src/
basketball/            ← basketball-lab scaffold (in progress — see basketball/ARCHITECTURE.md)
```

```
handball-lab/
  src/
    app/                  # Routes / pages
    components/
      scoreboard/         # Scorekeeper + Viewer UIs
      stats/              # Stat Tracker UI
      tournament/         # Brackets, groups, standings
      players/            # Player cards, profiles
      ui/                 # shadcn/ui components
    lib/
      supabase.ts         # Supabase client + types
      offline.ts          # IndexedDB queue + sync
      access.ts           # Scorekeeper claim + heartbeat logic
    hooks/                # React hooks (useMatch, useRealtime...)
    types/                # TypeScript types
  public/
  supabase/
    migrations/           # SQL migrations
    seed.sql              # Dev seed data
```

## Tech Stack Summary

| Layer | Tool |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| Backend | Supabase (Postgres + Realtime + Auth + Storage) |
| Offline | Dexie.js (IndexedDB wrapper) |
| Routing | React Router 7 |
| State | Zustand (local) + Supabase Realtime (remote) |
| Deploy | Vercel or Netlify (free tier) |
| Icons | Lucide React |
