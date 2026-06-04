# Feature Overview

This document summarizes systems currently implemented in the prototype. The project is not a finished game; it is a playable architecture and balance testbed.

## Core Loop

1. Start from the Title Scene.
2. Move around the map and avoid enemies.
3. Defeat enemies with automatic weapons.
4. Collect EXP gems, now with pickup magnet animation.
5. Level up and choose upgrades.
6. Open treasure chests for bonus upgrades, weapon evolution, or endless rewards.
7. Survive until the final Boss appears.
8. Defeat the Boss to win, or continue into Endless Mode if enabled.
9. Review results, local leaderboard data, and playtest statistics in the Result Scene.

## Architecture Foundations

Current foundations:

- Save system: `SaveData`, `SaveStorage`, `SaveMigrator`, `SaveManager`
- Content registry: `ContentPack`, `ContentRegistry`, `ContentBootstrap`, `ContentValidator`, `ContentId`
- Character / Stage / Map foundation: `CharacterManager`, `StageManager`, `MapManager`
- Gameplay runtime split: `GameplayContext`, `GameplayInitializer`, `GameplayUpdater`
- Centralized upgrade routing through `UpgradeFlow`
- Enemy and Boss routing through `EnemyFlow`, `BossController`, and `EndlessBossManager`

These foundations are in place for future multi-character, multi-stage, multi-map, custom content, and save-driven selection systems. Selection UI and mod loading are not implemented yet.

## Controls

- Keyboard movement with WASD / Arrow Keys
- Mouse movement by holding the left mouse button
- Virtual joystick on touch or narrow-screen layouts
- ESC pause
- HUD Pause button in all desktop and mobile layouts

## Player

Implemented player systems:

- HP and max HP
- Damage intake and damage reaction burst
- Knockback after taking damage
- Movement acceleration and inertia
- Swept movement protection for high-speed movement
- Level and EXP progression
- Player stat caps for movement speed, pickup range, and max HP
- Endless shield stacks that can absorb damage after post-cap rewards are unlocked

## Enemies

Implemented enemy systems:

- Registry-backed enemy creation from built-in content
- `EnemyFactory` with optional scaled stat overrides
- `EnemyFlow` for enemy movement, cleanup, contact damage, kill recording, and shield absorption
- Mini boss texture support for `slime_boss`, `bat_boss`, and `golem_boss`
- Weapon knockback with enemy knockback immunity
- Contact cooldowns and swept player contact checks
- EXP gem drops and treasure chest drop chances

Enemy types currently include slime, bat, golem, mini boss variants, endless Boss types, and the final Boss.

## Weapons

Implemented weapon features:

- Base weapons: Knife, Garlic, Bible, Magic Wand, Axe
- Evolved weapons: Thousand Edge, Soul Eater, Unholy Vespers, Holy Wand, Death Spiral
- Weapon projectile animations from spritesheets where available
- Knife / Thousand Edge projectile direction alignment
- Axe / Death Spiral spiral projectile behavior
- Magic Wand / Holy Wand explosion-on-hit behavior
- Weapon knockback, with aura weapons excluded
- Evolved weapons replace base weapons while base upgrade routes can continue improving evolved routes

## Passive Items

Current passive items:

- Spinach
- Empty Tome
- Bracer
- Clover
- Pummarola

Passive effects are tracked by `PassiveManager` and applied through weapon/passive synchronization.

## Upgrade System

Upgrade sources:

- Level-up selection panel
- Treasure chest rewards
- Endless post-cap reward pool

Core pieces:

- `UpgradeSelector` filters available upgrades.
- `UpgradeApplier` applies selected effects.
- `AutoUpgradeSelector` selects weighted auto upgrades.
- `UpgradeFlow` coordinates level-up, auto upgrade, treasure rewards, evolution, invalid rewards, and endless rewards.

## Treasure Chests

Treasure behavior:

- Chests use magnet collection before opening.
- Rewards use the filtered upgrade pool.
- Available evolution is prioritized.
- Normal chest upgrades and chest-triggered evolution are counted separately.
- In Endless Mode after normal upgrades are exhausted, chests can grant endless rewards.
- Endless treasure drops and opens are tracked separately.

## Weapon Evolution

Weapon evolution is triggered by treasure chests and uses `EvolutionManager`.

Current routes:

- Knife + Bracer -> Thousand Edge
- Garlic + Pummarola -> Soul Eater
- Bible + Empty Tome -> Unholy Vespers
- Magic Wand + Spinach -> Holy Wand
- Axe + Spinach -> Death Spiral

## Boss Encounter

The final Boss appears after the survival phase.

Implemented Boss systems:

- `BossController`
- Stage-driven final Boss ID and timing
- Boss warning message
- Boss HP and contact damage from enemy data
- Boss ranged warning attack
- Boss dash attack
- Boss dash hit statistics
- Boss phase damage statistics
- Boss kill victory condition or Endless Mode transition

## Endless Mode

Endless Mode is optional and starts after the final Boss is killed.

Implemented Endless systems:

- `EndlessManager` for post-Boss enemy spawning
- Enemy quantity scaling by endless time
- Enemy HP, damage, speed, and EXP scaling by endless time
- Soft enemy count cap
- `EndlessBossManager` for rotating random endless Boss pressure
- Local endless leaderboard
- Endless treasure open/drop tracking

## Endless Rewards

When normal upgrades are exhausted during Endless Mode, the reward pool switches to post-cap rewards:

- Emergency Heal: restores HP.
- Overdrive: short non-stacking weapon damage burst with cooldown.
- Time Slow: temporarily slows non-Boss enemy movement.
- Shield: grants stackable damage-prevention layers.
- Minor Growth: small permanent weapon damage multiplier gain.

## UI

Implemented UI systems:

- Title menu
- HUD with HP/EXP bars, build lines, minimap, shield/endless text, and Pause button
- Level-up panel with icon-first upgrade cards
- Pause menu with Stats / Build details
- Unified SettingsMenu
- HelpOverlay with tabbed guide content
- ResultScene with compact summary, CSV download, and endless leaderboard
- Responsive layout through `ScreenManager`, `LayoutConfig`, and `SafeArea`
- Virtual joystick for mobile/narrow layouts

## Audio

Audio is managed through `AudioManager`.

Current behavior:

- Audio is disabled by default.
- BGM, SFX, weapon, and UI channels have independent volume settings.
- Missing audio files are safely skipped.
- BGM switches between title, gameplay, boss, and result contexts.
- High-frequency sounds have cooldowns.

## Localization

The i18n layer supports:

- `en-US`
- `zh-CN`
- `ja-JP`

Translation lookup falls back to `en-US`, then to the key itself.

## Automated Playtesting

Implemented test systems:

- Auto Movement
- Auto Upgrade
- Fast Mode
- Weighted upgrade selection for test variety
- Evolution-focused auto upgrade behavior
- Automatic restart from ResultScene
- Persistent CSV buffer through `localStorage`
- Downloadable current-run and all-run CSV logs

## Current Status

The project is currently suitable as a local playable prototype and balance testbed. It is not a finished game.
