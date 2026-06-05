# Architecture

This document is the primary architecture reference for Codex and future development. The project is still a playable prototype, but major systems are now separated into explicit layers.

## Implementation Readiness

The broad architecture foundation is complete enough to stop adding new generic systems and begin content proof work. New architecture should now be justified by a concrete playable feature, tool workflow, or validation gap.

Current readiness:

- Runtime foundations for save/settings/content/assets/selection/random/events/rules/replay/version/debug are in place.
- Minimal UI exists for character/stage selection, custom stage tools, records, replay tools, daily challenge, settings, help, and result flow.
- Several systems are intentionally foundation-only: appearance themes, relics without drops, full replay playback, remote providers, full mod loading, milestone depth, and playtest scenario batches.
- The next architecture pressure should come from adding real characters, stages, Bosses, relics, elite enemies, and custom stage examples rather than creating more registries.

## Scene Layer

Scenes own Phaser lifecycle, scene transitions, high-level UI/gameplay coordination, and scene events.

- `BootScene`: bootstraps the scene flow.
- `PreloadScene`: loads legacy assets, art pack assets, spritesheets, animations, and audio keys.
- `TitleScene`: start screen, auto-test countdown, Settings, Help, and title BGM entry point.
- `CharacterSelectScene`: minimal character selection scene backed by `SelectionManager`.
- `StageSelectScene`: minimal stage selection scene backed by `SelectionManager`.
- `CustomStageToolScene`: local custom stage package paste/validate/save/export utility.
- `CustomStageEditorLiteScene`: prompt-driven custom stage basics and wave editor.
- `RecordsScene`: read-only achievements, local leaderboards, and unlock state viewer.
- `ReplayToolScene`: developer replay import/export/compatibility utility; no playback.
- `DailyChallengeScene`: minimal local daily challenge summary and activation scene.
- `GameScene`: main lifecycle, pause/resume, settings change handling, result transition, HUD emit, and gameplay runtime callbacks.
- `UIScene`: overlay scene for HUD, LevelUpPanel, PauseMenu, temporary messages, and UI events.
- `ResultScene`: compact run summary, CSV download, auto restart, Settings, and endless leaderboard display.

## Runtime Layer

The runtime layer keeps per-run object references and update order out of the scene as much as possible.

- `GameplayContext`: per-run reference container for player, managers, flows, controllers, runtime settings, and active systems.
- `GameplayInitializer`: creates per-run systems in a stable order and returns `GameplayContext`.
- `GameplayUpdater`: advances runtime systems each frame in the intended update order.
- `PerformanceMonitor`: per-run lightweight stats collector for FPS, counts, and object lifecycle counters.
- `PoolManager`: per-run object pool registry for reusable runtime visuals and future high-volume objects.
- `check-architecture-boundaries.mjs`: warning-only static guard for direct JSON imports, direct `Math.random`, direct `localStorage`, scattered asset keys, and `GameScene` growth.

Current flow:

1. `GameScene` starts the run.
2. `GameScene` obtains selected character/stage/map through managers.
3. `GameplayInitializer` builds the runtime systems and returns `GameplayContext`.
4. `GameScene.update()` delegates runtime update to `GameplayUpdater`.
5. `GameScene` still owns pause gates, settings changes, HUD emit, and ResultScene transition.

## Event Layer

The event layer is the foundation for future achievements, quests, tutorials, replay/debug tooling, unlocks, audio listeners, floating text listeners, and cross-system statistics.

- `GameEventType`: stable dot-name event type definitions such as `enemy.killed`, `weapon.evolved`, and `pickup.treasureOpened`.
- `GameEventPayloads`: typed payload shapes for common runtime events.
- `GameEvent`: normalized emitted event with id, type, payload, game time, real timestamp, and optional run id.
- `GameEventBus`: per-run event bus with type subscriptions, all-event subscriptions, and listener error isolation.
- `GameEventRecorder`: bounded in-memory recent event recorder for debugging and future replay foundations.
- `GameEventBridge`: bridges selected legacy `EventBus` events into `GameEventBus` during the migration period.
- `GameEventSubscription`: common listener/unsubscribe types.

