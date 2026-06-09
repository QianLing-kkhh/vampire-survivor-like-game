# System Map

This document is a quick architecture map for developers and Codex. It shows how the current systems relate, where runtime state lives, how data enters a run, and which foundations should not be expanded unless real content proves the need.

## 1. One-page overview

```text
Scenes
  ↓
GameplayInitializer
  ├─ bootstrap selection/rules/events/context helpers
  ↓
GameplayContext
  ├─ Player / CharacterRuntime
  ├─ WeaponManager / PassiveManager / UpgradeFlow
  ├─ EnemyFlow / BossController / EndlessBossManager
  ├─ MapMechanicRuntime
  ├─ RunState / RunStats
  ├─ RandomManager / RunRuleSet
  ├─ GameEventBus / ReplayRecorder
  └─ PerformanceMonitor / VisualSettings

ContentRegistry ← ContentBootstrap ← src/data/*.json
SaveManager ← SaveStorage / SaveMigrator
SelectionManager ← SaveManager.selections
UI ← UIScene / overlay classes
Logs ← RunResultBuilder / PlaytestLog / ReplayStorage
```

The project is in content proof mode. Most broad foundations exist; the next useful work is proving them with real characters, stages, maps, Bosses, relics, custom stages, UI polish, and test workflows.

## 2. Layered architecture map

| Layer | Main systems | Owns | Should not own |
|---|---|---|---|
| Scene Layer | `BootScene`, `PreloadScene`, `TitleScene`, selection/tool scenes, `GameScene`, `UIScene`, `ResultScene` | Phaser lifecycle, scene transitions, high-level orchestration, UI event bridges | Weapon/combat/progression rules, content validation, save schemas |
| Runtime Layer | `GameplayInitializer`, `gameplay/bootstrap`, `GameplayContext`, `GameplayUpdater`, runtime context/coordinator helpers, `PerformanceMonitor`, `PoolManager` | Per-run object graph, stable creation order, run selection/rules/event setup, frame update order, runtime snapshots, diagnostics | Persistent settings, content definitions, UI layout rules |
| Content Layer | `ContentBootstrap`, `ContentRegistry`, `ContentValidator`, `ContentPack` | Built-in JSON registration and content lookup | Save state, custom-stage storage, runtime object ownership |
| Save/Settings Layer | `SaveManager`, `SaveStorage`, `SaveMigrator`, `SettingsManager`, `PlaytestSettings` facade | Formal save data, settings domains, selections, progression, cosmetics, records | CSV buffers, replay blobs, transient run counters |
| Selection Layer | `SelectionManager`, `SelectionState`, `SelectionSummary` | Save-backed selected IDs and selection facade | Actual per-run random resolution details beyond manager calls |
| Character/Stage/Map Layer | `CharacterManager`, `StageManager`, `MapManager`, `CharacterRuntime` | Registry-backed content lookup, random virtual ID handling, custom-stage runtime resolution | Combat loops, UI rendering, direct JSON imports |
| Map Mechanics Layer | `MapMechanicRuntime`, obstacle/slow/portal/light mechanics | Selected-map low-risk terrain behavior and visual markers | Character/weapon/enemy base values, projectile collision rules in the first pass |
| Progression Layer | `UpgradeFlow`, `UpgradeSelector`, `UpgradeApplier`, `PassiveManager`, `EvolutionManager` | Level-up choices, treasure rewards, passive effects, weapon evolution, endless reward fallback | UI card ownership, treasure spawning, scene lifecycle |
| Combat Layer | `Enemy`, `EnemyFactory`, `EnemyFlow`, `WeaponManager`, weapon classes, `BossController`, `BossSkillFactory` | Enemy movement/contact/death, weapon updates, Boss logic, Boss skill runtime | UI display, save writes, content registration |
| Rules Layer | `DifficultyManager`, mutators, `RunRuleSet` | Per-run difficulty and mutator composition | Scene-level if/else tuning, hidden rule changes |
| Random Layer | `RunSeed`, `RandomManager`, `SeededRandom`, `RandomSource` | Seed creation and domain random streams | Direct global gameplay randomness |
| Endless Layer | `EndlessManager`, `EndlessBossManager`, `EndlessRewardManager`, `EndlessLeaderboard` | Post-final-Boss pressure, endless scaling, endless rewards, local endless records | Normal pre-Boss stat changes, non-endless victory rule |
| Event Layer | `GameEventBus`, `GameEventRecorder`, `GameEventBridge` | Per-run event timeline and listener isolation | Authoritative gameplay counters by itself |
| Logging/Replay Layer | `RunState`, `RunStats`, `RunResultBuilder`, `PlaytestLog`, `PlaytestLogBuffer`, `ReplayRecorder`, `ReplayStorage` | Run counters, CSV rows, result data, replay records | Formal save progression, gameplay rules |
| UI Layer | `HUD`, `LevelUpPanel`, `PauseMenu`, `SettingsMenu`, `HelpOverlay`, records/replay/custom panels | Display state, user intents, responsive Phaser UI | Gameplay rules, content registration, save schema ownership |
| Visual/Asset Layer | `PreloadScene`, `AssetKeyResolver`, `AssetFallbacks`, `ExternalArtRegistry`, `VisualSettings`, `VisualScale`, `ShadowFactory`, `UIThemeRegistry` | Asset loading, texture/animation resolution, display-only scaling, shadows, UI style | Hitboxes, damage ranges, numeric gameplay tuning |
| Debug/Validation Layer | `DebugPanel`, `DebugDataCollector`, validation scripts | Local diagnostics, docs/content/assets checks, architecture warnings, CSV analysis | Runtime gameplay mutation, auto-fixing data |

