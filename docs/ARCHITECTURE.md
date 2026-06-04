# Architecture

This document is the primary architecture reference for Codex and future development. The project is still a playable prototype, but major systems are now separated into explicit layers.

## Scene Layer

Scenes own Phaser lifecycle, scene transitions, high-level UI/gameplay coordination, and scene events.

- `BootScene`: bootstraps the scene flow.
- `PreloadScene`: loads legacy assets, art pack assets, spritesheets, animations, and audio keys.
- `TitleScene`: start screen, auto-test countdown, Settings, Help, and title BGM entry point.
- `CharacterSelectScene`: minimal character selection scene backed by `SelectionManager`.
- `StageSelectScene`: minimal stage selection scene backed by `SelectionManager`.
- `CustomStageToolScene`: local custom stage package paste/validate/save/export utility.
- `GameScene`: main lifecycle, pause/resume, settings change handling, result transition, HUD emit, and gameplay runtime callbacks.
- `UIScene`: overlay scene for HUD, LevelUpPanel, PauseMenu, temporary messages, and UI events.
- `ResultScene`: compact run summary, CSV download, auto restart, Settings, and endless leaderboard display.

## Runtime Layer

The runtime layer keeps per-run object references and update order out of the scene as much as possible.

- `GameplayContext`: per-run reference container for player, managers, flows, controllers, runtime settings, and active systems.
- `GameplayInitializer`: creates per-run systems in a stable order and returns `GameplayContext`.
- `GameplayUpdater`: advances runtime systems each frame in the intended update order.

Current flow:

1. `GameScene` starts the run.
2. `GameScene` obtains selected character/stage/map through managers.
3. `GameplayInitializer` builds the runtime systems and returns `GameplayContext`.
4. `GameScene.update()` delegates runtime update to `GameplayUpdater`.
5. `GameScene` still owns pause gates, settings changes, HUD emit, and ResultScene transition.

## Content Layer

The content layer is the current foundation for future custom content and mod content packs.

- `ContentPack`: data bundle shape for weapons, enemies, passives, upgrades, waves, characters, stages, and maps.
- `ContentRegistry`: unified in-memory read entry for registered content.
- `ContentBootstrap`: imports built-in JSON and registers one builtin content pack.
- `ContentValidator`: first-pass validation with warnings for missing references and required fields.
- `ContentId`: default IDs for built-in character, stage, map, and wave set.
- Built-in JSON content: current gameplay data under `src/data/`.

Current status:

- Only the builtin content pack is registered.
- Custom/mod loading is not implemented yet.
- New gameplay systems should avoid direct JSON imports and read definitions through `ContentRegistry` or managers that use it.

## Save Layer

The save layer is the current foundation for persistent settings, selections, progression, cosmetics, and future records.

- `SaveData`: schema version and top-level save shape.
- `SaveStorage`: localStorage read/write/clear with memory fallback.
- `SaveMigrator`: default save creation, schema migration hook, and corrupted JSON fallback.
- `SaveManager`: unified load/save/get/update/reset/subscribe entry point.
- `SettingsManager`: domain-based settings entry point backed by `SaveManager.settings`.
- `PlaytestSettings`: compatibility facade for existing callers; new systems should prefer `SettingsManager`.

Current save domains:

- `settings.gameplay`
- `settings.audio`
- `settings.display`
- `settings.input`
- `settings.developer`
- `progression`
- `selections`
- `cosmetics`
- `records`

CSV playtest logs are separate from formal save data unless explicitly integrated later.

## Appearance Layer

The appearance layer is the foundation for future themes, skins, UI themes, map themes, and mod art packs.

- `AppearanceRegistry`: registers built-in and future custom theme/skin definitions.
- `AppearanceManager`: reads/writes the active appearance selection through `SaveManager.cosmetics`.
- `ThemeDefinition`: describes a theme and optional asset override sets.
- `SkinDefinition`: describes target-specific skins for characters, weapons, enemies, bosses, UI, world, and effects.
- `ThemeAssetOverrides`: maps logical asset keys to concrete Phaser texture, animation, icon, UI, world, or audio keys.
- `AssetKeyResolver`: remains the single runtime asset-key path. It checks active appearance overrides first, then falls back to the default art-pack/legacy key map.

Current status:

- Only the `default` theme is registered.
- No appearance selection UI or mod art loader exists yet.
- Default appearance overrides are empty, so current visuals remain unchanged.

## Character / Stage / Map Layer

These managers prepare the project for multi-character, multi-stage, and multi-map selection without adding UI yet.

