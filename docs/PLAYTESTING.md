# Playtesting Guide

This project includes built-in automated playtesting and CSV logging for balance analysis.

## Manual Test

Run the game locally:

```sh
npm run dev
```

or on Windows:

```sh
npm.cmd run dev
```

Then start a normal game from the Title Scene.

## Auto Test Mode

Auto Test Mode lets the game play itself for repeated balance testing.

Current behavior:

- The Title Scene starts Auto + Fast mode automatically after 10 seconds without input.
- The Result Scene can automatically start the next run after 10 seconds.
- Auto Mode controls player movement and upgrade selection.
- Fast Mode increases overall test speed.

## Auto Player Behavior

The auto player attempts to:

- Avoid nearby enemies.
- Move toward EXP gem clusters when safe.
- Move toward treasure chests when safe.
- Stay within map boundaries.
- Adjust movement strategy based on danger level and weapon behavior.

The auto player is intended for balance testing, not for perfect play.

## Auto Upgrade Selection

Auto upgrade selection uses a weighted strategy.

It attempts to:

- Preserve randomness between runs.
- Continue investing in already-developed weapons/passives.
- Prefer missing evolution requirements when a route is close to evolving.
- Avoid invalid upgrades through the filtered upgrade pool.

This allows different runs to develop different builds while still giving weapon evolution a reasonable chance to appear.

## CSV Export

The Result Scene provides CSV export for balance analysis.

Current CSV behavior:

- Current run data is generated at the end of each run.
- All-run CSV data is stored in a playtest log buffer.
- The buffer is persisted to `localStorage`.
- Refreshing the page should restore existing buffered logs.
- The buffer keeps the latest 1000 runs.
- Clear CSV Buffer removes both memory and persisted logs.

## CSV Diagnostics

The CSV includes diagnostics for detecting missing or interrupted runs:

- `runIndex`
- `sessionId`
- `bufferSizeAtExport`
- `previousRunTimestamp`
- `realTimeGapSeconds`

These help distinguish between:

- Real gaps where the test was stopped.
- Browser reloads.
- Buffer resets.
- Missing append events.

## Main CSV Data Groups

The CSV records data including:

- Result type
- Survival time
- Final level and EXP
- Kill count
- Weapons owned
- Passives owned
- Upgrade path
- Treasure drops and opened chests
- Weapon evolution path
- Weapon damage, hit, and kill stats
- Boss spawn, kill, and fight duration
- Boss dash count and hit count
- Boss phase damage and kills
- Auto mode and fast mode settings

## Balance Metrics to Watch

Useful high-level metrics:

| Metric | Typical Use |
|---|---|
| Victory rate | Overall difficulty |
| Survival time | When deaths happen |
| Boss fight duration | Boss phase pacing |
| Boss phase damage taken | Boss phase pressure |
| Boss dash hit rate | Boss dash effectiveness |
| Evolution rate | Whether evolution appears often enough |
| Weapon damage share | Weapon balance |
| Treasure open count | Reward pacing |
| Final level | Progression speed |

## Current Balance Targets

These are approximate testing targets, not strict rules:

- Victory rate: around 60% to 80% for auto tests
- Boss dash hit rate: around 10% to 25%
- Boss fight duration: around 45 to 80 seconds
- Evolution rate: enough to appear in some runs, but not guaranteed every run

## Common Interpretation Notes

- A low evolved weapon damage value does not always mean the weapon is weak. Evolution may have occurred late.
- Knife often has high total damage because it is the starting weapon and exists for the full run.
- Boss phase damage is more useful than total damage taken when judging final encounter pressure.
- Large `realTimeGapSeconds` values usually mean testing stopped, the page waited on a result screen, or the browser/session was interrupted.

## Recommended Test Procedure

For balance testing:

1. Clear CSV Buffer if you want a clean sample.
2. Start Auto + Fast Mode.
3. Let the game run for at least 20 runs.
4. Download All CSV.
5. Check victory rate, Boss stats, evolution stats, and weapon damage distribution.
6. Change only one balance area at a time.
7. Repeat the test.