## 3. Scene flow

```text
BootScene
  → PreloadScene
  → TitleScene
       ├─ CharacterSelectScene
       ├─ StageSelectScene
       ├─ DailyChallengeScene
       ├─ RecordsScene
       ├─ ReplayToolScene
       ├─ CustomStageToolScene
       ├─ CustomStageEditorLiteScene
       ├─ SettingsMenu / HelpOverlay
       └─ GameScene
             ├─ UIScene
             └─ ResultScene
```

Scene responsibilities:

- `BootScene`: starts `PreloadScene`.
- `PreloadScene`: loads built-in assets, external art manifest/assets, spritesheet animations, and audio.
- `TitleScene`: main menu, auto-test countdown, Settings and Help entry.
- `CharacterSelectScene`: minimal character selection through `SelectionManager`.
- `StageSelectScene`: minimal stage/custom-stage selection through `SelectionManager`.
- `DailyChallengeScene`: activates today's local daily challenge through `ChallengeManager`.
- `RecordsScene`: read-only achievements, leaderboards, and unlocks.
- `ReplayToolScene`: replay record list/import/export/inspect utility; no playback.
- `CustomStageToolScene`: paste/validate/save/export custom stage packages.
- `CustomStageEditorLiteScene`: prompt-driven custom stage basics and wave editing.
- `GameScene`: owns run lifecycle, Phaser scene operations, UI event binding, HUD emission, pause gates, and result transition.
- `UIScene`: overlay scene for HUD, level-up, pause, debug, temporary messages.
- `ResultScene`: compact run result, CSV buttons, Settings, auto restart, endless leaderboard.

## 4. Run startup flow

Current run start order:

```text
Title / Result Restart
  ↓
GameScene.create
  ↓
SelectionManager.getSelection
  ↓
RunSeed.createSeedFromSelection
  ↓
RandomManager(runSeed)
  ↓
CharacterManager.resolveCharacterForRun
  ↓
StageManager.resolveStageForRun
  ↓
MapManager.resolve map from resolved stage
  ↓
DifficultyManager / RunRuleSet
  ↓
GameplayInitializer creates runtime
  ↓
GameplayContext
  ↓
GameplayUpdater each frame
```

Important details:

- `selectedCharacterId` may be `random_unlocked`.
- `characterId` is the actual character chosen for the run.
- `selectedStageId` may be `random_unlocked_stage`.
- `stageId` is the actual stage chosen for the run.
- `mapId` comes from the actual resolved stage, or from the selected custom stage package.
- `runSeed` is created before random character/stage resolution, so random choices are tied to the run seed.
- `RunState` metadata and replay start data both record selected IDs and actual IDs.
- CSV rows record selected and actual character/stage IDs so balance analysis groups by actual content while preserving selection mode.
- Leaderboard keys use actual resolved character/stage/map IDs.

## 5. Content / Save / Selection flow