Current status:

- `GameplayInitializer` creates one `GameEventBus`, one `GameEventRecorder`, and a legacy bridge per run.
- Existing `core/EventBus`, Phaser scene events, and callbacks still exist.
- `GameEventBridge` currently mirrors high-value legacy events such as enemy kills, level-ups, and EXP collection.
- `GameScene`, `TreasureManager`, `UpgradeFlow`, and `EnemyFlow` emit selected new events without replacing existing gameplay statistics.
- `RunState` still owns gameplay counters directly; it is not fully event-driven yet, which avoids duplicate counting during migration.

## Achievement / Milestone Layer

The achievement layer is the foundation for future achievements, tasks, unlocks, tutorial goals, daily challenge objectives, and meta progression.

- `AchievementDefinition`: data shape for achievement id, i18n keys, trigger type, conditions, rewards, and category.
- `AchievementProgress`: persistent per-achievement unlock/progress state stored in save data.
- `AchievementRegistry`: registers built-in and future content/mod achievement definitions.
- `AchievementEvaluator`: evaluates `GameEvent` and run-end summaries against definition conditions.
- `AchievementManager`: subscribes to `GameEventBus`, unlocks non-repeatable achievements, and writes progress through `SaveManager`.
- `AchievementReward`: reward data shape for future character/stage/map/cosmetic/currency unlocks.
- `MilestoneDefinition` / `MilestoneManager`: shell for future multi-threshold counters such as kill 100 / 1000 / 10000.
- `BuiltInAchievements`: small starter set used to validate the event-driven foundation.

Current status:

- There is no Achievement UI yet.
- Unlock side effects are not applied yet; rewards are data only.
- Built-in achievements listen to events such as `enemy.killed`, `player.levelUp`, `pickup.treasureOpened`, `weapon.evolved`, `boss.killed`, `endless.started`, and `run.ended`.
- Achievement progress is formal save data under `SaveData.progression.achievements`, not CSV playtest data.

## Tutorial / Guide Layer

The tutorial layer is the foundation for event-driven starter guidance, first-time hints, Help prompts, mobile control tips, and future guided objectives.

- `TutorialStep`: data shape for tutorial id, i18n keys, trigger, one-time behavior, priority, and optional Help tab link.
- `TutorialTrigger`: serializable trigger shape for GameEvent, time, or named condition prompts.
- `TutorialRegistry`: registers built-in and future content/mod tutorial steps.
- `TutorialManager`: subscribes to `GameEventBus`, evaluates tutorial triggers, marks one-time steps as seen, and persists state through `SaveManager`.
- `TutorialState`: save-backed disabled flag and seen step ids.
- `BuiltInTutorials`: starter definitions for first level-up, treasure, evolution, Boss, endless, and mobile joystick hints.

Current status:

- There is no large tutorial UI yet.
- Tutorial prompts are non-blocking and must not pause combat.
- If no UI listener is attached, `TutorialManager` logs a lightweight console hint.
- Tutorial state is formal save data under `SaveData.progression.tutorial`.

## Unlock Layer

The unlock layer is the foundation for future character, stage, map, weapon, passive, cosmetic, theme, difficulty, challenge, daily reward, achievement reward, and meta-progression unlocks.

- `UnlockableType`: built-in unlock target types plus future custom/mod extension strings.
- `UnlockDefinition`: data shape for unlock id, target type/id, optional display keys, default-unlocked status, hidden flag, and future conditions.
- `UnlockCondition`: reserved condition shape for achievement, milestone, run, endless, kill-count, and custom unlock rules.
- `UnlockReward`: simple reward target shape for systems that grant unlocks.
- `UnlockRegistry`: registers built-in and future content/mod unlock definitions.
- `UnlockManager`: canonical read/write entry for unlock state backed by `SaveManager.progression`.
- `BuiltInUnlocks`: registers current default character, stage, map, and theme as unlocked.

Current status:

- Existing default content remains unlocked.
- No unlock UI exists yet.
- Character, Stage, and Map managers expose unlock-aware listing helpers.
- Achievement rewards can call `UnlockManager`, but built-in achievements currently do not grant unlock rewards.
- Unlock progress is formal save data, not CSV data.

## Content Layer

The content layer is the current foundation for future custom content and mod content packs.

- `ContentPack`: data bundle shape for weapons, enemies, passives, upgrades, waves, characters, stages, and maps.
- `ContentPackManifest`: metadata shape for future builtin/custom/mod/remote pack discovery.
- `ContentPackSource`: source descriptor for builtin, local, custom, mod, or remote content sources.
- `ContentPackProvider`: async provider interface for listing manifests and loading packs.
- `LocalContentPackProvider`: localStorage/memory shell; not connected to runtime registration.
- `ContentRegistry`: unified in-memory read entry for registered content.
- `ContentBootstrap`: imports built-in JSON and registers one builtin content pack.
- `ContentValidator`: first-pass validation with warnings for missing references and required fields.
- `ContentId`: default IDs for built-in character, stage, map, and wave set.
- Built-in JSON content: current gameplay data under `src/data/`.

Current status:

- Only the builtin content pack is registered.
- Local custom stages are stored and selected outside the builtin registry.
- Custom/mod content pack loading is not implemented yet.
- Remote pack providers are interface-only and make no network requests.
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

These managers prepare the project for multi-character, multi-stage, and multi-map selection.

- `SelectionManager`: future-facing facade for character, stage, map, difficulty, challenge, custom stage, seed, and ruleset selections.
- `SelectionState`: serializable selected IDs for the current intended run.
- `SelectionSummary`: display-friendly current selection validation and names for Title/future selection scenes.
- `CharacterManager`: reads character definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `default`.
- `CharacterRuntime`: per-run character runtime for starting weapon, skin id, level-based base stat growth, level-up effects, and damage reaction skills.
- `CharacterStats` / `PlayerStats`: shared stat model for character combat, defense, and resource identity, including generic damage, weapon tag multipliers, crit fields, cooldown, knockback, damage taken, armor, healing, shield gain, EXP, treasure, and future upgrade choice bonuses.
- `CharacterLevelUpEffect`: data-driven level-up effects such as the Assassin's lost-HP heal.
- `CharacterDamageReactionSkill`: data-driven damage reactions such as shockwave, blink-forward escape, Witch slow-trail zones, Priest holy sanctuary, Warrior iron counter, and future defensive behaviors.
- `StageManager`: reads stage definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `stage_001`.
- `MapManager`: reads map definitions from `ContentRegistry`, selected ID from `SaveManager`, and falls back to `prototype_field`.

Current defaults:

- Character selection: `random_unlocked` (virtual selection id; resolved to a real unlocked character at run start)
- Stage: `stage_001`
- Map: `prototype_field`

Minimal Character/Stage selection UI exists. `random_unlocked` is a selection-layer virtual character id, not a `ContentRegistry` character and not a `characters.json` entry. When selected, `GameplayInitializer` creates the run seed, forks the run RNG, resolves a real unlocked character for that run, and records both `selectedCharacterId` and actual `characterId` in run metadata and CSV. Current built-in characters are default-unlocked during content proof so Assassin, Witch, Priest, and Warrior can be selected or randomly rotated for testing; future formal unlock design can change selected definitions to locked. Character definitions now include initial stats, per-level growth, starting weapon, optional skin id, level-up effect, damage reaction skill, and reserved exclusive upgrade/evolution ids. The runtime syncs deterministic character combat modifiers into `WeaponManager`: global damage, physical, magic, projectile, aura, orbit, area, explosion, Boss, elite, cooldown, projectile speed, and knockback multipliers can affect weapon behavior through weapon tags and target context. Assassin/default uses a blink-forward damage reaction through `CharacterRuntime`, `PlayerController`, and `PlayerHealth`, granting short invulnerability and a temporary move speed boost after real HP damage. Witch uses a deterministic slow-trail damage reaction that creates temporary ground zones; `EnemyFlow` applies the zone multiplier during enemy movement without changing enemy base stats. Priest uses holy sanctuary to create a short defensive visual, knock back nearby non-Boss enemies, heal, and add a general `PlayerHealth` shield stack. Warrior uses iron counter to create a short shockwave, damage and knock back nearby non-Boss enemies, and apply temporary `PlayerHealth` damage reduction without healing or shields. Crit chance/damage, dodge, resource multipliers, and deeper defense hooks remain reserved until dedicated gameplay tasks wire them in. Custom stages can appear in Stage Select after validation and local storage. Map selection, random stage selection, difficulty selection, detailed previews, unlock presentation, and custom challenge selection remain planned.

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

