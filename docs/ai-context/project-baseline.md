# vampire-survivor-like-game Project Baseline

This document is the baseline context for AI-assisted development of `QianLing-kkhh/vampire-survivor-like-game`.

Use this file as the current project state before proposing architecture changes, Codex prompts, UI changes, or bug fixes.

## Current Sprint

### P0

- Fix `SettingsMenu` scrolling or pagination so settings are not hidden behind `+N more`.
- Fix Model Scale switching crash caused by destroyed or null shadows.
- Rebuild `HelpOverlay` as a data-informed in-game encyclopedia.
- Redesign `LevelUpPanel` using the Arcane Slate UI direction.

### P1

- Add differentiated maps and stages.
- Add random stage selection using `random_unlocked_stage`.
- Run automated tests with random character and random stage combinations.
- Analyze CSV results by character, stage, map, ruleset, version, and difficulty.

### P2

- Add new Boss configuration.
- Add 3 to 5 Relics.
- Refine map mechanics.
- Build the external art import pipeline.
- Investigate and optimize late endless-mode slowdown.

## Architecture Rules

1. New gameplay randomness must use `RandomManager`. Do not use `Math.random()` for gameplay behavior.
2. Selection-layer virtual IDs such as `random_unlocked` and `random_unlocked_stage` must never be written into content JSON such as `characters.json` or `stages.json`.
3. Gameplay systems should consume content through registries or managers. Avoid direct JSON imports in new gameplay systems.
4. `visualModelScale` must only affect rendering size. It must not affect hitboxes, collision, pickup radius, weapon range, enemy AI, or boss dash logic.
5. CSV schema changes require `csvSchemaVersion` review and backward compatibility consideration.
6. Replay data, save data, CSV output, and leaderboard data must remain independent.
7. UI style changes must not affect gameplay, balance, save data, replay determinism, or CSV analytics.
8. Built-in placeholder content may remain unlocked during testing, but unlock logic should stay separate from content definitions.
9. New systems should not introduce broad empty abstractions unless they are required by immediate content or testing needs.
10. Prefer content proof, UX proof, and balance proof over additional large framework work.

## 1. Project Positioning

The project is a Vampire Survivors-like browser game built with Phaser, TypeScript, and Vite.

GitHub repository:

```text
QianLing-kkhh/vampire-survivor-like-game
```

The development focus has shifted from a single prototype toward a long-term expandable game framework supporting:

- Multiple characters
- Multiple stages and maps
- Random character selection
- Random stage selection
- Endless mode
- Custom stages
- External asset imports
- Automated testing and CSV analysis
- Long-term architecture extensibility

## 2. Current Development Principles

The project should not continue blindly adding large empty architecture.

The core architecture is already sufficient for the next stage. Development should move into **Content Proof**.

### Priority directions

1. UI stability and redesign
2. Map and stage differentiation
3. New Bosses, Relics, and map mechanics
4. Automated testing and CSV analysis
5. Fix late endless-mode performance and speed degradation

### Deferred directions

- Full Replay player
- Full Mod Loader
- Online leaderboard
- Cloud save
- Complex achievement reward UI
- Full map editor
- More abstract registry systems

## 3. Completed Important Architecture

### Save / Settings

Existing systems:

- `SaveManager`
- `SaveStorage`
- `SaveMigrator`
- `SettingsManager`
- `PlaytestSettings` compatibility facade

Settings are divided by domain:

- `settings.gameplay`
- `settings.audio`
- `settings.display`
- `settings.input`
- `settings.developer`

### Content System

Existing systems:

- `ContentRegistry`
- `ContentBootstrap`
- `ContentPack`
- `ContentValidator`
- `ContentId`

Built-in content comes from:

```text
src/data/*.json
```

New content should be read through `ContentRegistry` or managers where possible. Avoid direct JSON imports in new systems.

### Selection System

Existing systems:

- `SelectionManager`
- `SelectionState`
- `SelectionSummary`
- `CharacterManager`
- `StageManager`
- `MapManager`

Current default selection:

```text
selectedCharacterId = random_unlocked
selectedStageId = random_unlocked_stage
```

Important semantics:

- `selectedCharacterId` is the user selection and may be `random_unlocked`.
- `characterId` is the actual character used in the run.
- `selectedStageId` is the user selection and may be `random_unlocked_stage`.
- `stageId` is the actual stage used in the run.
- `mapId` is the actual map from the actual selected stage.