- `SelectionManager`: future-facing facade for character, stage, map, difficulty, challenge, custom stage, seed, and ruleset selections.
- `SelectionState`: serializable selected IDs for the current intended run.
- `SelectionSummary`: display-friendly current selection validation and names for Title/future selection scenes.
- `CharacterManager`: reads character definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `default`.
- `StageManager`: reads stage definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `stage_001`.
- `MapManager`: reads map definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `prototype_field`.

Current defaults:

- Character: `default`
- Stage: `stage_001`
- Map: `prototype_field`

Minimal Character/Stage selection UI exists. Full custom stage, random stage, daily challenge, unlock-aware, and detailed preview selectors are still planned.

Valid custom stages saved through `CustomStageStorage` are exposed by `StageManager.listSelectableStages()` and can be selected in `StageSelectScene`. They are not registered into the builtin `ContentRegistry`; `SelectionManager` stores `selectedCustomStageId`, while `StageManager`, `MapManager`, and `GameplayInitializer` resolve the package at runtime.

## Progression Layer

Progression owns upgrade availability, upgrade application, passive effects, weapon evolution, and auto upgrade selection.

- `UpgradeFlow`: central entry point for level-up upgrades, auto upgrade choice, treasure rewards, treasure-triggered evolution, invalid reward handling, and endless rewards.
- `UpgradeSelector`: filters and selects available upgrade options.
- `UpgradeApplier`: applies upgrade effects to player stats, weapons, passives, and endless reward helpers.
- `AutoUpgradeSelector`: weighted upgrade selector for automated testing.
- `PassiveManager`: tracks passive levels and passive-derived modifiers.
- `WeaponManager`: owns weapon list, weapon upgrades, evolution replacement, damage/hit/kill stats, and build display info.
- `WeaponTag`: classifies weapons for future passives, relics, mutators, challenges, limited weapon pools, and custom content.
- `WeaponBehaviorConfig`: data shape for projectile, aura, orbit, arcing, and homing behavior metadata.
- `WeaponBehaviorFactory` / `WeaponBehaviorRegistry`: lightweight behavior wrapper foundation; current built-in weapons still run through concrete weapon classes.
- `EvolutionManager`: evaluates evolution rules and applies weapon evolution through `WeaponManager`.

Important rule: `UpgradeFlow` is the preferred orchestration point. `GameScene` and `TreasureManager` should not duplicate upgrade/evolution details.

## Combat Layer

Enemy, Boss, and combat behavior are split from the main scene.

- `Enemy`: runtime enemy entity and per-enemy state.
- `EnemyFactory`: creates enemies from registry-backed data, with optional runtime stat overrides.
- `EnemyFlow`: updates enemy movement, removes dead enemies, applies contact damage, handles shield absorption, records kills, and triggers player damage reaction.
- `EnemyModifierRuntime`: optional per-enemy modifier lifecycle for future elite enemies, affixes, custom waves, and mod content.
- `EnemyModifierFactory` / `EnemyModifierRegistry`: create built-in or future registered enemy modifiers from config.
- `BossController`: controls final Boss warning, spawn, ranged warning attack, dash, dash hit detection, Boss kill state, and Boss-related run stats.
- `EndlessBossManager`: manages rotating endless Boss spawns, active Boss state, and `BossSkillRuntime` updates.
- `BossSkillFactory`: creates data-driven Boss skills such as dash, beam, summon, shockwave, and slow zone from Boss skill configs.

## Rules Layer

The rules layer is the foundation for future difficulty, challenge, custom stage, seeded run, and mod rule combinations.

- `DifficultyDefinition`: data shape for Easy / Normal / Hard-style baseline multipliers.
- `DifficultyManager`: resolves the selected difficulty from save-backed selections and falls back to `normal`.
- `MutatorConfig`: serializable rule modifier data for enemy stats, spawn rate, treasure rate, EXP rate, Boss timing, and weapon pool restrictions.
- `MutatorFactory` / `MutatorRegistry`: create built-in or future registered mutators from config.
- `RunRuleSet`: the per-run effective rules object. It applies difficulty first, then configured mutators in order.

Current default behavior is `normal` difficulty with no mutators, so gameplay values remain unchanged. Future systems should add rule changes through `RunRuleSet` rather than direct `GameScene`, `SpawnDirector`, or `EnemyFactory` conditionals.

## Endless Layer

Endless systems activate after the final Boss is killed when Endless Mode is enabled.

