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

Each run also records a `runSeed`. If `SelectionState.seed` is empty, a new seed is generated for the run. A fixed seed is a foundation for debugging and future daily challenges, but it is not a complete replay by itself; version, content, settings, timing, and player input also matter.

Each run records a metadata snapshot: `runSeed`, `gameVersion`, `contentHash`, schema versions, character/stage/map IDs, difficulty/ruleset IDs, optional custom/challenge IDs, optional fixed seed, and leaderboard key. CSV, replay records, local leaderboard records, and ResultScene summaries should use this same snapshot rather than rereading current selection state at run end.

Daily Challenge has a minimal Title entry. `DailyChallengeGenerator` produces stable local-date `daily:YYYY-MM-DD` seeds, and `DailyChallengeScene` can activate today's challenge through `ChallengeManager` before starting `GameScene`.

The runtime also creates a per-run `GameEventBus` and bounded `GameEventRecorder`. This records recent high-value events for debugging foundations, but it is not exported as a full CSV timeline and is not a complete replay.

The runtime also creates a `ReplayRecorder`. Current replay records include run metadata, selection snapshot, settings snapshot, selected key events, and run result summary. Input samples are reserved but not populated until an input mapping layer exists.

Developer DebugPanel foundation is available for local diagnostics. It is disabled by default and can be toggled with F3 through `DeveloperSettings.showDebugPanel`. It shows compact run/version/seed/content, selected stage/map/character, FPS, real delta, configured/effective time scale, measured game seconds per real second, enemy/pickup/projectile/Boss/floating text counts, endless state, CSV buffer size, and recent event count without changing gameplay.

Performance profiling foundation is available through `PerformanceMonitor`, `PoolManager`, and DebugPanel stats. Current pooled object coverage is intentionally narrow: floating combat text is pooled, while enemies, projectiles, pickups, treasure chests, and Boss skill graphics still use their existing create/destroy paths. This keeps gameplay behavior stable while exposing late-endless object pressure for future profiling. Runtime time scale is applied through the gameplay delta path; Phaser scene and physics clocks are kept at 1x so Fast Mode does not double-scale timers.

Playtest scenario runner foundation exists under `src/playtest/`. It defines scenario data, a queue, built-in scenario presets, and a runner shell for future batches across character, stage, difficulty, seed, mutator, and Endless combinations. It is inactive by default and does not change the current Title Scene Auto Test or Result Scene auto-restart behavior.

Maintenance/audit command tooling is not currently a runtime feature. Architecture audits should rely on TypeScript/build validation, targeted repository scans, and documentation synchronization until a dedicated maintenance command layer exists.

Useful combinations:

- Manual movement + manual upgrade: both Auto Movement and Auto Upgrade off.
- Manual movement + automatic upgrade: Auto Movement off, Auto Upgrade on.
- Automatic movement + manual upgrade: Auto Movement on, Auto Upgrade off.
- Full auto test: Auto Movement on, Auto Upgrade on, Fast Mode on.

## Auto Test Mode

The Title Scene starts Auto Movement + Auto Upgrade + Fast Mode automatically after 10 seconds without input.

The Result Scene can automatically start the next run after 10 seconds.

Current Auto Test is still the legacy single-mode flow. Future scenario batches should route through `PlaytestScenarioRunner` so CSV, replay, leaderboard, seed, and selection metadata can be grouped by scenario.

Character selection can be set to `random_unlocked`. In that mode each new run resolves one real unlocked character from the run seed, including ResultScene Restart and Auto Restart. This is useful for long automatic batches that compare Assassin, Witch, Priest, and Warrior without manually changing selection between runs.

Stage selection can be set to `random_unlocked_stage`. In that mode each new run resolves one real unlocked built-in stage from the run seed, including ResultScene Restart and Auto Restart. This is useful for long automatic batches that compare Prototype Field, Graveyard Night, and future unlocked stages without manually changing selection between runs.

## Auto Player Behavior

Auto Movement uses a candidate-direction scoring strategy. Each update compares several possible movement directions and chooses the one that best balances survival, collection value, weapon positioning, map navigation, and the current character state.

The auto player attempts to:

