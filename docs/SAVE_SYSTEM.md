# Save System

The save system is the persistence foundation for settings, selections, progression, cosmetics, records, and future unlock systems.

## Core Files

- `SaveData`
- `SaveStorage`
- `SaveMigrator`
- `SaveValidator`
- `SaveExport`
- `SaveManager`

## SaveData

`SaveData` contains:

- `schemaVersion`
- `versionInfo`
- `settings`
- `progression`
- `selections`
- `cosmetics`
- `records`

`versionInfo` records the current game version, save/CSV/replay/custom-stage schema versions, and built-in content hash. Old saves without this metadata are migrated with current values.

`settings` is split into domains:

- `gameplay`: Auto Movement, Auto Upgrade, Fast Mode, Endless Mode, and auto time scale.
- `audio`: audio enabled plus BGM, SFX, weapon, and UI channel volumes.
- `display`: locale plus reserved display/theme/debug visibility fields.
- `input`: virtual joystick and future binding/accessibility input fields.
- `developer`: playtest/developer logging and auto-restart style flags.

Current default selections:

- Character: `default`
- Stage: `stage_001`
- Map: `prototype_field`
- Difficulty: `normal`
- Theme: `default`

Reserved future selection fields:

- challenge ID
- custom stage ID
- seed
- ruleset ID

Current cosmetics fields:

- selected theme ID
- selected character skin IDs by character
- selected weapon skin IDs by weapon
- selected enemy skin IDs by enemy
- reserved selected UI theme ID
- reserved selected world theme ID

Current unlock defaults:

- `default` character
- `stage_001` stage
- `prototype_field` map

Achievement and milestone progress:

- `progression.achievements`: achievement progress by achievement id.
- `progression.milestones`: reserved milestone progress placeholder.

Unlock progress:

- `progression.unlockedCharacterIds`
- `progression.unlockedStageIds`
- `progression.unlockedMapIds`
- `progression.unlockedWeaponIds`
- `progression.unlockedPassiveIds`
- `progression.unlockedCosmeticIds`
- `progression.unlockedThemeIds`
- `progression.unlockedDifficultyIds`
- `progression.unlockedChallengeIds`
- `progression.unlocks`: normalized unlock state by `type:targetId`.

## SaveStorage

`SaveStorage` owns localStorage access.

Storage key:

```text
vampire_survivor_like_save_v1
```

If localStorage is not available, it falls back to in-memory storage.

## SaveMigrator

`SaveMigrator` owns:

- Default save creation when no save exists
- Current schema migration hook
- Corrupted JSON fallback
- Migration from the old flat settings shape into domain-based settings
- Fallback when local stored save data is from an unsupported future schema

If JSON is corrupted, the game should warn and fall back to a default save rather than crashing.

## SaveValidator

`SaveValidator` performs lightweight structural checks before import:

- Save data must be an object.
- `schemaVersion` must not be newer than the current supported schema.
- `settings`, `progression`, `selections`, `cosmetics`, and `records` should have object-like shapes.
- Selected character, stage, map, difficulty, and theme IDs should be strings when present.
- `records.leaderboardsByKey` should be an object when present.

The validator does not deeply verify every gameplay content reference. Old or incomplete saves can produce warnings and still pass through `SaveMigrator`, which fills defaults.

Version compatibility checks are advisory for ordinary startup. Newer unsupported schema versions are errors, older schema versions can be migrated, and game version/content hash differences should produce warnings rather than blocking normal play.

## Save Export Package

`SaveManager.exportSave()` returns a pretty-printed JSON string.

The current export wrapper shape is:

```ts
{
  exportVersion: 1,
  exportedAt: string,
  gameVersion?: string,
  save: SaveData,
  checksum?: string
}
```

`gameVersion` and `checksum` are reserved. This first version does not compute a checksum.

## SaveManager

`SaveManager` is the unified entry point:

- `load()`
- `save()`
- `get()`
- `update(partial)`
- `reset()`
- `resetSave()`
- `exportSave()`
- `importSave(serialized)`
- `validateCurrentSave()`
- `getSaveSummary()`
- `clear()`
- `subscribe(listener)`