## Relic Layer

Relics are the foundation for future rule-changing items and special run mechanics. They are intentionally separate from passives.

- `RelicDefinition`: data shape for relic id, i18n keys, rarity, tags, and effect configs.
- `RelicEffect`: optional effect hooks for attach/detach/update, weapon damage, treasure chance, damage taken, and game events.
- `RelicEffectContext`: runtime dependencies passed to effects without exposing `GameScene`.
- `RelicEffectFactory`: creates built-in relic effects from effect configs.
- `RelicRegistry`: registers built-in or future custom/mod relic definitions.
- `RelicManager`: owns active run relics and applies effect modifiers.
- Built-in effect classes currently cover treasure-rate, weapon-tag damage, damage-taken, and event-triggered foundations.

Current status:

- `GameplayInitializer` creates an empty `RelicManager` for each run and stores it in `GameplayContext`.
- No relic drops, relic choices, relic UI, or save persistence are implemented yet.
- With no active relics, all modifiers return the original value and gameplay is unchanged.

Boundary:

- Passive = upgradeable numeric growth.
- Relic = rule changes or special mechanics.
- Do not put relic-style rule changes into `PassiveManager`.

## Combat Layer

Enemy, Boss, and combat behavior are split from the main scene.

- `Enemy`: runtime enemy entity and per-enemy state.
- `Enemy.getDamageTargetContext()`: exposes deterministic target type context for weapon damage modifiers without changing enemy stats.
- `EnemyFactory`: creates enemies from registry-backed data, with optional runtime stat overrides.
- `EnemyFlow`: updates enemy movement, removes dead enemies, applies contact damage, updates player survival timers, handles general PlayerHealth and Endless reward shield absorption, records kills, and triggers player damage reaction.
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

## Random Layer

The random layer is the foundation for seeded runs, replay debugging, daily challenges, random stages, and fair leaderboard grouping.

- `RandomSource`: common random interface for numbers, chance, pick, weighted pick, shuffle, and forked streams.
- `SeededRandom`: deterministic string-seeded PRNG.
- `RandomManager`: per-run root random plus domain streams for gameplay, upgrades, spawn, treasure, endless, Boss, and visual randomness.
- `RunSeed`: creates or normalizes run seeds from selection state.
- `RandomUtils`: shared geometry and weighted-choice helpers.

`GameplayInitializer` creates one `RandomManager` per run. New gameplay randomness should receive a `RandomSource` or `RandomManager` through constructor/config injection rather than using `Math.random()` or a global singleton.

Current migration note:

- Upgrade option selection, spawn positions, treasure checks, and endless Boss random choices have seeded paths.
- Some compatibility or low-risk utility paths still use `Math.random()` for ids, sessions, or not-yet-migrated fallback choices. Do not add new gameplay randomness through direct `Math.random()`.

## Challenge Layer

The challenge layer is the foundation for daily, weekly, seeded, and custom challenge rules.

- `ChallengeDefinition`: serializable challenge selection, seed, difficulty, mutator, and mode shape.
- `DailyChallengeGenerator`: deterministic local-date daily challenge generator using `daily:YYYY-MM-DD` seeds.
- `ChallengeRegistry`: optional registry for generated or future content-provided challenges.
- `ChallengeManager`: activates or clears a challenge by writing through `SelectionManager`.
- `ChallengeRules`: summary/helper layer for challenge rule display.

Current status:

- `DailyChallengeScene` provides a minimal visible entry and can start today's local challenge.
- There is no online challenge service, reward flow, calendar browser, or challenge editor.
- Normal Title Start Game clears active challenge selection so ordinary runs do not inherit challenge seed/rules.

## Replay Layer

The replay layer is the foundation for future automated test reproduction, balance debugging, seed verification, daily challenge validation, and leaderboard fairness checks.

- `ReplayData`: versioned replay record shape with run seed, selection snapshot, settings snapshot, input samples, event markers, and result summary.
- `ReplayRecorder`: per-run recorder shell. It records selected key `GameEventBus` events and can accept future throttled input samples.
- `ReplaySerializer`: JSON serialize/parse/validate helper for replay data.
- `ReplayStorage`: localStorage-backed recent replay storage with memory fallback and a cap of 10 records.
- `ReplayPlaybackController`: shell for future playback loading; it does not inject input or simulate playback yet.
- `ReplayVersion`: replay schema and storage key constants.

Current status:

- `GameplayInitializer` creates a `ReplayRecorder` per run and stores it in `GameplayContext`.
- `GameScene` stops the recorder at run end and saves the latest replay data through `ReplayStorage`.
- Input sampling is not connected yet because the project does not have an `InputState` / `InputMapper` layer.
- Replay data is separate from formal `SaveData`, CSV logs, and leaderboard records.
- This is not complete playback; deterministic replay still needs input injection, content hashes, version compatibility, and stable update order.

## Endless Layer

Endless systems activate after the final Boss is killed when Endless Mode is enabled.

- `EndlessManager`: starts endless state, spawns endless enemies in tiers, applies enemy stat scaling, and uses a soft enemy cap.
- `EndlessBossManager`: periodically spawns random endless Bosses and delegates concrete skill behavior to `BossSkillRuntime`.
- `EndlessRewardManager`: provides post-cap rewards, temporary buffs, permanent minor growth, shield stacks, and global enemy slow multiplier.
- `EndlessLeaderboard`: stores local top-10 endless results in `localStorage`.

`EndlessLeaderboard` is a compatibility facade over `LeaderboardManager` and `SaveManager.records.leaderboardsByKey`. New records should use `LeaderboardKey`.

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
- `RecordsPanel`, `AchievementListPanel`, `LeaderboardPanel`, and `UnlocksPanel`: read-only records viewer components.
- `ReplayListPanel`, `ReplayDetailPanel`, and `ReplayImportPanel`: replay tool components.
- `DailyChallengePanel` and `ChallengeSummaryPanel`: daily challenge summary components.
- `CustomStageEditorPanel`, `CustomWaveEditorPanel`, and `CustomStageValidationPanel`: custom stage tool/editor components.
- `DebugPanel`: developer-only diagnostics overlay, hidden by default.
- `UITheme`: shared colors, font sizes, button metrics, and panel constants.

`FloatingTextManager` is the first low-risk object-pool integration. It reuses floating text objects through `ObjectPool` while preserving the same visual behavior. Other high-volume objects such as projectiles, pickups, Boss warning graphics, explosion circles, and hit flashes remain create/destroy based until they can be profiled and migrated safely.

## Performance Layer

The performance layer is the foundation for late-endless profiling and future object pooling.

- `PerformanceStats`: shared stats shape for FPS, delta, entity counts, pool counts, and object lifecycle counters.
- `PerformanceMonitor`: lightweight per-run stats collector updated by `GameplayUpdater`.
- `Poolable`: interface for objects that can reset, release, and report active pool state.
- `ObjectPool`: generic bounded pool for reusable `Poolable` objects.
- `PoolManager`: central per-run registry for named pools.
- `PooledObjectFactory`: factory contract used by pools.

Current status:

- DebugPanel can show floating text and pool counts.
- Floating text is pooled.
- Enemies, projectiles, pickups, treasure chests, and Boss skill graphics are not pooled yet.
- Performance monitoring must not change gameplay behavior or CSV schemas.

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

## Remote Provider Layer

Remote providers are interface-only foundations for future online adapters.

