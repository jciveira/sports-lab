# HandBallLab — App Redesign

Design document for the admin shell (#66) and viewer shell (#67) redesign.
This is the source of truth for devs picking up redesign tickets.

> **Test session** updates production-facing docs (README, ARCHITECTURE.md, GUIA_PADRES.md, HelpPage.tsx) as features land. This doc captures vision and design decisions.

## Why

The app grew organically: standalone pages, no shared navigation, code-based match access, free-text tournament categories. It works but doesn't scale. This redesign introduces:

1. **Two shell layouts** — viewer (default, read-only) and admin (PIN-gated, full CRUD)
2. **Match lifecycle** — explicit scheduled → live → finished flow
3. **First-come-first-served scorekeeper** — no more access codes
4. **Structured team/tournament categorization** — dropdowns for age group + gender

---

## App Structure

```
App opens
  │
  ▼
Viewer Shell (default, no auth)
  ├─ Partidos    — watch live matches
  ├─ Torneos     — browse tournaments
  ├─ Plantillas  — browse teams + player cards
  └─ Más         — utilities + "Administración" link
                          │
                     PIN gate
                          │
                          ▼
                   Admin Shell
                     ├─ Partidos    — create, activate, finish, delete matches
                     ├─ Torneos     — create, manage tournaments
                     ├─ Equipos     — manage teams, rosters, categoría/género
                     └─ Jugadores   — manage all players
```

---

## Viewer Shell

The default experience. No authentication. Bottom tab bar with 4 tabs.

### Partidos tab
- Matches grouped in 3 sections: **En directo** / **Programados** / **Finalizados**
- En directo expanded by default
- Tap match → viewer scoreboard (read-only)
- Inside a live match: "Ser anotador" button to claim scorekeeper role

### Torneos tab
- Tournaments grouped: **En curso** / **Próximos** / **Finalizados**
- Tap tournament → detail page
- **Rounds in reverse chronological order**: Finals at top → Semis → Quarters → Groups at bottom
- **Pure read-only** — no "Generar cruces", no edit actions

### Plantillas tab
- Team grid (badge + name + categoría + género)
- Tap team → roster grid (player cards)
- Tap player → FIFA-style player card (#61)
- Browse-only, no CRUD

### Más tab
- Marcador rápido (local-only scoreboard)
- Guía para padres
- Sugerencias
- Instalar app (conditional, only when PWA not installed)
- **Administración** → PIN gate → switches to admin shell

---

## Admin Shell

Behind PIN gate (#65). Bottom tab bar with 4 tabs. Accessed from viewer's Más tab.

### Partidos tab
- Same 3-section grouping as viewer (En directo / Programados / Finalizados)
- **"Crear partido"** button at top → creates match as `scheduled`, immediately visible in Game Center
- Actions per match:
  - Scheduled: Activar, Editar, Eliminar
  - Live: Finalizar, Abrir marcador (admin scoreboard)
  - Finished: Eliminar
- Admin can always finish any match (safety net for scorekeeper abandonment)

### Torneos tab
- Same 3-section grouping
- **"Crear torneo"** button at top
- Create flow: name → categoría dropdown → género dropdown → team picker (filtered by category/gender) → group assignment → confirm
- Tournament card displays: "Torneo Primavera — Alevín Masculino"

### Equipos tab
- **Card grid** layout (2 cols mobile, 3+ wider)
- Dominicos teams pinned at top
- **Visual cue**: teams with roster = full opacity, without = translucent/dimmed
- Each card: badge + name + categoría + género
- Tap team → team detail + roster (player grid)
- Full CRUD: add, edit, delete teams
- Categoría and género as fixed dropdowns on add/edit

### Jugadores tab
- Flat list of all players across all teams
- Full CRUD: add, edit, delete
- Tap player → player profile card
- "Salir de admin" option to return to viewer shell

---

## Match Lifecycle

```
scheduled ──────→ live ──────→ finished
    │                              ▲
    └──────────────────────────────┘
         Flow A: direct result entry
```

### Flow A — Remote games (no scorekeeper)
Tournament games the admin doesn't attend. Admin enters final score directly.
- Create → `scheduled`
- Enter score + mark done → `finished`
- Never goes `live`, no scorekeeper needed

### Flow B — Live games (scorekeeper present)
Games at the venue with realtime scorekeeping.
- Create → `scheduled`
- Activate → `live` (two methods):
  - **Manual**: admin taps "Activar" in admin Partidos tab
  - **Auto**: optional `starts_at` datetime — match transitions to `live` 30 min before
- Scorekeeper claims role → runs the scoreboard
- End match → `finished` (scorekeeper or admin)

### Who can finish a match?
- **Scorekeeper** — taps "Finalizar partido" (normal flow)
- **Admin** — can finish any match from admin Partidos tab (backup)
- Clock and score persist through all transitions

---

## Scorekeeper Access Model

Replaces the current code-based system (operator codes, `/join` page).

### How it works
1. Match goes `live` (admin activates it)
2. Viewers see the match in Game Center with **"Ser anotador"** button
3. First viewer to tap enters a **display name** (free text, e.g., "Papá de Mateo") and claims the role
4. Scorekeeper gets full controls (score, clock, exclusions, timeouts)
5. All viewers see **"Anotado por [nombre]"** — subtle badge

### Release and handover
- Scorekeeper can tap **"Dejar de anotar"** → role frees up, controls revert to viewer mode
- **Timeout**: if scorekeeper inactive for 2+ minutes, role auto-releases
- Clock and score **persist** during handover — clock keeps ticking
- Another viewer can then claim the role

### Admin override
- Admin can always **force-claim** scorekeeper (bypasses "already claimed" check)
- Uses PIN-authenticated session as identity

### Technical approach
- Scorekeeper state on match row or separate presence: `{ user_name, claimed_at, last_active_at }`
- Heartbeat every ~30s to reset `last_active_at`
- Any client checks `last_active_at > 2 min ago` → role is free
- Realtime subscription so viewers see claim/release instantly
- Consider Supabase Realtime Presence as alternative to DB polling

---

## Categoría + Género

Structured dropdowns on both teams and tournaments.

### Values
| Field | Options |
|-------|---------|
| Categoría | Benjamín, Alevín, Infantil, Cadete, Juvenil, Senior |
| Género | Masculino, Femenino, Mixto |

### Rules
- **Teams**: category + gender set on creation/edit (nullable for existing teams)
- **Tournaments**: category + gender set on creation — **acts as a filter**
- Team picker in tournament creation only shows teams matching the tournament's category + gender
- Mismatches are impossible by design (no validation needed)
- Tournament cards display the structured label: "Torneo Primavera — Alevín Masculino"

### Migration
- New columns on `teams`: `category text`, `gender text` (both nullable)
- New columns on `tournaments`: `category text`, `gender text` (both nullable)
- Existing data unaffected — nullable columns, no breaking change
- Free-text `tournament_categories.name` kept for backward compat, deprecated for new tournaments

---

## Critical Path

```
#68 [A1] DB migration
     │
     ├──→ #69 [A2] Viewer shell layout ──┐
     │                                    │
     └──→ #70 [A3] Admin shell layout ──┐│
                                        ││
            #71 [B4] Match lifecycle ◄──┘│
                     │                    │
     ┌───────────────┤                    │
     │               │                    │
     ▼               ▼                    │
#73 [B6]        #72 [B5]                 │
Admin Partidos  Viewer Partidos           │
     │               │                    │
     └───────┬───────┘                    │
             │                            │
             ▼                            │
     #80 [D13] Scorekeeper model          │
             │                            │
             ▼                            │
     #81 [D14] Cleanup /join              │
                                          │
Off critical path (after dependencies):   │
  #74 [B7]  Viewer Torneos      ◄────────┘
  #75 [C8]  Admin Torneos
  #76 [C9]  Admin Equipos
  #77 [C10] Viewer Plantillas
  #78 [C11] Admin Jugadores
  #79 [C12] Viewer Más
```

### Build order recommendation
1. **Phase A** (foundation): #68, #69, #70 — can parallelize shells
2. **Phase B** (core): #71, then #72 + #73 in parallel. #74 anytime after #69.
3. **Phase C** (complete tabs): #75-#79 — all parallelizable after their shell lands
4. **Phase D** (scorekeeper): #80 after B is done, then #81 cleanup

---

## What this doc does NOT cover
- Implementation details (component structure, state management) — devs decide per ticket
- Test strategy — see `TESTING.md`
- Deployment — Vercel auto-deploys from personal repo mirror
- Privacy rules — see `ARCHITECTURE.md` (unchanged)