Future persistent player state should go through `SaveManager`.

Import supports both raw `SaveData` JSON and `SaveExportPackage` JSON. Imported data is validated first, migrated to the current schema, written through `SaveStorage`, and then sent to subscribers.

`resetSave()` restores default formal save data only. It does not clear the CSV playtest buffer, browser-wide localStorage, custom stage storage, or other unrelated storage keys.

Because achievements and milestones are formal progression data, `resetSave()` clears their progress along with other save-backed progression.

Reset also restores default unlock state, leaving the current default character, stage, map, and theme unlocked.

## Settings Integration

`SettingsManager` is the current domain-based settings entry point and reads/writes through `SaveManager.settings`.

`PlaytestSettings` keeps its existing public API as a compatibility facade for older callers. New systems should prefer `SettingsManager`.

Legacy PlaytestSettings localStorage can migrate into the new save when no save exists yet.

## Selection Integration

The current selected IDs are save-backed:

- `SelectionManager`
- `CharacterManager`
- `StageManager`
- `MapManager`

`SelectionManager` is the future facade for character/stage/map/difficulty/challenge/custom selections. There is no formal selection UI yet. Managers fall back to defaults if a saved ID is missing from registered content.

Future custom stage selection should write `selectedCustomStageId`, `selectedSeed`, and `selectedRulesetId` through `SelectionManager` rather than directly changing `StageManager`.

## Appearance Integration

Appearance selections are stored in `SaveData.cosmetics` and read through `AppearanceManager`.

Current behavior:

- The built-in `default` theme is active.
- No appearance selection UI is implemented.
- Default theme overrides are empty, so saved appearance data does not change visuals.
- Future skins, themes, and mod art packs should store persistent selections in `cosmetics` and resolve runtime keys through `AssetKeyResolver`.

## Achievement Integration

`AchievementManager` listens to the per-run `GameEventBus` and writes unlock state into `SaveData.progression.achievements`.

Current behavior:

- A small built-in achievement set exists for foundation testing.
- There is no Achievement UI yet.
- `AchievementReward` is data-only until an unlock layer is connected.
- Milestone storage is reserved but not yet wired into gameplay counters.
- Achievement progress is not part of CSV playtest logs.

## Unlock Integration

`UnlockManager` is the canonical owner for unlock state. It reads and writes through `SaveData.progression` and ensures built-in default content remains unlocked.

Current behavior:

- Existing default character, stage, map, and theme are unlocked.
- No unlock UI is implemented yet.
- `CharacterManager`, `StageManager`, and `MapManager` expose unlock-aware listing helpers.
- Achievement rewards can call `UnlockManager`, but reward failure should not block achievement unlock.
- Future content should register unlock definitions instead of storing access flags in individual managers.

## Records and Leaderboards

`records.leaderboardsByKey` stores local leaderboard records by a stable serialized `LeaderboardKey`.

Current endless records use:

- `mode=endless`
- selected character ID
- selected stage ID
- selected map ID

Reserved future leaderboard dimensions include difficulty, seed, challenge ID, custom stage ID, and ruleset ID. The older global endless leaderboard is migrated through compatibility paths and should not be used by new systems.

## What SaveData Is Not

Formal save data is not the same as:

- CSV playtest logs
- PlaytestLogBuffer
- transient run state
- debug telemetry

Keep CSV/playtest data separate unless a future feature explicitly integrates it.

Save import/export currently covers formal `SaveData`. Future custom stage backup/export may include `CustomStageStorage`, but that is intentionally not merged into this first save export format yet.

Version metadata is also formal save data. CSV buffers, replay storage, and custom stage storage remain separate diagnostic/content stores even when they record compatible `gameVersion` or `contentHash` values.

## Future Save Domains

Likely future additions:

- Achievements
- Quests
- Cosmetics
- Input bindings
- Accessibility settings
- Difficulty/mutator preferences
- Custom content metadata
- Per-stage and per-character records
- Seed challenge records
