# Sports Lab

Mobile-first PWA scoreboard, tournament tracker, and player profiles — handball + basketball.

Built as a family learning project — designed to be used during real games and tournaments by parents and kids on phones and tablets.

## Sports

| Sport | Status | App |
|-------|--------|-----|
| **Handball** | Phase 1 + Phase 3 + Phase 4 complete | `/` (repo root) |
| **Basketball** | Phase 1 + Phase 3 + Phase 4 complete | `basketball/` |

---

## Basketball (Phase 1 + Phase 3 + Phase 4 — complete)

See [`basketball/ARCHITECTURE.md`](basketball/ARCHITECTURE.md) and [`basketball/docs/BASKETBALL_RULES.md`](basketball/docs/BASKETBALL_RULES.md) for the full spec.

**Phase 1 shipped:**
- [x] Supabase schema — `teams`, `players`, `matches`, `match_events` with RLS + Realtime (#10)
- [x] TypeScript types — `Team`, `Player`, `Match`, `MatchEvent`, `MatchStatus`, `PlayerPosition`, `EventType` (#10)
- [x] PWA — manifest, service worker, 192/512px icons, installable on iOS + Android (#5)
- [x] Rules spec — BASKETBALL_RULES.md reviewed and locked: 5 fouls/quarter bonus, 8 min quarters, 2 timeouts/half (#11)
- [x] Admin page — create teams, create matches with quarter duration selector (8/10 min), copy viewer URL (#9)
- [x] Viewer UI — `/match/:id/view` public live scoreboard, Supabase Realtime updates, reconnect on drop (#7)
- [x] Scorekeeper UI — claim role (first-come first-served), +2/+3/+1 scoring, undo last, foul counter per quarter, countdown clock, end quarter, timeouts, finish match (#8)
- [x] Offline event queue — Dexie.js IndexedDB buffer, flush on reconnect, amber banner on scorekeeper page (#6)

**Phase 3 shipped:**
- [x] Tournament store — `createTournament`, `addTeamToTournament`, `generateGroupSchedule` (round-robin N*(N-1)/2), `generateKnockoutDraw`, `advanceWinner`, `computeStandings` (#4)
- [x] Standings table — W/L, points (Win=2/Loss=0), GD, sorted by points desc, tiebreak by GD (#4)
- [x] `TournamentPage` at `/tournament/:id` — group standings + schedule + Realtime subscription (#4)
- [x] Knockout bracket — `TournamentBracketPage` at `/tournament/:id/bracket`, horizontally scrollable (#3)
- [x] Admin `TournamentSection` — create tournament, add teams, trigger group + knockout generation (#4)

**Phase 4 shipped:**
- [x] Player roster per team — add/edit/remove, duplicate jersey guard, max 12 players (#2)
- [x] `usePlayersStore` — CRUD with Supabase, sorted by jersey number (#2)
- [x] `PlayerCardPage` at `/player/:id/card` — FIFA-style card, 6 attribute bars, `overall = avg(6 attrs)` (#1)
- [x] `PlayerAttributes` type — tiro, pase, defensa, fisico, stamina, vision (0–99) (#1)
- [x] Admin `RosterSection` — team selector, add-player form, inline attribute editor (#2)

**Basketball tests:** 90 unit tests (8 files)

**Planned — Phase 2:**
- **Stat Tracking** — tag goals, assists, blocks, rebounds per player

---

## Handball

## Current Status

**Phase 1 — Live Scoreboard** (COMPLETE)

- [x] Project scaffold (React + Vite + TypeScript)
- [x] Tailwind CSS v4 with dark theme
- [x] Zustand match state store
- [x] Pre-match config (presets: U12/U14/Senior/Mini/Friendly + custom)
- [x] Live clock with play/pause and dynamic half support (#1)
- [x] Score increment/decrement with LED digits (#2)
- [x] Timeout tracking with per-half reset (#3)
- [x] 2-minute exclusion tracking with countdown timers (#4)
- [x] Next Half / End Match flow
- [x] Position labels with i18n tooltips (EN/ES, device-detected)
- [x] Handball rules reference (docs/HANDBALL_RULES.md)
- [x] Supabase integration — schema, CRUD, real-time sync (#5)
- [x] Access code system (viewer / scorekeeper / stat tracker) (#6)
- [x] Offline queue (IndexedDB via Dexie.js) (#7)
- [x] PWA manifest + service worker, Dominicos crest icons (#8, #16)
- [x] Back to Home button after match ends (#11)
- [x] Cancel match mid-game with confirmation dialog (#12)
- [x] Dominicos crest watermark on scoreboard background (#16)
- [x] Teams entity — persistent teams with name + logo URL (#13)
- [x] Teams management page (/admin/teams) — list, create, edit, delete
- [x] Team picker in match setup (replaces free-text input)
- [x] Team logos in scoreboard next to team name
- [x] Exclusion rules: max 3 per team + early dismiss for U12 (#9)
- [x] Parent guide — Spanish docs + in-app /help page
- [x] Unique team name validation — case-insensitive, trimmed, client + DB (#19)
- [x] Responsive scoreboard — fits phones ≥320px, scrollable fallback, compact controls, iOS safe area (#22)
- [x] Scorekeeper join flow — "Ready to Start" screen for pre-configured matches (#18)
- [x] Reset Score button with confirmation dialog (#18)
- [x] Back/exit button on scoreboard and pre-match screen (#24)
- [x] In-app suggestions form for parents — Spanish UI, offline queue (#17)
- [x] PWA install button — Android prompt + iOS Safari tip, auto-hides when installed (#25)
- [x] Game Center — browse live, recent, and past matches without codes (#39)
- [x] Direct viewer access to any match via `/match/:id` (no code required) (#39)
- [x] Bug report button — floating on every page, offline queue + Supabase sync (#31)
- [x] Bug report screenshot attachment — camera/gallery capture, image compression, Supabase Storage upload, preview (#37)
- [x] Tournament browser — list and discover tournaments at `/tournaments` (#40)
- [x] Persist operator session in localStorage — survives tab close/phone lock (#32)
- [x] Viewer-first home screen — spectator actions first, admin in collapsible section (#41)
- [x] Full Spanish UI — all user-facing text in Spanish, no i18n framework (#34)
- [x] Multi-device sync loop fix — echo prevention, clock ownership, debounced sync (#43)
- [x] PWA auto-update — vite-plugin-pwa with prompt strategy, Spanish reload toast, suppressed on match pages (#44)
- [x] Tournament deduplication — unique constraint, duplicate guard, delete tournament with confirmation (#42)
- [x] Back button on /join page — prevents users getting stuck without navigation (#49)
- [x] Admin code management — persistent code view + shareable link at `/admin/match/:matchId` (#47)
- [x] Role-based scoreboard UI — scorekeeper controls, viewer reads, claim prompt for unclaimed matches (#45)
- [x] Viewer access without code — direct link + live match list, "Partido pendiente" screen (#46)
- [x] Admin/scorekeeper conflict — admin overrules via Supabase Presence, auto-restore on disconnect (#48) *(superseded by #123)*
- [x] Viewer read-only scoreboard — hide all operator controls, "Tiempo Muerto" banner for timeouts (#60)
- [x] Admin match management — list all matches with status/scores, delete with confirmation (#64)
- [x] DB migration: match lifecycle (`starts_at`), team/tournament categoría/género columns (#68)
- [x] Viewer shell — bottom tab nav (Partidos, Torneos, Plantillas, Más), app opens directly into shell (#69)
- [x] Admin shell — bottom tab nav (Partidos, Torneos, Equipos, Jugadores) behind PIN gate, tab bar hides on detail pages (#70)
- [x] Match lifecycle — scheduled→live→finished transitions, admin activate/finish, auto-activation via `starts_at`, Flow A direct result entry (#71)
- [x] Viewer Partidos tab — match list grouped by status (En directo / Programados / Finalizados), collapsible sections, En directo open by default, live/finished cards link to scoreboard, realtime updates via Supabase (#72)
- [x] Admin Torneos tab — tournament list with 3-section layout (En curso / Próximos / Finalizados), categoría/género filter dropdowns, delete with confirmation; create flow uses structured dropdowns + filtered team picker (#75)
- [x] Admin Equipos tab — team card grid (2-col mobile, 3+ wider), Dominicos pinned at top, roster visual cue (opacity + player count), team CRUD with categoría/género dropdowns (#76)
- [x] Admin Partidos tab — match list grouped by status (En directo / Programados / Finalizados), activate / finish with confirmation / open scoreboard / delete, create match flow (#73)
- [x] Viewer Torneos tab — tournament list with status groups (En curso / Próximos / Finalizados), read-only tournament detail with phases in reverse order (Final → Semis → Quarters → Groups), all edit actions removed (#74)
- [x] Viewer Más tab — full rebuild with icons + descriptions, marcador rápido / guía / sugerencias / admin access, conditional PWA install prompt (Android native prompt / iOS+desktop tips / hidden when installed) (#79)
- [x] Admin Jugadores tab — full CRUD player directory across all teams, search by name or team, links to player profile cards (#78)
- [x] Viewer Plantillas tab — team grid (badge, name, category·gender, player count), tap to roster sorted by jersey number, tap player → profile card, back navigation, empty states (#77)
- [x] Region (Comunidad Autónoma) field on teams — `TEAM_REGIONS` constant (17 CAs), required dropdown in admin create/edit form, save gated until selected, region shown in team card (#88)
- [x] Player photo upload — admin uploads avatar from player edit form, client-side compression (600px/0.8), private Supabase Storage bucket with 7-day signed URLs, 2MB size limit, non-blocking error display (#55)
- [x] Scorekeeper access model — role-based UI (scorekeeper controls / viewer read-only / unclaimed claim prompt), admin presence overrides scorekeeper via Supabase Realtime Presence with auto-restore on disconnect, grace period suppresses false-positive override banner on claim (#80) *(superseded by #123)*
- [x] Scorekeeper redesign — admin always has full scoring rights (`isScorekeeper = isAdmin || isNativeScorekeeper`); one open viewer claim slot; permanent status widget for all roles (available / claimed name / claimed no name / disponible for operators); auto-release on heartbeat timeout (>2 min); no adminOverride displacement logic (#123)
- [x] Server-side clock — replace session-driven `clock_seconds` push with `clock_seconds_base` + `clock_started_at` timestamps (migration 021); all clients compute elapsed independently via `computeClockSeconds()`; no role has write authority over displayed time; opening MatchPage as admin no longer resets clock (#124)
- [x] Viewer Plantillas tab — teams grouped by region (Comunidad Autónoma) in collapsible accordion; region with most teams auto-expanded on load; roster-presence opacity (full colour if players, translucent if empty) (#89, #91)
- [x] Admin Partidos tab — past games collapsed by default, collapsible header shows count, active/upcoming matches visible without scrolling (#93)
- [x] Admin team delete — silent RLS block detection using `count:exact`; throws and shows error toast if delete returns 0 rows (#92)
- [x] Venues schema — `venues` table (id, tournament_id FK, name, address?, created_at), `match.venue_id` FK, `Venue` TS interface, CRUD helpers (#94)
- [x] Player avatar signed URL fix — store storage path in `avatar_url`, generate 1-hour signed URL on demand; graceful legacy-URL degradation (#97)
- [x] Clock display fix — all roles run local `setInterval` tick for smooth display; echo-loop prevention via `_isRemoteUpdate` flag in subscribe callback (#103)
- [x] Team edit save button fix — dirty-check gates save instead of `!region`; allows re-saving existing teams without re-selecting region (#104)
- [x] Scorekeeper claim fix — `REPLICA IDENTITY FULL` on matches table ensures all columns present in realtime UPDATE payloads; defensive UI snap on failed claim (#102)
- [x] Admin lists collapsible layout — teams grouped by region (collapsible), tournaments in collapsible status sections, matching viewer UX; edit/delete controls inside expanded sections (#105)
- [x] Shared BackButton component — standardises back navigation across all 13 full-route pages; ScoreboardPage gains back button on setup screen; icon-only for drill-down, labelled for top-level destinations (#101)
- [x] AdminPartidosPage collapsible sections — active/live matches expanded by default, past matches collapsed; section headers toggle with `aria-expanded`; consistent with collapsible pattern from #105 (#108)
- [x] Team delete FK error — clear Spanish error when deleting a team referenced in matches; catches Supabase code `23503` and shows actionable message instead of generic fallback (#109)
- [x] /join page removed — cleanup after scorekeeper model shipped; `/join` route, JoinPage, and code-based access logic deleted; DB columns kept for backward compat (#81)
- [x] Viewer exclusions via realtime — UUID team_id in match_events, UUID→side mapping on receive, `exclusion_end` added to type CHECK constraint; scorekeeper exclusion now appears on viewer screen within ~1s (#114)
- [x] iOS photo upload fix — `createImageBitmap` fallback decoder for HEIC/unsupported formats; `accept="image/*"` triggers iOS HEIC→JPEG conversion; clear error on decode failure (#113)
- [x] Scorekeeper redesign — admin always has full scoring rights (`isScorekeeper = isAdmin || isNativeScorekeeper`); one open viewer claim slot; permanent status widget for all roles (available / claimed name / claimed no name / disponible for operators); auto-release on heartbeat timeout (>2 min); no adminOverride displacement logic (#123)
- [x] Server-side clock — replace session-driven `clock_seconds` push with `clock_seconds_base` + `clock_started_at` timestamps (migration 021); all clients compute elapsed independently via `computeClockSeconds()`; no role has write authority over displayed time; opening MatchPage as admin no longer resets clock (#124)
- [x] MatchesTab layout — team pairing centered (`justify-center`); ChevronRight removed from match cards (section collapse arrows kept); fully tappable live/finished cards (#120)
- [x] Más tab: cache clear — "Limpiar caché" button clears `localStorage` + `sessionStorage` and reloads to `/`; confirmation dialog ("¿Limpiar caché? Se cerrarán tus sesiones activas") with cancel/confirm (#119)
- [x] Dark/light theme toggle — `useTheme` hook with `hbl-theme` localStorage key; CSS variable overrides on `html.light`; toggle button in Más tab (sun/moon icons); default dark (#121)
- [x] Scorekeeper session tab-scoped — scorekeeper role now uses `sessionStorage` instead of `localStorage`; prevents controls leaking to sibling browser tabs on the same device (#125)
- [x] Score/clock flicker fix — realtime echo no longer overwrites scorekeeper's optimistic score; scorers (scorekeeper/admin) own score/timeout fields locally; viewers still receive score updates from remote; clock timestamps applied for all roles (#126)
- [x] Team edit region placeholder — asterisk removed from region dropdown in edit mode (region optional when editing); required indicator still shown on create (#112)
- [x] Release role button — "Soltar el marcador" ghost button below scoreboard controls; shows toast "Marcador liberado" on press; hidden when match is finished or no role to release (#129)
- [x] Font size preference — Pequeño/Normal/Grande picker in Más tab; persists to `localStorage` (`hbl-font-size`); scales score display via `--hbl-score-scale` CSS custom property (0.75×/1×/1.25×) (#131)
- [x] Theme flash fix — persisted theme applied to `<html>` before React mounts; no flash of wrong theme on first load across all tabs (#137)
- [x] PWA install flow rebuild — Android: dismiss falls back to `android-tip` (entry stays visible instead of disappearing); iOS Safari: 3-step modal guide (Compartir → Añadir a pantalla de inicio → Confirmar); unsupported browsers: clear fallback message (#138)
- [x] Access code ceremony removed — scorekeeper and stat tracker code rows gone from match creation and admin match detail; single match link shared with everyone; first visitor to the match claims the scorekeeper role directly (#142)

**Phase 3 — Tournament Mode** (IN PROGRESS)

- [x] Tournament creation wizard with step-by-step flow (#14)
- [x] Optional second category — single-category tournaments supported (#23)
- [x] Configurable category names (Boys, Girls, U12, Mixed, etc.) (#23)
- [x] Group assignment UI (8 teams → 2 groups of 4 per category)
- [x] Round-robin fixture auto-generation (3 matches per team)
- [x] Live standings table (P/W/D/L/GF/GA/GD/Pts) with automatic updates
- [x] Manual score entry — fast phone-friendly input for non-live games
- [x] Tournament overview page with category tabs
- [x] Top 2 per group highlighted (qualifying positions)
- [x] Knockout bracket: semis + 3rd place + final (#15)
- [x] Penalty shootout for tied knockout matches (#15)
- [x] Progressive knockout generation (group done → semis → finals)
- [x] Podium display (1st/2nd/3rd with trophy/medal icons)
- [x] Auto-generate placeholder teams when not enough in DB (#21)
- [x] Clear error messages on tournament creation failure (#21)
- [x] N groups per category — configurable, not limited to 2 (#35)
- [x] Knockout bracket adapts to group count: 2 groups → semis, 4 groups → semis (1 per group), 8+ → quarters (#35)
- [x] CORRALES tournament data loaded via seed script — 2 categories, 8 groups, 48 matches (#36)
- [x] Tournament match result re-edit — admin pencil button on finished knockout matches, pre-populates current scores, viewer cannot edit (#87)
- [x] Tournament category/gender filter — null-safe fallback so old records without category/gender are not hidden by active filters (#86)
- [x] Admin venue CRUD + match assignment — collapsible venues section (admin-only), add/edit/delete venues, delete blocked when venue is assigned to matches, venue dropdown on each match row (#95)
- [x] Viewer venue display — venue chip below match cards (maps link if address, plain text if not), collapsible venues list in tournament overview, hidden when no venues (#96)
- [x] Edit any tournament match result — admin edit button on finished GROUP matches pre-populates current scores; no match locked by status; viewer never sees edit controls (#106)
- [x] Knockout pairing confirmation — admin reviews auto-suggested pairings before generating matches; tap any two teams to swap (within-match or across-match); Cancel returns without generating (#111)
- [x] Edit tournament attributes — admin inline edit form for name/date/category/gender; warning shown on started tournaments; cancel and save flow (#107)
- [x] Dominicos-first ordering — groups or knockout sections containing a Dominicos team render first in both admin and viewer tournament views; display-only, no DB change (#110)
- [x] Match date/time — `starts_at` shown as localised chip on match cards (GamesPage + TournamentPage); admin inline edit (clock icon → datetime-local input) on standalone matches and tournament match rows; optional field in create match flow (#115)
- [x] Tournament match sort by date — matches within each group and each knockout round ordered by `starts_at asc` (nulls last), replacing `sortDominicosFirst` in knockout view (#116)
- [x] CORRALES XXXIV schedule data — 6 Dominicos group-phase matches (3 AF + 3 AM) populated with correct UTC timestamps from official cronograma (#117)
- [x] Viewer tournament date/time + sort parity — Clock chip + `formatMatchDate` on viewer match rows; group and knockout rounds sorted by `starts_at asc` (nulls last); `sortByStartsAt` extracted from `TournamentPage.tsx` to shared `src/lib/matches.ts` (#118)
- [x] Match list filters — gender chips (Todos / Masculino / Femenino) + tournament dropdown (shown only when multiple tournaments exist); filters are additive; empty state when no matches match active filters (#122)
- [x] Knockout bracket section ordering — Final → 3rd Place → Semis → Quarters rendered top-to-bottom; venue chip shown below each match; not-played matches visually dimmed with strikethrough (#133)
- [x] "No jugado" toggle on knockout matches — admin toggle marks/restores a match as not-played; dimmed + strikethrough UI; venue chip hidden; not_played guarded in needsPenalties check (migration 022) (#130 #135)
- [x] Admin edit knockout match results — edit pencil on finished knockout matches; downstream warning banner when a later-phase match is already finished; admin venue dropdown + datetime edit on all knockout rows (#132)
- [x] Tournament close/reopen — admin "Cerrar torneo" button sets status to `finished`; "Reabrir torneo" restores it; "Finalizado" badge shown in admin and viewer views when finished (#134)
- [x] Games list sorted by date — `sortByStartsAt` made generic and applied to scheduled + finished sections; games without date sort last (#136)
- [x] Venues RLS — `venues` table has RLS enabled with anon SELECT/INSERT/UPDATE/DELETE policies; matches pattern from other tables; resolves Supabase lint warning (#140)

**Phase 4 — Player Cards** (IN PROGRESS)

- [x] Player CRUD page — create, edit, delete players grouped by team (#27)
- [x] Roster management — assign/remove players to teams, toggle available/injured status (#28)
- [x] Player card view — collectible-style public profile at `/player/:id` with team badge, role, avatar, injured indicator (#29)
- [x] FIFA-style ratings data model — field player stats (tiro/pase/defensa/fisico/stamina/vision) and GK stats (9m/6m/ex/pas/med/7m), card type (base/toty), admin editor with role-adaptive inputs (#57)
- [x] FIFA-style card display — stat bars with gradient fill, overall rating (Media) badge, TOTY gold styling, GK-adaptive labels (#58)
- [x] FIFA-style TOTY card redesign — deep blue + gold gradient, 56px rating, ornate double border, avatar glow ring, 2-column stat grid, gold name banner (#61)
- [x] Dominicos AM ratings seed — one-off script to populate 18 players from Mateo's roster data (#59)
- [x] Roster picker in match setup — select active squad per team, injured/unavailable badges, optional (#30)
- [x] Bug report button — bottom offset raised to `bottom-20` (80px) to clear tab nav + iOS safe area inset (#83)
- [x] Screenshot attachment — removed `capture="environment"` so iOS Safari shows picker instead of opening camera directly (#82)
- [x] Viewer player profile — TOTY card renders for all `card_type='toty'` players; stats placeholder shown when ratings are null (#90)
- [x] Bug report screenshot compression — respects original image orientation on mobile (#98)
- [x] PWA install prompt — shows native Android prompt first, falls back to manual tip; hidden after install (#100)
- [x] Camera hint on player rows — greyed-out Camera icon on rows with no avatar; tapping opens edit mode for photo upload; hidden once avatar is set (#99)

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Supabase (Postgres + Realtime + Auth + Storage) |
| Offline | Dexie.js (IndexedDB) |
| Routing | React Router 7 |
| State | Zustand (local) + Supabase Realtime (remote) |
| Icons | Lucide React |
| Deploy | Vercel (auto-deploy from GitHub) |
| Unit/Component Testing | Vitest + @testing-library/react |
| E2E Testing | Playwright (viewport-targeted: see TESTING.md) |

## Testing

```bash
# Run all tests (unit + component + E2E)
npm run test:all

# Individual layers
npm run test:unit        # Zustand store, rules, utils
npm run test:component   # React component interactions (no static text)
npm run test:e2e         # Full E2E suite (smoke + regression + responsive)
npm run test:smoke       # Page crash detection (Desktop only)
npm run test:regression  # Golden path user journeys (Mobile + Desktop)
npm run test:watch       # Vitest in watch mode (unit + component)
npm run test:counts      # Auto-update README + TESTING.md test counts

# Integration tests (real Supabase DB — run locally before marking scorekeeper issues in-review)
npm run test:integration # Schema smoke + write smoke + event type constraints (9 tests)
```

**Current coverage**: 733 tests (662 vitest + 62 Playwright + 9 integration)

See [`TESTING.md`](TESTING.md) for the full test strategy, pyramid, viewport rules, and anti-patterns.

| Layer | Tests | Runs | What's covered |
|-------|-------|------|----------------|
| Unit | ~289 | 289 | Store mutations, clock logic, config presets, session management, offline DB, sync queue, tournament utils, ratings utils, team validation, PWA install hook, realtime sync, timeout lifecycle, exclusion sync (remote add/dedup/dismiss/hydration), deleteMatch, team delete error handling (generic + FK 23503), match lifecycle (activate/finish/setResult/autoActivate), venues CRUD helpers, formatMatchDate + toDatetimeLocal (#115), homeTeamId/awayTeamId store fields + UUID→side mapping (#114), compressImage createImageBitmap path + fallback + bitmap leak + scale (#113), server clock model (clockSecondsBase + clockStartedAt): start/pause/half/timeout/reset, computeClockSeconds (paused + running), echo-prevention flag, all-roles clock sync (#123 #124), useTheme: dark default, localStorage init, toggle dark↔light, html.light class, persistence (#121), scorekeeper session storage routing (scorekeeper/viewer → sessionStorage, admin/stat_tracker → localStorage) (#125), role-based realtime filter (scorer owns score/timeout fields, all roles apply clock) (#126), sortByStartsAt (asc + nulls-last) (#118), usePwaInstall: android-tip default, desktop-tip, upgrade to android-prompt, accepted→hidden, dismissed→android-tip fallback, ios-tip, standalone-hidden (#138) |
| Component | ~373 | 373 | Interactive behavior: form validation, button state changes, CRUD flows, confirmation dialogs, role-based conditional rendering, rating editor toggle, admin override banners, timeout banner, onDismiss callback wiring, viewer remote exclusion display, admin match list + delete, squad picker, viewer shell tabs, admin shell tabs + detail hiding, viewer Partidos tab (section collapse, score display, links), tournament knockout edit button (admin/viewer gate, pre-populated form), null-safe tournament filter, screenshot input capture attribute, admin Partidos tab (3-section list with collapsible headers, activate, finish confirmation, delete, create link, expand/collapse En directo / Finalizados, date chip display, clock icon edit toggle, no-edit on finished), viewer Torneos tab (status groups, empty states, draft filtering), viewer tournament detail (not found, group rendering, no edit buttons, reverse knockout order, read-only matches, Dominicos group pinned to top, Dominicos knockout match pinned to top in semis), GamesPage date chip (shown/hidden by starts_at), TournamentPage group phase sort by starts_at + knockout sort by starts_at + MatchRow admin date edit toggle (#115 #116), Más tab (static links, install states: android-prompt / ios-tip / desktop-tip / hidden, ios modal open/close) (#138), admin Jugadores tab (empty state, create form, search by name/team, no-results), player avatar upload errors, admin Jugadores tab region field, scorekeeper claim flow + admin-override banner suppression, viewer Plantillas region accordion (auto-expand, toggle open/close, header rendering, roster-presence opacity), admin team delete server-block error, viewer player TOTY card (with/without ratings), admin venue CRUD (add/edit/delete/block), viewer venue chips + venues list, admin teams collapsible regions (expand/collapse, 'Sin región' section), admin tournaments collapsible sections (Finalizados collapsed by default), BackButton (link/button render, navigate(-1), label display), player camera hint (shows with no avatar, opens edit, hidden with avatar), group match edit (admin/viewer gate + pre-populated form, #106), knockout pairing confirmation modal (open/cancel/confirm/select/deselect/swap-within/swap-across, #111), tournament attribute edit (inline form, warning on started, save/cancel, #107), TournamentPage Dominicos group pinning + knockout pinning (#110), permanent scorekeeper status widget (4 states: viewer Ser-anotador / claimed-name / claimed-no-name / operator-disponible, hidden-finished), claim flow (modal open, submit, reject error, operator-no-button) (#123), MatchesTab (section default-open, live score + link, finished expand, scheduled no-link/score, empty state, tappable link, toggle open/close) (#120), Más tab cache clear (button, dialog open, cancel, confirm clears localStorage + navigates) (#119), theme toggle (dark/light button labels, toggle callback) (#121), admin team edit save button (stays enabled after category/gender change, region optional on edit) (#112), viewer tournament Clock chip + sortByStartsAt knockout sort (#118), MatchesTab gender chips (always visible, filter hides non-matching, empty state) + tournament dropdown (hidden for single tournament, shown for multiple) (#122), Scoreboard release role button (visibility, hidden-finished, toast on press, non-admin hidden) (#129), Más tab font size picker (3 options, aria-pressed state, localStorage persistence) (#131), BracketView knockout ordering + venue chips + not-played dimming/strikethrough (#133 #130), TournamentPage not-played toggle (admin/viewer gate, markNotPlayed callback) (#130), BracketView knockout admin editing (pencil button, score entry, downstream warning, venue select, datetime edit) (#132), TournamentPage close/reopen (button visibility, store callbacks, Finalizado badge in admin + viewer) (#134), GamesPage sort order (chronological + nulls-last) (#136) |
| Smoke E2E | 24 | 24 | Every page renders without console errors — viewer tabs, admin tabs, detail pages incl. tournament detail not-found (Desktop only) |
| Regression E2E | 9 | 18 | Golden paths: match lifecycle, cancel, timeout/exclusion, reset score, navigation, form validation, help page (Mobile + Desktop) |
| Responsive E2E | 5 | 15 | Layout: no overflow, visible controls, touch targets ≥44px (Mobile + iPhone SE + Desktop) |

## CI / GitHub Actions

Every push to `feat/**` or `fix/**` branches triggers CI. Jobs run independently per sport based on which paths changed.

| Job | What it checks |
|-----|---------------|
| **Handball — build + test** | `npm ci` → `tsc + vite build` → `vitest run` → Playwright smoke |
| **Basketball — build + test** | `npm install` → `tsc + vite build` → `vitest run` (skips gracefully if no tests yet) |
| **Issue autolabeling** | On CI pass: adds `in-review`, removes `in-progress`. On CI fail: adds `needs-fix`. Issue number parsed from branch name (`feat/10-slug` → #10). |

No secrets required — `GITHUB_TOKEN` covers both code and issues (same repo).

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in Supabase credentials
cp .env.example .env

# Start dev server
npm run dev
```

## Project Structure

```
/                         # Handball app (React + Vite root)
  src/
    components/
      scoreboard/         # Clock, score panels, controls
      tournament/         # Brackets, groups
      players/            # Player cards
    hooks/                # Zustand stores, custom hooks
    lib/                  # Supabase client, offline sync, rules
    pages/                # Route pages
    types/                # TypeScript types
  tests/
    unit/                 # Store + rules unit tests
    component/            # React component tests
    integration/          # Real-DB smoke tests (run locally, not in CI)
  e2e/                    # Playwright E2E + smoke tests
  docs/
    GUIA_PADRES.md        # Spanish parent guide (printable)
  supabase/migrations/    # DB schema history

basketball/               # Basketball app (separate Vite project)
  src/
    components/
    lib/
    pages/
    types/
  docs/
    BASKETBALL_RULES.md   # Rules spec driving scoreboard logic

.github/
  workflows/
    ci.yml                # Per-sport CI + issue autolabeling on feat/** / fix/**
.claude/
  commands/               # lab-dev-session, lab-groom, lab-test-session
```

## Privacy

This app is used by minors. Strict data minimization applies:
- No full names — first name or nickname only
- No dates of birth, addresses, or contact info
- Photos are optional and admin-uploaded only
- No location tracking

## Contributing

Issues tracked at [jciveira/sports-lab](https://github.com/jciveira/sports-lab/issues). Use [Excalidraw](https://excalidraw.com) for UI mocks and attach them to GitHub Issues.

## License

MIT