- Avoid enemy pressure, with Boss-like enemies treated as more dangerous than ordinary enemies.
- Weigh enemy pressure by distance, direction, enemy strength, and the player's current HP state.
- Prefer treasure chests over ordinary pickups when the route is safe enough.
- Prefer nearby pickups using effective pickup distance, where pickup range reduces the distance that still needs to be traveled.
- Prefer dense pickup clusters over isolated pickups when safety is comparable.
- Avoid chasing dangerous pickups while low on HP.
- Use weapon characteristics to choose positioning: projectile weapons favor spacing and lateral movement, aura weapons can tolerate closer spacing when safe, orbit weapons favor circling enemy edges, and homing or magic weapons allow more survival-focused movement.
- Increase the influence of a weapon's movement preference as that weapon route becomes more developed.
- Use character context, including damage reaction identity, current HP, movement speed, pickup range, and level-scaled base stats.
- Treat low HP as a reason to prioritize survival, safe routes, and boundary safety over risky collection.
- Use map mechanics when choosing routes, including obstacles, slow zones, and portals.
- Route around blocking obstacles when a valuable pickup or treasure chest is on the other side instead of repeatedly moving into the obstacle.
- Approach border-adjacent high-value pickups from a safer interior point when possible, instead of oscillating between chasing the pickup and being pushed away from the boundary.
- Consider portals only when the destination is safer or strategically useful.
- Use slow zones cautiously when they slow the player, and more favorably when they help kite enemies.
- Stay within map boundaries without letting boundary correction override every valuable pickup decision.

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
- `runSeed`
- `gameVersion`
- `contentHash`
- `csvSchemaVersion`
- `characterId`
- `selectedStageId`
- `stageSelectionMode`
- `stageId`
- `mapId`
- `customStageId`
- `challengeId`
- `leaderboardKey`

## CSV Export

The Result Scene provides CSV export for balance analysis.

Current CSV behavior:

- Current run data is generated at the end of each run.
- All-run CSV data is stored in a playtest log buffer.
- The buffer is persisted to `localStorage`.
- Entering the Title Scene clears the current playtest buffer, including after a page refresh.
- Rows with a different `csvSchemaVersion` or `contentHash` are not mixed into the current buffer.
- Rows with a different `gameVersion` are also treated as a new batch.
- The buffer keeps the latest 1000 runs.
- Clear CSV Buffer removes both memory and persisted logs.

If CSV schema, content hash, or game version changes, keep samples separate. Do not compare old and new schema/content/version rows mixed in All CSV.

CSV, replay, leaderboard, and ResultScene data should continue to use the same `RunMetadata` snapshot captured at run start. Do not rebuild these fields from current selection state at run end.

Character metadata uses two fields: `selectedCharacterId` is the saved selection and may be `random_unlocked`, while `characterId` is the real character resolved for that run. `characterSelectionMode` is `fixed` for concrete characters and `random_unlocked` for random rotation. Balance analysis should group per-character performance by `characterId`.

Stage metadata follows the same split: `selectedStageId` is the saved selection and may be `random_unlocked_stage`, while `stageId` and `mapId` are the real resolved stage and map used for that run. `stageSelectionMode` is `fixed` for concrete stages and `random_unlocked` for random stage rotation. Balance analysis should group per-stage performance by the actual `stageId` and `mapId`.

CSV metadata fields are intentionally broader than the systems currently active. In addition to core run metadata, rows include `autoMovement`, `autoUpgrade`, `replayId`, custom stage schema/content metadata, challenge type/date, and reserved summary fields such as `relicIds`, `activeSkillIds`, `activeSkillUseStats`, `enemyModifierSpawnStats`, `enemyModifierKillStats`, `weaponTagDamageStats`, `weaponTagKillStats`, `achievementUnlockCount`, and `tutorialShownCount`.

Empty CSV fields mean the system was not enabled for that run, is not applicable, or has not been connected to CSV summaries yet. Future systems should fill these summary fields using compact formats such as `id|id|id` or `key:value|key:value`; do not store full Replay, SaveData, CustomStagePackage, or raw JSON payloads in Playtest CSV rows.

## CSV Balance Analyzer

Use the offline CSV analyzer for quick balance summaries:

```sh
npm.cmd run analyze:csv -- path/to/playtest.csv
```

The analyzer reads a PlaytestLog CSV file and prints a Markdown report with:

- total runs, Victory/GameOver counts, and victory rate;
- average survival time and death time buckets;
- Boss spawn/kill rate, Boss dash hit rate, and Boss phase damage;
- average final level, kills, treasure drops/opens, and evolution rate;
- Endless entry rate, average/max endless survival, reward usage, and level interval;
- weapon damage share when `weaponDamageStats` exists;
- schema/content-hash groups and warnings for mixed samples.

The tool is read-only. It does not modify CSV files, change CSV schema, or propose aggressive balance changes. Missing fields are skipped rather than treated as errors so older CSV files remain analyzable.

## CSV Diagnostics

The CSV includes diagnostics for detecting missing or interrupted runs:

- `runIndex`
- `sessionId`
- `bufferSizeAtExport`
- `previousRunTimestamp`
- `realTimeGapSeconds`

These help distinguish between real pauses, browser reloads, buffer resets, and missing append events.

## Event Diagnostics

The current event architecture mirrors selected runtime events into `GameEventBus`, including run start/end, enemy kills, level-ups, treasure drop/open, upgrade selection/application, weapon evolution, endless start/rewards, and selected player damage events.