- `EndlessManager`: starts endless state, spawns endless enemies in tiers, applies enemy stat scaling, and uses a soft enemy cap.
- `EndlessBossManager`: periodically spawns random endless Bosses and delegates concrete skill behavior to `BossSkillRuntime`.
- `EndlessRewardManager`: provides post-cap rewards, temporary buffs, permanent minor growth, shield stacks, and global enemy slow multiplier.
- `EndlessLeaderboard`: stores local top-10 endless results in `localStorage`.

## Run Logging Layer

Run logging is separated from gameplay object ownership.

- `RunState`: mutable per-run counters and paths, including upgrades, treasure, evolution, Boss, endless scaling, rewards, slow, shield, and endless Boss fields.
- `RunResultBuilder`: gathers `RunState`, `RunStats`, managers, player state, and Boss state into ResultScene data and CSV data.
- `PlaytestLog`: CSV schema and row generation.
- `PlaytestLogBuffer`: persistent all-run CSV buffer in `localStorage`.
- `RunStats`: damage, hit, kill, HP, and weapon stat aggregation.

## UI Layer

UI classes should display state, not own gameplay rules.

- `HUD`: HP/EXP bars, time, goal, build rows, minimap, shield/endless text, and Pause button.
- `LevelUpPanel`: displays upgrade options and optional auto-select behavior.
- `PauseMenu`: main pause menu and Stats / Build detail page.
- `SettingsMenu`: reusable settings overlay for Title, Pause, and Result flows.
- `HelpOverlay`: tabbed help system built from data/config where possible.
- `ResultScene`: compact summary, CSV export, Settings, and leaderboard display.
- `UITheme`: shared colors, font sizes, button metrics, and panel constants.

## Responsive Layer

Responsive helpers centralize screen layout rules.

- `ScreenManager`: wraps Phaser scale size, center, orientation, and resize subscriptions.
- `LayoutConfig`: computes HUD, menu, result, help, title, level-up, minimap, joystick, and button layouts.
- `SafeArea`: provides conservative edge insets for desktop and mobile-like screens.

## Asset / Audio / i18n Layer

- `PreloadScene`: central asset/audio preload and spritesheet animation creation.
- Art pack assets: `public/assets/art/` plus `animation_manifest.json`.
- `AssetKeyResolver`: centralized texture, animation, icon, and fallback resolution, including the appearance override hook.
- `AudioManager`: channel-based audio playback for BGM, SFX, weapon, and UI channels.
- `I18n`: locale lookup, fallback, and interpolation.
- `Locale`: supported locales and display names.

## High-Level Runtime Flow

```text
BootScene / PreloadScene
  -> preload assets and ensure runtime can use registered content
TitleScene
  -> CharacterSelectScene / StageSelectScene for minimal selection
  -> CustomStageToolScene for local custom stage package validation/storage
  -> GameScene
    -> SelectionManager / managers resolve selected character/stage/map
    -> Custom stage packages, when selected, provide runtime stage/map/waves
    -> DifficultyManager and stage mutator configs create RunRuleSet
    -> GameplayInitializer creates GameplayContext
    -> GameplayUpdater updates runtime systems
    -> UpgradeFlow handles level-up, treasure, evolution, and endless rewards
    -> EnemyFlow handles enemy update/contact damage
    -> BossController handles final Boss state and attacks
    -> EndlessManager / EndlessBossManager handle post-Boss pressure
    -> RunState records per-run stats
    -> RunResultBuilder builds ResultScene data and CSV
  -> ResultScene
```

## Current Boundaries

- UI displays runtime state and sends user intents through scene events.
- Upgrade and treasure reward rules should go through `UpgradeFlow`.
- Weapon archetype interactions should prefer tags/behavior config over weapon-id-only conditionals when possible.
- Enemy movement and contact damage should go through `EnemyFlow`.
- Enemy affixes should go through `EnemyModifierRuntime`; do not create a new enemy ID for every stat/behavior combination.
- Final Boss-specific state should go through `BossController`.
- Endless Boss lifecycle should go through `EndlessBossManager`; concrete Boss skills should go through `BossSkillFactory` and `BossSkillRuntime`.
- Per-run result fields should be added to `RunState` and `RunResultBuilder`, not manually assembled in UI.
- Persistent player selections and settings should go through `SaveManager`.
- Future character/stage/map/custom-stage UI should write through `SelectionManager`.
- Gameplay content should go through `ContentRegistry` or managers backed by it, not direct JSON imports.
- Difficulty, challenge, custom-stage, and mod rule changes should go through `RunRuleSet`.
- Future skins, themes, and art packs should go through `AppearanceManager` and `AssetKeyResolver`, not direct texture strings in gameplay/UI classes.