- `RemoteProviderResult`: shared success/data/errors/warnings/status result shape.
- `RemoteLeaderboardProvider`: future leaderboard submit/fetch contract.
- `RemoteSaveProvider`: future cloud save upload/download contract.
- `RemoteChallengeProvider`: future remote daily challenge fetch contract.
- `RemoteCustomStageProvider`: future custom stage upload/fetch/search contract.

Current status:

- No implementation performs network requests.
- No remote provider is called by runtime gameplay.
- Remote data must go through validation, compatibility checks, and explicit manager flows before it can affect content, saves, leaderboards, or selections.

## High-Level Runtime Flow

```text
BootScene / PreloadScene
  -> preload assets and ensure runtime can use registered content
TitleScene
  -> CharacterSelectScene / StageSelectScene for minimal selection
  -> CustomStageToolScene for local custom stage package validation/storage
  -> CustomStageEditorLiteScene for lightweight local package editing
  -> RecordsScene / ReplayToolScene / DailyChallengeScene for foundation viewers/tools
  -> GameScene
    -> SelectionManager / managers resolve selected character/stage/map
    -> Custom stage packages, when selected, provide runtime stage/map/waves
    -> RunSeed / RandomManager create seeded random streams
    -> DifficultyManager and stage mutator configs create RunRuleSet
    -> GameplayInitializer creates GameplayContext
    -> GameEventBus / GameEventRecorder / GameEventBridge start per-run event capture
    -> ReplayRecorder starts a per-run replay shell from seed, selection, settings, and key events
    -> AchievementManager subscribes to GameEventBus for low-risk achievement unlocks
    -> TutorialManager subscribes to GameEventBus for low-risk one-time guide prompts
    -> UnlockManager ensures built-in default content is unlocked
    -> RelicManager is created empty for future rule-changing run items
    -> PerformanceMonitor / PoolManager start per-run diagnostics and reusable object pools
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
- Relic-style rule changes should go through `RelicManager` and `RelicEffect`, not `PassiveManager`.
- Enemy movement and contact damage should go through `EnemyFlow`.
- Enemy affixes should go through `EnemyModifierRuntime`; do not create a new enemy ID for every stat/behavior combination.
- Final Boss-specific state should go through `BossController`.
- Endless Boss lifecycle should go through `EndlessBossManager`; concrete Boss skills should go through `BossSkillFactory` and `BossSkillRuntime`.
- Per-run result fields should be added to `RunState` and `RunResultBuilder`, not manually assembled in UI.
- Persistent player selections and settings should go through `SaveManager`.
- Future character/stage/map/custom-stage UI should write through `SelectionManager`.
- Gameplay content should go through `ContentRegistry` or managers backed by it, not direct JSON imports.
- Difficulty, challenge, custom-stage, and mod rule changes should go through `RunRuleSet`.
- Gameplay randomness should go through injected `RandomSource` streams from `RandomManager`.
- New achievements, tutorials, unlocks, replay diagnostics, audio listeners, or floating-text listeners should subscribe to `GameEventBus` rather than scene callbacks.
- Replay data should stay in `ReplayStorage`; do not merge replay blobs into formal save data or CSV rows.
- Achievement and milestone progress should persist through `SaveManager.progression`, not localStorage owned by individual systems.
- Tutorial seen/disabled state should persist through `SaveManager.progression.tutorial`, not through scene-local flags.
- Unlock state should go through `UnlockManager`; Character/Stage/Map managers should not own unlock rules.
- Existing `core/EventBus` and callbacks are still valid during migration; do not delete them until the dependent systems have moved.
- Future skins, themes, and art packs should go through `AppearanceManager` and `AssetKeyResolver`, not direct texture strings in gameplay/UI classes.
- Future high-volume runtime visuals should use `PoolManager` / `ObjectPool` only after behavior-preserving profiling. Do not pool gameplay-critical entities without tests and shutdown cleanup.
- Use `npm.cmd run check:architecture` to surface soft boundary warnings. The script is not ESLint and does not fail by default; intentional compatibility paths should be documented or whitelisted.