```text
src/data/*.json
  ↓ ContentBootstrap
ContentRegistry
  ↓
CharacterManager / StageManager / MapManager / WeaponManager / EnemyFactory

SaveStorage
  ↓ SaveMigrator
SaveManager
  ├─ settings
  ├─ selections
  ├─ progression
  ├─ cosmetics
  └─ records

SelectionManager
  ↓ reads/writes SaveManager.selections
  ↓ resolves via managers at run start
```

Rules:

- `ContentBootstrap` is the built-in JSON import boundary.
- Runtime systems should read through `ContentRegistry` or a registry-backed manager/factory.
- Custom stages do not enter the built-in `ContentRegistry`.
- `CustomStageStorage` holds local custom stage packages separately.
- `random_unlocked` and `random_unlocked_stage` are selection virtual IDs and should not appear in content JSON.
- `UnlockManager` currently keeps built-in content unlocked for content proof.

## 6. Gameplay runtime flow

Actual `GameplayUpdater.update(delta)` order:

```text
GameplayUpdater.update(delta)
  ├─ performance monitor delta update
  ├─ virtual joystick active state
  ├─ TimeManager update
  ├─ PassiveManager update
  ├─ MapMechanicRuntime update
  ├─ player terrain speed multiplier
  ├─ player / auto player / virtual joystick update
  ├─ player obstacle push-out and portal teleport
  ├─ player hit range update
  ├─ EnemyFlow.removeDeadEnemies
  ├─ SpawnDirector update
  ├─ BossController update
  ├─ EndlessManager / EndlessBossManager pre-enemy update
  ├─ EnemyFlow update
  ├─ death / victory checks
  ├─ WeaponManager update
  ├─ Endless state update without spawns
  ├─ victory check
  ├─ PickupManager update
  ├─ TreasureManager update
  ├─ FloatingTextManager update
  ├─ performance counts
  └─ HUD emit
```

Runtime coordination around the updater is now split into small helpers:

- `AutoPlayerContextBuilder` creates the auto movement snapshot from current enemies, pickups, treasure, player stats, map mechanics, and Boss warnings.
- `UpgradeSelectionContextBuilder` creates manual and auto upgrade contexts without embedding selector inputs in `GameScene`.
- `RuntimeDiagnosticsCollector` owns performance count collection after update work.
- `RuntimeTextureReadiness` checks only the current map's required ground tile texture when PNG gameplay assets are expected.
- `RuntimeSettingsSynchronizer` applies playtest settings to `GameplayContext`; `GameScene` still performs audio, UI, and event side effects.
- `RunEndCoordinator` prepares run-ended payloads, replay stop data, unlock context, and result build input.
- `PauseFlowCoordinator` returns pause/resume/restart/back-to-title decisions; `GameScene` still executes Phaser scene operations.

`GameScene` still owns resize/orientation handling, HUD event emission, actual pause menu display, audio calls, cleanup, and the final `ResultScene` transition. New gameplay details should continue moving into runtime services instead of growing `GameScene`.

## 7. Character / Stage / Map flow

Character:

```text
characters.json
  → ContentBootstrap / ContentRegistry
  → CharacterManager
  → CharacterRuntime
  → PlayerStats / starting weapon / damage reaction / skinId
  → WeaponManager modifiers / PlayerController animation
```

Current selectable characters:

- Assassin/default
- Witch
- Priest
- Warrior
- `random_unlocked`

Current damage reactions:

- `blinkForward`
- `slowTrail`
- `holySanctuary`
- `ironCounter`

Stage:

```text
stages.json
  → ContentBootstrap / ContentRegistry
  → StageManager
  → actual stage
  → mapId / waveSetId / finalBossId / rules
```

Map:

```text
maps.json
  → ContentBootstrap / ContentRegistry
  → MapManager
  → WorldRenderer
  → MapMechanicRuntime
```

Map mechanics currently support obstacles, slow zones, portals, and visual light sources. They are map-specific runtime behavior and should not modify character, weapon, enemy, or Boss base stats.

## 8. Combat / Progression / Endless flow

Progression:

```text
EXP / Treasure
  ↓
UpgradeFlow
  ├─ UpgradeSelector
  ├─ UpgradeApplier
  ├─ PassiveManager
  ├─ WeaponManager
  ├─ EvolutionManager
  └─ EndlessRewardManager
```

Treasure order:

1. Try treasure-triggered evolution.
2. Try a normal filtered chest upgrade.
3. If no normal reward exists and endless has started, try an endless reward.
4. If no reward can apply, return `none` safely.