Random character and random stage IDs are selection-layer virtual IDs. They must not be written into `characters.json` or `stages.json`.

### Random / Seed

Existing systems:

- `RandomManager`
- `SeededRandom`
- `RunSeed`
- `RandomSource`

Used for:

- Random character selection
- Random stage selection
- Upgrade options
- Enemy spawn positions
- Treasure chests
- Endless Bosses
- Daily challenges
- Replay and automated test reproduction

New gameplay randomness should not use `Math.random()`.

### RunMetadata / CSV

CSV already contains extensive metadata, including:

- `runId`
- `runSeed`
- `selectedCharacterId`
- `characterId`
- `characterSelectionMode`
- `selectedStageId`
- `stageId`
- `stageSelectionMode`
- `mapId`
- `gameVersion`
- `contentHash`
- `csvSchemaVersion`
- `difficultyId`
- `mutatorIds`
- `rulesetId`
- `customStageId`
- `challengeId`
- `leaderboardKey`

CSV design goal:

- Support grouping automated test results by character, stage, map, rule, version, and difficulty.

### Replay

Existing foundation:

- `ReplayData`
- `ReplayRecorder`
- `ReplaySerializer`
- `ReplayStorage`
- `ReplayToolScene`

Current Replay support is limited to basic record, import, and export. It is not a full playback system.

Replay must remain separate from formal SaveData, CSV, and Leaderboard systems.

### Event System

Existing systems:

- `GameEventBus`
- `GameEventRecorder`
- `GameEventBridge`
- `GameEventType`
- `GameEventPayloads`

Some events are already integrated. `RunState` still owns some counters directly to avoid duplicate counting. The architecture is not fully event-driven by design.

### Achievement / Tutorial / Unlock

Existing foundation:

- `AchievementManager`
- `AchievementRegistry`
- `AchievementEvaluator`
- `MilestoneManager` shell
- `TutorialManager`
- `TutorialRegistry`
- `UnlockManager`
- `UnlockRegistry`
- `BuiltInUnlocks`

Built-in content is currently unlocked by default for the testing stage.

### Rules / Difficulty / Mutator

Existing systems:

- `DifficultyManager`
- `RunRuleSet`
- `MutatorFactory`
- `MutatorRegistry`

Default configuration:

- Normal difficulty
- No mutators

These systems are intended for challenges, custom stages, daily challenges, and difficulty modes.

## 4. Character System Current State

Existing base characters:

- Assassin / default
- Witch
- Priest
- Warrior

### Assassin

- Initial weapon: Knife
- On-hit skill: `blinkForward`
- Role: high speed, escape movement, knife/projectile identity

### Witch

- Initial weapon: Magic Wand
- On-hit skill: `slowTrail`
- Role: magic, slow control, late growth

### Priest

- Initial weapon: Bible
- On-hit skill: `holySanctuary`
- Role: shield, recovery, orbit weapons, defense

### Warrior

- Initial weapon: Axe
- On-hit skill: `ironCounter`
- Role: high HP, knockback, counterattack, damage reduction

### Random character

- Virtual selected ID: `random_unlocked`
- Each run randomly selects from unlocked characters.
- CSV records both `selectedCharacterId=random_unlocked` and the actual `characterId`.

## 5. Character Attribute System

Character attributes have been expanded from simple HP and speed into three domains:

- combat
- defense
- resource

Included modifiers:

- `damageMultiplier`
- `physicalDamageMultiplier`
- `magicDamageMultiplier`
- `projectileDamageMultiplier`
- `auraDamageMultiplier`
- `orbitDamageMultiplier`
- `areaDamageMultiplier`
- `explosionDamageMultiplier`
- `bossDamageMultiplier`
- `eliteDamageMultiplier`
- `cooldownMultiplier`
- `projectileSpeedMultiplier`
- `knockbackPowerMultiplier`
- `damageTakenMultiplier`
- `armorFlat`
- `healingMultiplier`
- `shieldGainMultiplier`
- `expGainMultiplier`
- `treasureDropMultiplier`

Runtime integration already includes:

- Character deterministic combat modifiers to `WeaponManager`
- Weapon tags to `DamageCalculator`
- Boss and elite target context to `bossDamageMultiplier` / `eliteDamageMultiplier`

Not yet enabled:

- Random critical hits
- Random dodge

Reason:

- These require strict `RandomManager` integration to preserve seed and replay determinism.

## 6. Character Visual System

Completed:

