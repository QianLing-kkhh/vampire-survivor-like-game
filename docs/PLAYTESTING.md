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

## Runtime Test Settings

Settings are intended to apply immediately during a run.

- Auto Movement controls movement only. When enabled, `AutoPlayer` supplies movement direction.
- Auto Upgrade controls upgrade selection only. When enabled, the level-up panel auto-selects an upgrade.
- Fast Mode increases gameplay time scale immediately.
- Endless Mode changes the Boss-kill result rule immediately.

Current runs use `normal` difficulty with no mutators unless future test harnesses or custom content explicitly provide a different `RunRuleSet`. Difficulty and mutator IDs are recorded in CSV so future samples can be separated by ruleset.

Useful combinations:

- Manual movement + manual upgrade: both Auto Movement and Auto Upgrade off.
- Manual movement + automatic upgrade: Auto Movement off, Auto Upgrade on.
- Automatic movement + manual upgrade: Auto Movement on, Auto Upgrade off.
- Full auto test: Auto Movement on, Auto Upgrade on, Fast Mode on.

## Auto Test Mode

The Title Scene starts Auto Movement + Auto Upgrade + Fast Mode automatically after 10 seconds without input.

The Result Scene can automatically start the next run after 10 seconds.

## Auto Player Behavior

The auto player attempts to:

- Avoid nearby enemies.
- Move toward EXP gem clusters when safe.
- Prefer nearby pickups using effective pickup distance.
- Move toward treasure chests when safe.
- Stay within map boundaries.
- Adjust movement strategy based on danger level and weapon behavior.

The auto player is intended for balance testing, not perfect play.

## Auto Upgrade Selection

Auto upgrade selection uses a weighted strategy.

It attempts to:

- Preserve randomness between runs.
- Continue investing in already-developed weapons/passives.
- Prefer missing evolution requirements when a route is close to evolving.
- Avoid invalid upgrades through the filtered upgrade pool.
- Use post-cap endless rewards once normal upgrade options are exhausted.

## Normal Mode Testing

Recommended sample:

1. Clear CSV Buffer.
2. Disable Endless Mode.
3. Run Auto Movement + Auto Upgrade + Fast Mode for 50 runs.
4. Download All CSV.
5. Check victory rate, Boss dash hit rate, Boss phase damage, evolution rate, and weapon damage distribution.

Primary metrics:

- Normal victory rate
- Survival time
- Boss fight duration
- Boss phase damage taken
- Boss dash hit rate
- Evolution rate
- Treasure open count
- Death time distribution

## Endless Mode Testing

To test Endless Mode:

1. Open Settings.
2. Enable Endless Mode.
3. Use Auto Movement, Auto Upgrade, and Fast Mode for repeated runs if desired.
4. Let the run continue after the final Boss is killed.
5. Death after Endless Mode starts is recorded as an endless result rather than normal Game Over.
6. Review endless survival time and local leaderboard rank in the Result Scene.

The local endless leaderboard is scoped to the current selected character, stage, and map. Runs from other future stage/map/character combinations should not appear in the current Result Scene leaderboard.

Recommended sample:

1. Clear CSV Buffer.
2. Enable Endless Mode.
3. Run Auto Movement + Auto Upgrade + Fast Mode for 20 runs.
4. Download All CSV.
5. Check endless survival time, treasure counts, scaling level, reward counts, endless Boss counts, and leaderboard ranks.

Important endless metrics:

- `endlessSurvivalTime`
- `endlessEnemyKills`
- `endlessDamageTaken`
- `endlessTreasureDropCount`
- `endlessTreasureOpenCount`
- `endlessScalingLevel`
- `endlessHpMultiplier`
- `endlessDamageMultiplier`
- `endlessSpeedMultiplier`
- `endlessExpMultiplier`
- `endlessRewardCount`
- `endlessHealCount`
- `endlessOverdriveCount`
- `endlessGrowthCount`
- `endlessEnemySlowCount`
- `endlessShieldGained`
- `endlessShieldConsumed`
- `endlessShieldRemaining`
- `endlessShieldAbsorbedDamage`
- `endlessBossSpawnCount`
- `endlessBossKillCount`
- `maxSimultaneousEndlessBosses`
- `activeEndlessBossCountAtDeath`
- `difficultyId`
- `mutatorIds`
- `rulesetId`

## CSV Export

The Result Scene provides CSV export for balance analysis.

Current CSV behavior:

- Current run data is generated at the end of each run.
- All-run CSV data is stored in a playtest log buffer.
- The buffer is persisted to `localStorage`.
- Refreshing the page should restore existing buffered logs.
- The buffer keeps the latest 1000 runs.
- Clear CSV Buffer removes both memory and persisted logs.

If CSV schema changes, clear the buffer before comparing new results with old samples. Do not compare old and new schema rows mixed in All CSV.

## CSV Diagnostics

The CSV includes diagnostics for detecting missing or interrupted runs:

- `runIndex`
- `sessionId`
- `bufferSizeAtExport`
- `previousRunTimestamp`
- `realTimeGapSeconds`

These help distinguish between real pauses, browser reloads, buffer resets, and missing append events.

## Balance Metrics to Watch

| Metric | Typical Use |
|---|---|
| Normal victory rate | Overall non-endless difficulty |
| Survival time | When deaths happen |
| Boss fight duration | Boss phase pacing |
| Boss phase damage taken | Boss phase pressure |
| Boss dash hit rate | Dash effectiveness |
| Endless Boss count | Late endless pressure and Boss stacking |
| Endless scaling level | Enemy growth pressure |
| Leaderboard key scope | Confirms records are separated by mode/stage/map/character |
| Difficulty / ruleset ID | Confirms challenge and mutator samples are not mixed |
| Reward usage counts | Post-cap reward balance |
| Shield gained/consumed | Defensive reward strength |
| Treasure open count | Reward pacing and inflation risk |
| Weapon damage share | Weapon balance |
| Death time distribution | Whether deaths cluster too early or too late |

## Current Balance Targets

These are approximate testing targets, not strict rules:

- Normal auto-test victory rate: around 60% to 80%
- Boss dash hit rate: around 10% to 25%
- Boss fight duration: around 45 to 80 seconds
- Evolution rate: enough to appear in some runs, but not guaranteed every run
- Endless mode: should eventually kill the player through scaling, Boss pressure, and reward limits

## Manual Smoke Test

1. Start Game with Auto Movement and Auto Upgrade disabled.
2. Check keyboard, mouse, virtual joystick, pause, settings, level-up, treasure, Boss, Result, and CSV download.
3. Toggle Auto Movement, Auto Upgrade, Fast Mode, Endless Mode, audio, and language from Settings.
4. Confirm settings apply without scene restart.

## Common Interpretation Notes

- A low evolved weapon damage value does not always mean the weapon is weak. Evolution may have occurred late.
- Knife often has high total damage because it is the starting weapon and exists for the full run.
- Boss phase damage is more useful than total damage taken when judging final encounter pressure.
- Large `realTimeGapSeconds` values usually mean testing stopped, the page waited on a result screen, or the browser/session was interrupted.
- If CSV schema changes, clear the buffer before comparing results.