Combat:

```text
WeaponManager / Weapon classes
  ↓ damage
Enemy
  ↓ death
EnemyFlow
  ↓ RunStats / RunState / pickups / events
```

`EnemyFlow` handles enemy update/contact/death accounting and passes Boss kills to `BossController`. `PickupManager` creates EXP/pickups through event-driven flows; weapons do not update UI.

Endless:

```text
Final Boss killed + Endless Mode
  ↓
RunState.startEndless
  ↓
EndlessManager
  ├─ enemy scaling
  ├─ endless enemies
  ├─ EndlessBossManager
  └─ EndlessRewardManager
```

Only enemies spawned by `EndlessManager` receive endless stat scaling. Endless rewards affect player survival or weapon damage through the progression/runtime path and are recorded in `RunState`.

## 9. Event / Replay / Logging flow

```text
Gameplay systems
  ↓ emit
GameEventBus
  ├─ GameEventRecorder
  ├─ ReplayRecorder
  ├─ AchievementManager
  ├─ TutorialManager
  └─ future listeners

RunState / RunStats
  ↓
RunResultBuilder
  ├─ ResultScene data
  └─ PlaytestLog CSV
         ↓
      PlaytestLogBuffer
```

Important details:

- `GameEventBus` is per-run and listener failures are isolated with warnings.
- `GameEventBridge` mirrors selected legacy `EventBus` events into the newer event bus.
- `RunState` still directly owns many gameplay counters. `GameEventBus` is not the only counting source.
- `ReplayRecorder` records selected key events and metadata, but full playback is not implemented.
- Replay storage is separate from `SaveData`, CSV, and leaderboards.
- CSV data is generated at run end by `RunResultBuilder` and appended to `PlaytestLogBuffer`.
- CSV and formal save data are intentionally separate.

## 10. UI / Settings / Visual flow

```text
SettingsManager
  ├─ gameplay
  ├─ audio
  ├─ display
  ├─ input
  └─ developer

Display settings
  ├─ displayQuality
  ├─ assetStyle
  ├─ uiStyle
  ├─ visualModelScale
  └─ shadowsEnabled

AssetKeyResolver
  ├─ external art
  ├─ appearance overrides
  ├─ skin-specific art
  ├─ newArt
  ├─ legacy
  └─ graphics fallback

UIThemeRegistry
  ├─ classic
  ├─ arcaneSlate
  └─ minimal
```

Rules:

- UI style changes UI presentation only.
- Display quality and asset style influence gameplay asset lookup and shadows.
- `visualModelScale` affects visible size only. It must not affect hitboxes, pickup range, damage radius, Boss Dash checks, or any gameplay stat.
- `ShadowFactory` creates non-colliding visual shadows.
- `SettingsMenu` is the shared settings UI for Title, Pause, and Result.
- Permanent HUD should display state. It should not own upgrade, combat, treasure, or Boss rules.

## 11. Custom content / External art flow

Custom Stage:

```text
CustomStageTool / EditorLite
  ↓ validate
CustomStageStorage
  ↓ selectedCustomStageId
StageManager / MapManager runtime resolution
```

Custom stage boundaries:

- Custom stage packages remain outside the built-in `ContentRegistry`.
- Current custom stages use existing enemies and Bosses.
- Custom stage tools validate, save, list, and export. They do not directly start gameplay.

External Art:

```text
public/assets/imports/manifest.json
  ↓ ExternalArtRegistry / Validator
PreloadScene
  ↓
AssetKeyResolver logicalKey override
  ↓
fallback if missing
```

External art boundaries:

- External art should not modify gameplay code or data.
- Missing `imports/manifest.json` must not block startup.
- Missing imported PNGs should warn and fall back.
- Final art import belongs in manifest/asset registration, not scattered texture strings.

## 12. Debug / Validation / Tooling flow

| Command | Use |
|---|---|
| `npm.cmd run validate` | Main pre-commit/project validation. Runs TypeScript, build, content, assets, external art, architecture, and docs checks. |
| `npm.cmd run validate:docs` | Checks local Markdown links in README/docs. |
| `npm.cmd run validate:content` | Checks JSON content references and required data files. |
| `npm.cmd run validate:assets` | Checks asset roots and manifest file references. |
| `npm.cmd run validate:external-art` | Checks optional external art manifest and referenced imported PNGs. |
| `npm.cmd run check:architecture` | Warning-only soft boundary audit. |
| `npm.cmd run analyze:csv` | Offline balance report from playtest CSV. |
| `npm.cmd run pre-release` | Release-oriented validation plus build info. |

