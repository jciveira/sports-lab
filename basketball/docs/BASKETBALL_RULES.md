# Basketball Rules — BasketballLab Reference

> **Reviewed & locked for Phase 1 development (2026-04-27).**
> Team foul bonus threshold resolved: **5 fouls per quarter** (not 7 per half).
> Per-quarter tracking is simpler and matches the epic design for youth/school basketball.
> No further rule changes without a new review pass.

> These rules drive the app's scoreboard logic. Simplified for youth basketball (U12/U14).
> Edit this file as league-specific rules are confirmed.

## Game Structure

| Setting | Value | Notes |
|---|---|---|
| Quarters | 4 | |
| Quarter duration | 8 min | U12 common; U14 may use 10 min. Configurable in app. |
| Halftime break | 10 min | After Q2 |
| Quarter break | 2 min | Between Q1/Q2 and Q3/Q4 |
| Players on court | 5 | |
| Squad size | Up to 12 | |

## Scoring

| Shot | Points |
|---|---|
| Inside arc (2-pointer) | 2 |
| Outside arc (3-pointer) | 3 |
| Free throw | 1 |

> For MVP: admin inputs +1/+2/+3 manually — no shot-tracking from court zones.

## Clock

- Counts down from quarter duration to 00:00
- Stops for: free throws, fouls, timeouts, out-of-bounds, referee decision
- App allows manual pause/resume

## Timeouts

| Rule | Value |
|---|---|
| Full timeouts per team | 2 per half (reset at halftime) |
| Duration | 1 min |

- Clock stops during timeout

## Fouls

| Rule | Value |
|---|---|
| Personal fouls before fouling out | 5 (youth) |
| Team fouls before bonus free throws | 5 per quarter (bonus free throws triggered) |
| Flagrant / technical | Tracked as events (informational) |

> For MVP: track team foul count per quarter. Individual foul tracking is phase 2.

## Free Throws

- Awarded when fouled in the act of shooting (2 or 3 FTs) or when in bonus
- Missed FTs can lead to offensive rebound — app does not auto-model this

## Overtime

- If tied at end of Q4: 3-minute overtime period(s) until a team leads at the end
- Each OT: 1 timeout per team

> For MVP: app marks "Finished" and shows final score. OT is a manual extension — admin adds OT period.

## Common Basketball Stats

| Stat | Description | Who tracks |
|---|---|---|
| Points | Goals scored (2/3/FT) | Scorekeeper |
| Fouls | Personal fouls per player | Scorekeeper (team count) + Stat tracker (player) |
| Rebounds | Offensive + defensive | Stat tracker (future) |
| Assists | Pass leading to score | Stat tracker (future) |
| Blocks | Shots blocked | Stat tracker (future) |
| Steals | Ball recovered | Stat tracker (future) |
| Turnovers | Ball lost | Stat tracker (future) |

> MVP tracks: Points (team total), Team fouls.

## Positions (for Player Cards)

| Code | Position |
|---|---|
| PG | Point Guard |
| SG | Shooting Guard |
| SF | Small Forward |
| PF | Power Forward |
| C | Center |

---

## App Defaults (Configurable)

```
QUARTER_DURATION_MINUTES=8
QUARTERS=4
HALFTIME_BREAK_MINUTES=10
QUARTER_BREAK_MINUTES=2
FULL_TIMEOUTS_PER_HALF=2
TIMEOUT_DURATION_SECONDS=60
PERSONAL_FOULS_BEFORE_FOULOUT=5
TEAM_FOULS_BEFORE_BONUS=5
TEAM_FOULS_BONUS_SCOPE=quarter
OVERTIME_DURATION_MINUTES=3
OVERTIME_TIMEOUTS=1
PLAYERS_ON_COURT=5
MAX_SQUAD_SIZE=12
```
