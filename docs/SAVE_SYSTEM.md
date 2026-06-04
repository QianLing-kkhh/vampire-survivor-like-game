# Save System

The save system is the persistence foundation for settings, selections, progression, cosmetics, records, and future unlock systems.

## Core Files

- `SaveData`
- `SaveStorage`
- `SaveMigrator`
- `SaveManager`

## SaveData

`SaveData` contains:

- `schemaVersion`
- `settings`
- `progression`
- `selections`
- `cosmetics`
- `records`

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

If JSON is corrupted, the game should warn and fall back to a default save rather than crashing.

## SaveManager

`SaveManager` is the unified entry point:

- `load()`
- `save()`
- `get()`
- `update(partial)`
- `reset()`
- `clear()`
- `subscribe(listener)`

Future persistent player state should go through `SaveManager`.

## Settings Integration

`PlaytestSettings` keeps its existing public API, but now reads/writes through `SaveManager.settings`.

Legacy PlaytestSettings localStorage can migrate into the new save when no save exists yet.

## Selection Integration

The current selected IDs are save-backed:

- `CharacterManager`
- `StageManager`
- `MapManager`

There is no selection UI yet. Managers fall back to defaults if a saved ID is missing from registered content.

## What SaveData Is Not

Formal save data is not the same as:

- CSV playtest logs
- PlaytestLogBuffer
- transient run state
- debug telemetry

Keep CSV/playtest data separate unless a future feature explicitly integrates it.

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