Testing notes:

- GameEvent recording should not change `RunState` counters.
- If a new listener is added, listener failures should log a warning and not interrupt gameplay.
- `GameEventRecorder` keeps only a bounded recent timeline for debugging.
- Full replay still requires seed, input samples, deterministic timing, and content/version hashes.

## Performance Diagnostics

When DebugPanel is enabled, watch:

- FPS
- Real delta in milliseconds
- Configured/effective time scale
- `gameSecondsPerRealSecond`, which should be close to 3 while Fast Mode is configured to 3x
- Active enemy count
- Active Boss count
- Active projectile count
- Active pickup/gem and chest counts
- Active floating text count
- Map mechanic visual and slow-zone counts
- Spawn accumulator and clamp count in expanded mode
- Total pooled objects
- Created / reused / destroyed pooled object counts in expanded debug mode

Performance diagnostics are not CSV fields and should not be used as balance metrics without a dedicated profiling run. In late-endless 3x testing, first confirm that `gameSecondsPerRealSecond` stays near the configured scale, then watch which object count grows: pickups, projectiles, active enemies/Bosses, floating text, tweens, timers, or map visuals. `PerformanceMonitor` prints a throttled slowdown warning when 3x runs spend more than 5 seconds below the configured performance target.

Spawn accumulators have a per-frame spawn budget so a stalled frame does not try to catch up by spawning an unbounded burst in one update. Remaining accumulator time is retained for later frames. EXP gems use a far-distance soft merge when the active pickup count grows too high; nearby or magnetizing rewards are not deleted, and merged gems preserve total EXP value.

## Replay Diagnostics

Replay foundation records are stored separately from CSV and formal save data.

Current behavior:

- `ReplayStorage` keeps the most recent 10 replay records in localStorage with memory fallback.
- Replay records use `runId` as their storage id.
- Only selected key events are recorded; high-frequency damage and weapon-hit events are intentionally skipped.
- `ReplayToolScene` is available from Title as a developer/balance tool for listing saved replays, viewing summary metadata, importing replay JSON, exporting selected replay JSON, deleting selected replay records, and checking compatibility warnings.
- Replay playback UI and deterministic input injection are not implemented yet.
- A replay is useful for debugging context, but it is not a guaranteed full reproduction until input samples and compatibility checks are complete.

## Challenge Diagnostics

Daily/seeded challenge support is currently an architecture foundation.

Current behavior:

- `DailyChallengeGenerator` returns the same challenge definition for the same date.
- Different date keys produce different `daily:{date}` seeds.
- `DailyChallengeScene` displays today's seed, character, stage, map, difficulty, mode, and rules summary.
- `Start Challenge` calls `ChallengeManager.activateChallenge(id)`, syncs challenge Endless Mode into gameplay settings, and starts `GameScene`.
- Normal Title `Start Game` clears active challenge selection so ordinary runs do not inherit the daily challenge seed.
- `ChallengeManager.clearChallenge()` clears challenge id, seed, custom stage, and ruleset selection.
- Challenge leaderboard keys should include `mode=challenge`, `challengeId`, `seed`, `difficultyId`, and `rulesetId` when future UI enables challenge results.
- No online leaderboard, daily reward flow, or complex challenge editor is implemented.

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

## Project Validation

Use `npm.cmd run validate` before release candidates or larger Codex handoffs. It runs:

- `npm.cmd exec tsc`
- `npm.cmd run build`
- `npm.cmd run validate:content`
- `npm.cmd run validate:assets`
- `npm.cmd run validate:docs`

The validation scripts are local Node tools. They do not upload data, fetch remote content, modify files, or auto-fix issues. Vite chunk-size warnings are acceptable if the build command exits successfully.

Focused checks:

- `npm.cmd run validate:content` performs JSON reference checks for built-in content.
- `npm.cmd run validate:assets` checks required asset roots and animation manifest references.
- `npm.cmd run validate:docs` checks local Markdown links in `README.md` and `docs/*.md`.

## Pre-Release Check

Use `npm.cmd run pre-release` before deployment pushes. It runs:

- `npm.cmd exec tsc`
- `npm.cmd run build`
- `npm.cmd run validate` when the script exists
- `node scripts/print-build-info.mjs`

The pre-release script does not modify files, push commits, deploy, or perform GitHub authentication. Deployment steps remain manual and are documented in [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).

## Common Interpretation Notes

- A low evolved weapon damage value does not always mean the weapon is weak. Evolution may have occurred late.
- Knife often has high total damage because it is the starting weapon and exists for the full run.
- Boss phase damage is more useful than total damage taken when judging final encounter pressure.
- Large `realTimeGapSeconds` values usually mean testing stopped, the page waited on a result screen, or the browser/session was interrupted.
- If CSV schema changes, clear the buffer before comparing results.