`DebugPanel` is runtime-only, hidden by default, and intended for local object counts, speed/time-scale checks, run metadata, event counts, and performance diagnostics. It should not mutate gameplay.

## 13. Key ownership boundaries

1. `GameScene` should not continue absorbing new gameplay details.
2. UI displays state and sends intents; it does not own gameplay rules.
3. New content should go through `ContentRegistry` or registry-backed managers, not direct JSON imports.
4. New gameplay randomness should use `RandomSource` / `RandomManager`, not direct `Math.random`.
5. New asset keys should go through `AssetKeyResolver`.
6. Persistent state should go through `SaveManager`, not direct `localStorage`.
7. Custom stages should not pollute the built-in `ContentRegistry`.
8. Random virtual IDs should not be written into content JSON.
9. Leaderboard keys should use actual resolved IDs.
10. CSV should record both selected IDs and actual IDs.
11. Map mechanics should not change character, weapon, enemy, or Boss base values.
12. Visual model scale should not change hitboxes.
13. Relic-style rule changes belong in `RelicManager` / `RelicEffect`, not passives or scene conditionals.
14. Difficulty, challenge, custom-stage, and mod rule changes should flow through `RunRuleSet`.
15. Replay data should stay separate from formal save data and CSV buffers.

## 14. Current foundation-only systems

These systems should not be expanded just because their shells exist:

- Remote providers.
- Full replay playback.
- Full mod loader.
- Complex achievement reward UI.
- Full custom map editor.
- Appearance/theme expansion beyond real art needs.
- More generic registries.
- Deep milestone/quest layers.
- Broad custom weapon/enemy/passive mod runtime.
- Large playtest scenario batches before content scenarios exist.

Pause these unless real content, tooling, or validation pressure proves a concrete gap.

## 15. Common development routes

| Want to add... | Edit first | Also update | Do not touch |
|---|---|---|---|
| New character | `src/data/characters.json` | Character art manifest, i18n/help docs, unlock defaults if gated | `GameScene` gameplay conditionals |
| New weapon | `src/data/weapons.json` plus existing `WeaponFactory` path or concrete weapon class if needed | Upgrade data, asset resolver/preload, help text, tests/validation | UI logic for weapon rules |
| New passive | `src/data/passives.json` and `PassiveManager` only if a new effect type is required | Upgrades/evolution references, help docs | Weapon classes unless behavior truly requires it |
| New evolution | Evolution rules/data path | Upgrade/help display, CSV interpretation if new summary fields are needed | Treasure UI or `GameScene` |
| New map | `src/data/maps.json` | Art/world config, map mechanics, content validation docs | Character/weapon/enemy base stats |
| New stage | `src/data/stages.json` | Wave set, map reference, selection/help docs | `SelectionManager` virtual ID logic |
| New map mechanic | `src/map/mechanics/` | Map schema/validator/help docs | `GameScene`, character stats, enemy base configs |
| New Boss skill | `src/boss/skills/` and Boss skill config data | `BossSkillFactory`, validation/help docs | `BossController` unless lifecycle changes |
| New endless reward | `EndlessRewardManager` | `UpgradeFlow`, `RunState`, CSV fields only if new counters are needed | Level-up UI rules |
| New relic | `src/relic/` definitions/effects | `RelicManager`, save/CSV only when active runtime relics exist | `PassiveManager` |
| New UI screen | `src/scenes/` and `src/ui/` components | `UIThemeRegistry` tokens, responsive layout, docs | Gameplay managers for display-only state |
| New setting | `src/settings/*` and `SaveData` domain | `SettingsMenu`, docs, migration/defaults | Direct localStorage |
| New external art | `public/assets/imports/manifest.json` | `validate:external-art`, docs if schema changes | Gameplay/data JSON |
| New CSV field | `RunState` / `RunResultBuilder` / `PlaytestLog` | Analyzer/docs/schema version if needed | Formal save data |
| New daily challenge rule | `src/challenge/` and `RunRuleSet` mutator path | Selection metadata, leaderboard key, help docs | Normal Title start logic beyond clearing active challenge |
