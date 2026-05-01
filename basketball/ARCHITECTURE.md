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
| UI | Tailwind CSS v4 + `bbl-*` semantic tokens | Design tokens via `@theme` block — no hardcoded colors anywhere |
| Backend | Supabase (Postgres + Realtime + Auth) | Separate project from handball — clean data isolation |
| Offline | IndexedDB (Dexie.js) + sync on reconnect | Game venues may lose signal |
| Auth | Hardcoded PIN gate for admin (SHA-256, sessionStorage) | Consistent with handball-lab AdminGuard pattern — no Supabase Auth |
| Routing | Shell pattern with `<Outlet />` | `ViewerShell` (4 viewer tabs) + `AdminShell` (4 admin tabs) wrap routes — tab bar is owned by shell, not pages |
| Zustand selectors | Individual selectors only | Inline object selectors `(s) => ({ a: s.a })` cause infinite re-renders in Zustand v5 — always use 3 separate selectors |

## Access Model

```
ViewerShell (public — bottom tab bar: Partidos / Torneos / Jugadores / Más)
  /partidos         — match list
  /torneos          — tournament list
  /jugadores        — player list (links to /player/:id/card)
  /mas              — settings link + admin entry

Detail pages (no tab bar, BackButton instead)
  /match/:id/view           — live scoreboard (Viewer)
  /match/:id                — scorekeeper UI (first-come first-served)
  /tournament/:id           — standings + schedule
  /tournament/:id/bracket   — knockout bracket
  /player/:id/card          — FIFA-style player card

AdminGuard → AdminShell (PIN-gated, tab bar: Partidos / Torneos / Equipos / Jugadores)
  /admin/partidos   — match management
  /admin/torneos    — tournament management
  /admin/equipos    — team management
  /admin/jugadores  — player management
  Tab bar hidden automatically on detail routes (e.g. /admin/match/:id)
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

## Design Tokens

All colors defined in `src/index.css` via Tailwind v4 `@theme` block. Use `bbl-*` utility classes everywhere — never raw hex or Tailwind palette names.

| Token | Usage |
|---|---|
| `bbl-bg` | Page background (#0f1117) |
| `bbl-surface` | Card / panel background |
| `bbl-surface-light` | Elevated surface |
| `bbl-border` | Borders and dividers |
| `bbl-text` | Primary text |
| `bbl-text-muted` | Secondary / label text |
| `bbl-accent` | Orange brand accent (#f97316) |
| `bbl-score` | Score display |
| `bbl-clock` | Clock / error |
| `bbl-warning` | Warning banners |
| `bbl-team-home` | Home team color |
| `bbl-team-away` | Away team color |

## Shared Components

| Component | File | Description |
|---|---|---|
| `ViewerShell` | `components/ViewerShell.tsx` | Fixed bottom tab bar for viewer routes |
| `AdminShell` | `components/AdminShell.tsx` | Fixed bottom tab bar for admin routes; hides on detail pages |
| `BackButton` | `components/BackButton.tsx` | Absolutely positioned top-left; `to` prop or `navigate(-1)` |
| `BugReportButton` | `components/BugReportButton.tsx` | Fixed bottom-right; modal bug report sheet |
| `ReloadPrompt` | `components/ReloadPrompt.tsx` | PWA update toast; suppressed on /match/* |
| `AdminGuard` | `components/AdminGuard.tsx` | PIN gate (SHA-256, sessionStorage); wraps admin routes |

## Project Structure

```
basketball/
  src/
    components/
      ViewerShell.tsx   — viewer tab bar shell
      AdminShell.tsx    — admin tab bar shell
      BackButton.tsx    — shared back navigation
      BugReportButton.tsx
      ReloadPrompt.tsx
      AdminGuard.tsx
    lib/
      supabase.ts
      offline.ts
      rules.ts
      bug-reports.ts
      matches.ts        — formatMatchDate, sortByScheduledAt, toDatetimeLocal
    hooks/
    pages/
      PartidosTab.tsx   — /partidos
      TorneosTab.tsx    — /torneos
      JugadoresTab.tsx  — /jugadores
      MasTab.tsx        — /mas
      ViewerPage.tsx    — /match/:id/view
      ScorekeeperPage.tsx
      PlayerCardPage.tsx
      TournamentPage.tsx
      TournamentBracketPage.tsx
      HomePage.tsx      — legacy entry (redirects to /partidos)
      admin/
        AdminPage.tsx   — /admin/partidos
        AdminTorneosPage.tsx
        AdminEquiposPage.tsx
        AdminJugadoresPage.tsx
    stores/
    types/
  e2e/
    smoke.spec.ts
    regression.spec.ts
  tests/
    unit/
    component/
  docs/
    BASKETBALL_RULES.md
  playwright.config.ts
  public/
```

## Phase 5 — UX Polish ✅ COMPLETE

- [x] Design tokens — `@theme` block in `index.css`, all colors as `bbl-*` semantic utilities (#18)
- [x] `ViewerShell` — fixed bottom tab bar (Partidos / Torneos / Jugadores / Más), `<Outlet />` pattern (#18)
- [x] `AdminShell` — admin tab bar, auto-hides on detail routes (#18)
- [x] `BackButton`, `BugReportButton`, `ReloadPrompt` shared components (#18)
- [x] Tab pages — `PartidosTab`, `TorneosTab`, `JugadoresTab`, `MasTab` (#18)
- [x] Admin sub-pages stubs — `AdminTorneosPage`, `AdminEquiposPage`, `AdminJugadoresPage` (#18)
- [x] All pages ported to `bbl-*` tokens + Spanish copy (#18)
- [x] Playwright E2E infrastructure created — smoke (8 tests) + regression (4 tests) (#18)

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS v4 — `bbl-*` semantic design tokens via `@theme` |
| Backend | Supabase (separate project from handball) |
| Routing | React Router 7 — shell pattern with `<Outlet />` |
| State | Zustand v5 + Supabase Realtime |
| Tests | Vitest + React Testing Library + Playwright |
| Deploy | Vercel — `basketball-lab-amber.vercel.app` (root dir: `basketball/`) |