- Skin-aware `PlayerController`
- Skin-aware `AssetKeyResolver`
- Four independent character portraits
- Four character hit FX
- Four character skill FX
- Four character true 8-direction idle/walk placeholder spritesheets

Approximate character asset path:

```text
public/assets/art/player/
```

These assets are structurally complete placeholders, not final polished art.

Future refined assets from ChatGPT or external tools should follow this route:

```text
public/assets/imports/
manifest.json
ExternalArtRegistry / ExternalArtValidator
AssetKeyResolver logicalKey override
```

## 7. Display / Quality / UI Settings

Display settings already include:

- `displayQuality`: `high` / `medium` / `low` / `minimal`
- `assetStyle`: `newArt` / `legacy` / `graphics`
- `uiStyle`: `classic` / `arcaneSlate` / `minimal`
- `visualModelScale`: `1` / `1.5` / `2`
- `shadowsEnabled`

Important semantic rule:

- `visualModelScale` only affects rendering size. It must not affect hitbox, collision, pickup range, weapon hit detection, or Boss Dash.

Recent fixes:

- Visual size regression fixed
- Graphics fallback uses `VisualScale`
- Final Boss visual multiplier changed from `0.5` to `0.75`
- Aura core uses `VisualScale`
- Model Scale supports `1x`, `1.5x`, and `2x`

## 8. SettingsMenu Current State

`SettingsMenu` has been changed to tabs:

- Gameplay
- Audio
- Display
- Input
- Developer

Boolean settings use graphical toggles.

Enum and numeric settings use cycle rows.

Known issue:

- Display tab has too many entries. It shows `+2 more`, making later settings inaccessible.

Solution direction:

- `SettingsMenu` content area should support scrolling or pagination.
- Do not hide settings behind `+N more`.
- Close / Back controls must stay fixed at the bottom.

## 9. UI Current Problems and Direction

Current UI problems:

- Content stacking
- Weak visual design
- `LevelUpPanel` looks like a debug panel
- `CharacterSelect`, `Result`, and `Help` lack clear information hierarchy

Planned visual direction:

- Arcane Slate UI
- Dark fantasy
- Blue slate
- Arcane glow
- Card-based layout
- Icon-based information hierarchy
- Unified buttons, panels, tags, and progress bars

Recommended phases:

1. Build UI component layer
2. Rebuild `LevelUpPanel`
3. Rebuild `CharacterSelectScene`
4. Rebuild `ResultScene`
5. Gradually migrate Settings, Help, Pause, and HUD

UI style should be switchable:

- Classic
- Arcane Slate
- Minimal

UI style must not change gameplay, CSV, content, or asset quality.

## 10. HelpOverlay Current Problem

`HelpOverlay` content is outdated and should be rebuilt as an encyclopedia-style help system.

Recommended sections:

- Basics
- Characters
- Weapons
- Evolutions
- Passives
- Maps
- Endless
- Settings
- Testing / Data

Help content should be data-informed where possible:

- `characters.json`
- `weapons.json`
- `passives.json`
- evolution rules
- `maps.json`
- `stages.json`
- settings data

Do not describe planned features as implemented features.

## 11. Map / Stage System

Existing systems:

- `StageManager`
- `MapManager`
- `MapMechanicRuntime`
- `MapMechanicDefinition`

Map mechanics include or are planned to include:

- obstacle
- slowZone
- portal
- lightSource
- hazard
- altar
- destructible
- spawner

Current design principle:

- Maps should not differ only by background and landmark art.
- Maps should differ by terrain, obstacles, portals, slow zones, light sources, and interactive objects.

Recommended maps:

- Prototype Field: standard open testing map
- Graveyard Night: grave obstacles, portals, light sources
- Swamp Marsh: river or swamp slow zones
- Ruined Gate: broken walls, portals, ruins

## 12. Endless Mode Current State

Existing systems:

- `EndlessManager`
- `EndlessBossManager`
- `EndlessRewardManager`
- `EndlessLeaderboard` facade

Known late endless-mode issue:

- Late-game speed gradually slows down.
- 3x speed effectively feels close to 1x.
- Switching to 1x and back to 3x temporarily restores speed, but slowdown returns later.

Possible causes:

- Object count growth
- `timeScale` state drift
- Spawn accumulator growth
- Pickups, projectiles, shadows, or VFX not cleaned up
- Floating text, boss warnings, or map mechanic visuals accumulating

Recommended debugging additions:

- `gameSecondsPerRealSecond`
- `enemyCount`
- `pickupCount`
- `projectileCount`
- `floatingTextActiveCount`
- `shadowCount`
- `bossCount`

