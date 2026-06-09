# Change Log

## 2026-06-09 Auto Strategy Structure Split

- Moved auto movement snapshot contracts into `src/strategy/snapshot` with `src/auto/AutoPlayerTypes` compatibility aliases.
- Split `AutoPlayer` internal debug, movement, memory, and constants declarations out of the main movement class.
- Split strategy profile types, defaults, presets, save helpers, and clone helpers into separate owner modules.
- Added run-mode factory helpers and a leaderboard key factory while preserving existing flat metadata and serialized leaderboard key format.
- Added shared `RunSummary`, `RunModeMetadata`, and `SimulationSpeedConfig` helpers so simulation results, run metadata, speed buckets, and leaderboard keys derive from fewer sources of truth.
- No gameplay values, auto movement scoring, CSV schema, SaveData schema, ReplayData schema, or strategy hash semantics were changed.

## 2026-06-09 Gameplay Initializer Bootstrap Split

- Split run selection resolution, rule-set creation, runtime event setup, and final context assembly into `src/gameplay/bootstrap/` helpers.
- Kept `GameplayInitializer` as the stable Phaser-backed runtime object graph owner for entity and manager creation.
- No gameplay values, CSV schema, SaveData, ReplayData, RandomManager semantics, or SelectionManager semantics were changed.

## 2026-06-09 Runtime Separation Documentation Sync

- Documented the latest `GameScene` runtime separation pass.
- Added runtime boundary notes for auto movement context building, upgrade selection context building, runtime diagnostics, texture readiness, settings sync, pause flow decisions, and run-end coordination.
- Updated `ProjectMap.md` from an old expected-file list into a current owner-system map.
- No gameplay values, CSV schema, SaveData, ReplayData, RandomManager semantics, or SelectionManager semantics were changed as part of the documentation sync.

## Initial Setup

- Added AGENTS.md
- Added Architecture.md
- Added ProjectMap.md
- Added GameDesign.md
- Added AssetManifest.md
- Added initial gameplay data files

Use this file to record major architecture and gameplay changes.
