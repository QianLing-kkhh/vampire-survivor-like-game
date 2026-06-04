# Endless Mode

Endless Mode is an optional post-Boss mode intended for long-run survival and leaderboard testing.

## Overview

When Endless Mode is enabled, defeating the final Boss does not immediately end the run. Instead, the run continues into a scaling enemy pressure phase. The player eventually dies, and that death is treated as the endless result.

## How It Starts

1. Enable Endless Mode in Settings.
2. Start a run.
3. Survive until the final Boss appears.
4. Kill the final Boss.
5. `RunState.startEndless()` records the endless start time.
6. `EndlessManager.start()` begins endless spawning.

If Endless Mode is disabled, killing the final Boss immediately produces a normal Victory.

## Result Rule

- Before endless starts, player death is Game Over.
- After endless starts, player death is treated as a Victory-style endless result.
- Result data records both total survival time and `endlessSurvivalTime`.

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

Scaling increases every 60 seconds. HP and damage are the main pressure sources. Speed scaling is capped so enemies do not become instantly uncontrollable.

Ordinary pre-Boss and Boss-phase enemies are not changed by this endless scaling path.

## Post-Cap Rewards

When normal upgrades are exhausted during Endless Mode, `UpgradeFlow` uses `EndlessRewardManager` to provide endless rewards.

### Emergency Heal

- Restores HP.
- Does not exceed max HP.
- Intended for crisis recovery.

### Overdrive

- Temporary weapon damage burst.
- Non-stacking.
- Has duration and cooldown.
- Intended to clear pressure spikes, not become permanent damage.

### Time Slow

- Temporarily slows non-Boss enemy movement through a global enemy speed multiplier.
- Does not affect Boss Dash.
- Has duration and cooldown.
- Intended for escape, repositioning, and risky pickups.

### Shield

- Grants one shield stack.
- Shield stacks absorb incoming damage one hit at a time.
- Absorbed hits still trigger the damage reaction burst and contact cooldown.
- Shield has a stack cap.

### Minor Growth

- Adds a very small permanent weapon damage multiplier.
- Intended to keep long-run rewards meaningful without recreating runaway scaling too quickly.

Reward values are exposed through `EndlessRewardManager.getRewardConfig()`.

## Treasure Chests in Endless

Treasure chests still use `UpgradeFlow`.

Order:

1. Try treasure-triggered evolution if available.
2. Try a normal filtered chest upgrade.
3. If no normal reward is available and endless has started, grant an endless reward.
4. If no reward can be applied, return `none` safely.

Endless treasure drops and opens are tracked separately by `RunState`.

## Local Leaderboard

`EndlessLeaderboard` stores local top-10 entries in `localStorage`.

Entries include:

- Timestamp
- Endless survival time
- Total survival time
- Final level
- Kill count
- Weapon IDs
- Passive items
- Evolution path

Entries are sorted by endless survival time.

## Known Balance Notes

- Endless treasure density needs continued monitoring.
- Overdrive should remain a burst option, not a permanent +damage state.
- Shield stack cap may need tuning.
- Time Slow should create escape windows without becoming permanent crowd control.
- Death Spiral and other high-density evolved weapons need monitoring in long runs.
- Minor Growth should stay small enough to avoid replacing enemy scaling pressure.