Recommended checks:

- Unify `timeScale` entry point
- Inspect spawn accumulator while-loops
- Inspect object destroy logic
- Inspect shadow destroy logic
- Inspect tween cleanup

## 13. Map Random / Character Random

Random character is implemented as:

```text
selectedCharacterId = random_unlocked
characterId = actual character
```

Random stage requirement:

```text
selectedStageId = random_unlocked_stage
stageId = actual stage
mapId = map bound to actual stage
stageSelectionMode = fixed / random_unlocked
```

Important rule:

- Randomization is at the Stage level, not the standalone Map level.
- Stage binds map, waves, boss, and rules.

## 14. External Art Import Route

Final polished assets may be generated by ChatGPT or external tools. Codex should focus on import interfaces and validation.

Target directory:

```text
public/assets/imports/
```

Expected structure:

```text
manifest.json
player/
enemies/
bosses/
weapons/
effects/
world/
ui/
```

Required systems:

- `ExternalArtManifest`
- `ExternalArtRegistry`
- `ExternalArtValidator`
- `validate-external-art.mjs`

Resolution priority:

1. External logical key override
2. Built-in skin-specific asset
3. `newArt`
4. `legacy`
5. graphics fallback

## 15. Common Current Errors

### Vite WebSocket failed

Example:

```text
WebSocket connection to ws://127.0.0.1:5173/... failed
```

Usually this is a Vite HMR connection issue, not a game logic error.

Common fixes:

- `npm run dev`
- Hard refresh with `Ctrl+F5`
- Disable browser extensions
- If needed, configure fixed HMR in `vite.config`

### Audio not loaded

Example:

```text
Audio not loaded: knife_attack
```

This means an audio key exists but the actual audio file is missing or not loaded.

Usually this is a warning and does not block gameplay logic.

### Model Scale switching crash

Example:

```text
Cannot read properties of null (reading 'setPosition')
ShadowFactory.updateShadow
PlayerController.refreshVisualScale
```

Likely cause:

- A shadow has been destroyed or is null, but `setPosition` is still called during model scale switching.

Solution direction:

- Make `ShadowFactory.updateShadow` null-safe.
- Make `destroyShadow` null-safe.
- Make `PlayerController.refreshVisualScale` check shadow and body state.
- Ensure Enemy, Pickup, Treasure, and World shadows are also destroyed-safe.

## 16. Git / Push Notes

Common GitHub push issue:

```text
OpenSSL SSL_connect: Connection was reset
```

Common fixes:

```bash
git push origin main
git -c http.version=HTTP/1.1 push origin main
```

If still failing:

```bash
git remote set-url origin git@github.com:QianLing-kkhh/vampire-survivor-like-game.git
git push origin main
```

If `fetch first` appears:

```bash
git pull --rebase origin main
git push origin main
```

## 17. Common Validation Commands

Known `package.json` commands:

```bash
npm.cmd exec tsc
npm.cmd run build
npm.cmd run validate
npm.cmd run validate:docs
npm.cmd run validate:content
npm.cmd run validate:assets
npm.cmd run check:architecture
npm.cmd run analyze:csv
npm.cmd run pre-release
```

General tasks should at least run:

```bash
npm.cmd exec tsc
npm.cmd run build
```

For content data changes:

```bash
npm.cmd run validate:content
```

For asset changes:

```bash
npm.cmd run validate:assets
```

For documentation links:

```bash
npm.cmd run validate:docs
```

## 18. Recommended Next Route

### P0

- Fix `SettingsMenu` scrolling or pagination and remove hidden `+N more` behavior.
- Fix Model Scale shadow null crash.
- Update `HelpOverlay` content.
- Redesign `LevelUpPanel` UI.

### P1

- Add differentiated maps and stages.
- Add random stage selection.
- Run random character plus random stage automated tests.
- Analyze CSV results.

### P2

- Add new Boss configuration.
- Add 3 to 5 Relics.
- Refine map mechanics.
- Build the external asset import pipeline.

## 19. Prompt for New AI Conversations

Use the following prompt when starting a new conversation:

```text
The following is the current project baseline for vampire-survivor-like-game.
Treat it as the current project state.

Priority order:
1. Architecture Rules
2. Current Sprint
3. Project Baseline

Answer based on the latest project state.
Do not assume missing systems exist.
Do not suggest rebuilding architecture that already exists.
Prioritize my newest question over older context.
```
