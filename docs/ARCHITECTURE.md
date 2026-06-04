# Architecture

This document describes the current project architecture. The codebase is still a prototype, but the main runtime systems are now split into smaller layers.

## Scene Layer

Scenes own Phaser lifecycle, scene transitions, and high-level UI/gameplay coordination.

- `BootScene`: bootstraps the scene flow.
- `PreloadScene`: loads legacy assets, art pack assets, spritesheets, animations, and audio keys.
- `TitleScene`: start screen, auto-test countdown, Settings, Help, and BGM entry point.
- `GameScene`: main scene lifecycle, pause/resume, settings change handling, result transition, HUD emit, and gameplay runtime callbacks.
- `UIScene`: overlay scene for HUD, LevelUpPanel, PauseMenu, temporary messages, and UI events.
- `ResultScene`: compact run summary, CSV download, auto restart, Settings, and endless leaderboard display.

## Gameplay Runtime Layer

The runtime layer keeps most per-run object references out of `GameScene`.

- `GameplayContext`: per-run reference container for player, managers, flows, controllers, runtime settings, and active systems.
- `GameplayInitializer`: creates the per-run systems in a stable order and returns a `GameplayContext`.
- `GameplayUpdater`: advances runtime systems each frame in the intended update order.

Current data flow:

1. `GameScene` starts the run.
2. `GameplayInitializer` creates the `GameplayContext`.
3. `GameScene.update()` delegates gameplay update to `GameplayUpdater`.
4. `GameScene` still handles pause gates, settings changes, HUD emit, and ResultScene transition.

## Progression Layer

Progression owns upgrade availability, upgrade application, passive effects, weapon evolution, and auto upgrade selection.

- `UpgradeFlow`: central entry point for level-up upgrades, auto upgrade choice, treasure rewards, treasure-triggered evolution, invalid reward handling, and endless rewards.
- `UpgradeSelector`: filters and selects available upgrade options.
- `UpgradeApplier`: applies upgrade effects to player stats, weapons, passives, and endless reward helpers.
- `AutoUpgradeSelector`: weighted upgrade selector for automated testing.
- `PassiveManager`: tracks passive levels and passive-derived modifiers.
- `WeaponManager`: owns weapon list, weapon upgrades, evolution replacement, damage/hit/kill stats, and build display info.
- `EvolutionManager`: evaluates evolution rules and applies weapon evolution through `WeaponManager`.

Important rule: `UpgradeFlow` is the preferred orchestration point. `GameScene` and `TreasureManager` should not duplicate upgrade/evolution details.

## Combat / Enemy Layer

Enemy and Boss behavior is split from the main scene.

- `Enemy`: runtime enemy entity and per-enemy state.
- `EnemyFactory`: creates enemies from data, with optional runtime stat overrides for Endless Mode.
- `EnemyFlow`: updates enemy movement, removes dead enemies, applies contact damage, handles shield absorption, records kills, and triggers player damage reaction.
- `BossController`: controls final Boss warning, spawn, ranged warning attack, dash, dash hit detection, Boss kill state, and Boss-related run stats.
- `BossAttackController`: handles the Boss radial projectile warning and projectile lifecycle.
- `BossSpawnDirector`: selects Boss spawn placement.

Boss dash and Boss ranged projectiles are currently controlled by source constants and enemy config. Stage/Boss config files may be expanded later, but there is no full stage-selection UI yet.

## Endless Layer

Endless systems activate after the final Boss is killed when Endless Mode is enabled.

- `EndlessManager`: starts endless state, spawns endless enemies in tiers, applies enemy stat scaling, and uses a soft enemy cap.
- `EndlessRewardManager`: provides post-cap rewards, temporary buffs, permanent minor growth, shield stacks, and global enemy slow multiplier.
- `EndlessLeaderboard`: stores local top-10 endless results in `localStorage`.

## Run Logging Layer

Run logging is separated from gameplay object ownership.

- `RunState`: mutable per-run counters and paths, including upgrades, treasure, evolution, Boss, endless scaling, rewards, slow, and shield fields.
- `RunResultBuilder`: gathers `RunState`, `RunStats`, managers, player state, and Boss state into ResultScene data and CSV data.
- `PlaytestLog`: CSV schema and row generation.
- `PlaytestLogBuffer`: persistent all-run CSV buffer in `localStorage`.
- `RunStats`: damage, hit, kill, HP, and weapon stat aggregation.

Current data flow:

1. Runtime systems call `RunState.record...()` methods.
2. At run end, `RunResultBuilder` builds ResultScene data.
3. `RunResultBuilder` creates CSV through `PlaytestLog`.
4. `PlaytestLogBuffer` appends and persists the CSV row.

## UI Layer

UI classes should display state, not own gameplay rules.

- `HUD`: HP/EXP bars, time, goal, build rows, minimap, shield text, and Pause button.
- `LevelUpPanel`: displays upgrade options and optional auto-select behavior.
- `PauseMenu`: main pause menu and Stats / Build detail page.
- `SettingsMenu`: reusable settings overlay for Title, Pause, and Result flows.
- `HelpOverlay`: tabbed help system built from `HelpContentBuilder`.
- `UITheme`: shared colors, font sizes, button metrics, and panel constants.

## Responsive Layer

Responsive helpers centralize screen layout rules.

- `ScreenManager`: wraps Phaser scale size, center, orientation, and resize subscriptions.
- `LayoutConfig`: computes HUD, menu, result, help, title, level-up, minimap, and button layouts.
- `SafeArea`: provides conservative edge insets for desktop and mobile-like screens.

## Asset / Audio / i18n Layer

- `PreloadScene`: central asset/audio preload and spritesheet animation creation.
- `AudioManager`: channel-based audio playback for BGM, SFX, weapon, and UI channels.
- `I18n`: locale lookup, fallback, and interpolation.
- `Locale`: supported locales and display names.

## High-Level Runtime Flow

```text
TitleScene
  -> GameScene
    -> GameplayInitializer creates GameplayContext
    -> GameplayUpdater updates runtime systems
    -> UpgradeFlow handles level-up, treasure, evolution, and endless rewards
    -> EnemyFlow handles enemy update/contact damage
    -> BossController handles Boss state and Boss attacks
    -> RunState records per-run stats
    -> RunResultBuilder builds ResultScene data and CSV
  -> ResultScene
```

## Current Boundaries

- UI displays runtime state and sends user intents through scene events.
- Upgrade and treasure reward rules should go through `UpgradeFlow`.
- Enemy movement and contact damage should go through `EnemyFlow`.
- Boss-specific state should go through `BossController`.
- Per-run result fields should be added to `RunState` and `RunResultBuilder`, not manually assembled in UI.
