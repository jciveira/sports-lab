# UI Reference — Scoreboard Inspiration

Screenshots taken from the iOS app **"Virtual Scoreboard"** on 2026-03-29.
These serve as design inspiration for HandBallLab's scoreboard UI.

## Screenshots

### scoreboard-landscape.png
Main scoreboard view (landscape). Key elements:
- **Play/Pause** button (top-left) — controls the clock
- **Red digital clock** (top-center) — MM:SS countdown, 7-segment LED style
- **Half indicator** (top-right of clock) — "1st" / "2nd"
- **Edit button** (pencil icon) and **Menu** (three dots) — top-right
- **Team names** — "Team 1" / "Team 2" in white text
- **Scores** — large green 7-segment digits, centered for each team
- **"X"** separator between scores
- **"+" buttons** — one on each side for quick score increment
- **Buzzer** and **Whistle** icons (bottom-left) — sound effects

### scoreboard-edit-mode.png
Edit mode — same layout but with dashed borders around editable fields:
- Team names become tappable/editable
- Clock becomes editable
- Half indicator becomes editable
- Checkmark button (top-right) to confirm changes

### scoreboard-menu.png
Options overlay with icon grid:
- **Exit** — leave the match
- **Edit** — enter edit mode
- **Live** — broadcast/share mode
- **Break** — half-time / break timer
- **Switch** — swap team sides
- **Font** — change score font
- **Buzzer** — toggle buzzer sound
- **Whistle** — toggle whistle sound
- **Reset** — reset match

### app-home-screen.png
App home screen showing available features:
- Sports (preset scoreboards)
- Simple Scoreboard
- Clocks and Timers
- Stats Sheet
- Coaching Board
- Live Scores
- Customize Sports

## Design Patterns to Adopt

1. **Dark theme** — high contrast, works great in sports halls
2. **Landscape mode** for active scorekeeping
3. **7-segment LED font** for scores and clock — gives authentic scoreboard feel
4. **Large touch targets** — essential for fast tapping during a game
5. **Minimal chrome** — no distractions during gameplay
6. **Sound effects** (buzzer/whistle) — fun for kids, useful for signaling
7. **Edit mode toggle** — prevents accidental changes during gameplay

## Differences for HandBallLab

- We add **exclusion tracking** (2-min penalties, up to 3 per player)
- We add **timeout tracking** (1 per half per team in youth handball)
- We separate **scorekeeper** and **stat tracker** roles
- Our viewer mode is **read-only on a different device** (not just the same phone)
- We'll add **team badges/colors** instead of just text names
