# Handball Rules — HandBallLab Reference

> These rules drive the app's scoreboard logic. Simplified for youth handball (U12/U14).
> Edit this file as league-specific rules are confirmed.

## Game Structure

| Setting | Value | Notes |
|---|---|---|
| Halves | 2 | |
| Half duration | 20 min | U12 common; U14 may use 25 min. Configurable in app. |
| Half-time break | 5–10 min | Clock stops, app shows "Half-Time" |
| Players on court | 7 | 6 field + 1 GK |
| Squad size | Up to 14 | Substitutions unlimited, on the fly |

## Scoring

- **1 goal = 1 point** (no 2-pointers, no bonus)
- Goal counts when the entire ball crosses the goal line
- After a goal: restart from center by the team that conceded

## Clock

- Runs continuously (counts up from 00:00)
- Stops only for: timeouts, injuries, referee decision
- In youth leagues, clock management may be relaxed — app should allow manual pause/resume

## Timeouts

| Rule | Value |
|---|---|
| Per team per half | 1 |
| Duration | 1 min |
| When | Only when your team has possession |

- Clock stops during timeout
- Timeouts reset at half-time (1 fresh timeout per team in 2nd half)

## Exclusions (Suspensions)

| Rule | Value |
|---|---|
| Duration | 2 min |
| Max per player | 3 (third = red card / disqualification) |
| Effect | Team plays with one fewer player during exclusion |

- Multiple players can be excluded simultaneously
- Exclusion timer counts down from 2:00
- When timer expires, excluded player (or substitute) may re-enter
- App tracks: which team, start time, countdown, total per player (if stat tracker tags it)

## Cards

| Card | Meaning | App action |
|---|---|---|
| Yellow | Warning | Log event (informational only, no time penalty) |
| 2-min | Exclusion | Start 2-min countdown, reduce team count |
| Red | Disqualification | Player out for rest of match, team short for 2 min |
| Blue | Report to federation | Same as red in-game; post-game consequence |

> For MVP: track **2-min exclusions** only. Yellow/Red/Blue are future enhancements.

## Substitutions

- Unlimited, on the fly (no stoppage needed)
- Must enter/exit through own substitution zone
- **Not tracked in MVP** — future enhancement for stat tracker

## Positions (for Player Cards)

| Code | Position |
|---|---|
| GK | Goalkeeper |
| LW | Left Wing |
| RW | Right Wing |
| LB | Left Back |
| RB | Right Back |
| CB | Center Back (Playmaker) |
| PV | Pivot (Line Player) |

## Match Result

- Team with more goals wins
- If tied at full-time:
  - **League**: draw stands (1 point each)
  - **Tournament knockouts**: extra time or penalty shootout (league-dependent)

> For MVP: app marks "Finished" and shows final score. Tie-breaking rules are configurable later.

## Common Handball Stats

| Stat | Description | Who tracks |
|---|---|---|
| Goals | Goals scored | Scorekeeper (team) + Stat tracker (player) |
| Assists | Pass leading to goal | Stat tracker |
| Saves | GK saves | Stat tracker |
| Exclusions | 2-min suspensions received | Scorekeeper (team) + Stat tracker (player) |
| Turnovers | Ball lost to opponent | Stat tracker (future) |
| Steals | Ball won from opponent | Stat tracker (future) |
| Shots | Total shot attempts | Stat tracker (future) |
| Blocks | Shots blocked by defender | Stat tracker (future) |

> MVP tracks: Goals, Assists, Saves, Exclusions. Others are future.

---

## App Defaults (Configurable)

These are the default values used in the app. Admin can override per tournament/match.

```
HALF_DURATION_MINUTES=20
HALVES=2
TIMEOUTS_PER_HALF=1
TIMEOUT_DURATION_SECONDS=60
EXCLUSION_DURATION_SECONDS=120
MAX_EXCLUSIONS_PER_PLAYER=3
PLAYERS_ON_COURT=7
MAX_SQUAD_SIZE=14
```
