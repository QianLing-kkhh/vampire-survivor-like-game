# Endless Mode

Endless Mode is an optional post-Boss mode intended for long-run survival, scaling pressure, and leaderboard testing.

## Overview

When Endless Mode is enabled, defeating the final Boss does not immediately end the run. Instead, the run continues into a scaling enemy pressure phase. The player eventually dies, and that death is treated as the endless result.

If Endless Mode is disabled, killing the final Boss immediately produces a normal Victory.

## How It Starts

1. Enable Endless Mode in Settings.
2. Start a run.
3. Survive until the final Boss appears.
4. Kill the final Boss.
5. `RunState.startEndless()` records the endless start time.
6. `EndlessManager.start()` begins endless spawning.
7. `EndlessBossManager` begins post-Boss endless Boss scheduling.

## Result Rule

- Before endless starts, player death is Game Over.
- After endless starts, player death is treated as a Victory-style endless result.
- Result data records total survival time and `endlessSurvivalTime`.

## Enemy Quantity Scaling

`EndlessManager` uses tiered spawn rules based on endless time.

The current design uses small recurring batches instead of single large bursts. Later tiers spawn more enemies more frequently and include more golems.

A soft enemy cap prevents unlimited enemy creation.

## Enemy Stat Scaling

Only enemies spawned by Endless Mode receive scaled stats.

`EndlessManager.getEnemyScale(endlessTimeSeconds)` returns:

- `scalingLevel`
- `hpMultiplier`
- `damageMultiplier`
- `speedMultiplier`
- `expMultiplier`

HP and damage are the main pressure sources. Speed scaling is capped so enemies do not become instantly uncontrollable. Ordinary pre-Boss and Boss-phase enemies are not changed by this endless scaling path.

## Endless Bosses

`EndlessBossManager` adds rotating random Boss pressure after endless starts.

Current goals:

- No artificial endless time cap.
- Boss spawn intervals shrink as endless time increases.
- Boss lifecycle is managed by `EndlessBossManager`.
- Multiple endless Bosses can be active at the same time.
- Existing active Bosses do not pause the next Boss spawn countdown.
- A soft active Boss cap protects performance; it delays retries rather than ending endless pressure.
- Concrete skills are created through `BossSkillFactory` from `bosses.json` skill configs.
- Bosses use scaled stats at spawn time.

Implemented endless Boss roles include:

- Berserker
- Summoner
- Freezer
- Sniper
- Tanker

Boss pressure should come from varied data-driven skills, not unavoidable instant kills.
If player damage falls behind, active Bosses are allowed to stack naturally and become part of the late endless pressure curve.

## Post-Cap Rewards

When normal upgrades are exhausted during Endless Mode, `UpgradeFlow` uses `EndlessRewardManager` to provide endless rewards.

### Emergency Heal

Restores HP without exceeding max HP. Intended for crisis recovery.

### Overdrive

Temporary weapon damage burst. It is non-stacking and has cooldown. It should clear pressure spikes, not become permanent damage.

### Time Slow

Temporarily slows non-Boss enemy movement through a global enemy speed multiplier. It does not affect Boss Dash. Intended for escape, repositioning, and risky pickups.

### Shield

Grants shield stacks. Each stack absorbs one incoming hit. Absorbed hits still trigger damage reaction burst and contact cooldown. Shield has a stack cap.

### Minor Growth

Adds a very small permanent weapon damage multiplier. Intended to keep long-run rewards meaningful without replacing enemy scaling pressure.

Reward values should be read from `EndlessRewardManager` config/getters rather than hardcoded in UI/help text.

## Treasure Chests in Endless

Treasure chests still use `UpgradeFlow`.

Order:

1. Try treasure-triggered evolution if available.
2. Try a normal filtered chest upgrade.
3. If no normal reward is available and endless has started, grant an endless reward.
4. If no reward can be applied, return `none` safely.

Endless treasure drops and opens are tracked separately by `RunState`.

## Local Leaderboard

`EndlessLeaderboard` is now a compatibility facade over the leaderboard key system.

Current endless records are stored through `SaveManager.records.leaderboardsByKey` and are scoped by:

- `mode=endless`
- selected character ID
- selected stage ID
- selected map ID

Entries include timestamp, endless survival time, total survival time, final level, kill count, weapon IDs, passive items, and evolution path.

Future leaderboard dimensions are reserved in `LeaderboardKey`, including difficulty, seed, challenge ID, custom stage ID, and ruleset ID.

## Known Balance Notes

- Endless treasure density needs continued monitoring.
- Overdrive should remain a burst option, not a permanent damage state.
- Shield stack cap may need tuning.
- Time Slow should create escape windows without becoming permanent crowd control.
- Death Spiral and other high-density evolved weapons need monitoring in long runs.
- Minor Growth should stay small enough to avoid replacing enemy scaling pressure.
- Enemy scaling curve should pressure late-game builds without causing instant unavoidable deaths.
- Endless Boss stacking pressure should grow naturally when output is insufficient.
