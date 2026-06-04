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
- `settings`
- `progression`
- `selections`
- `cosmetics`
- `records`

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
- Theme: `default`

Current unlock defaults:

- `default` character
- `stage_001` stage
- `prototype_field` map

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

## Settings Integration

`SettingsManager` is the current domain-based settings entry point and reads/writes through `SaveManager.settings`.

`PlaytestSettings` keeps its existing public API as a compatibility facade for older callers. New systems should prefer `SettingsManager`.

Legacy PlaytestSettings localStorage can migrate into the new save when no save exists yet.

## Selection Integration

The current selected IDs are save-backed:

- `CharacterManager`
- `StageManager`
- `MapManager`

There is no selection UI yet. Managers fall back to defaults if a saved ID is missing from registered content.

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
