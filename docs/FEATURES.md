# Feature Overview

This document summarizes the systems currently implemented in the prototype.

## Core Loop

1. Start from the Title Scene.
2. Move around the map and avoid enemies.
3. Defeat enemies with automatic weapons.
4. Collect EXP gems.
5. Level up and choose upgrades.
6. Open treasure chests for bonus upgrades or weapon evolution.
7. Survive until the Boss appears.
8. Defeat the Boss to win, or continue into Endless Mode if enabled.
9. Review results, local leaderboard data, and playtest statistics in the Result Scene.

## Scenes

- `BootScene`
- `PreloadScene`
- `TitleScene`
- `GameScene`
- `UIScene`
- `ResultScene`

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

- Data-driven enemy creation from JSON
- `EnemyFactory` with optional scaled stat overrides
- `EnemyFlow` for enemy movement, cleanup, contact damage, kill recording, and shield absorption
- Mini boss texture support for `slime_boss`, `bat_boss`, and `golem_boss`
- Contact cooldowns and swept player contact checks
- EXP gem drops and treasure chest drop chances

Enemy types currently include:

- Slime
- Bat
- Golem
- Mini boss variants
- Final Boss

## Weapons

Base weapons:

| Weapon | Role |
|---|---|
| Knife | Straight projectile, early reliable damage |
| Garlic | Close-range aura damage |
| Bible | Orbiting weapon |
| Magic Wand | Projectile weapon |
| Axe | Arcing projectile weapon |

Evolved weapons:

| Evolution | Base Weapon | Role |
|---|---|---|
| Thousand Edge | Knife | High-rate multi-projectile weapon |
| Soul Eater | Garlic | Stronger aura weapon |
| Unholy Vespers | Bible | Stronger orbit weapon |
| Holy Wand | Magic Wand | Fast projectile weapon |
| Death Spiral | Axe | Stronger arcing/spread weapon |

After evolution, the base weapon stops attacking, the evolved weapon attacks, and the original base weapon upgrade route can continue improving the evolved weapon up to its evolved route cap.

## Passive Items

Current passive items:

| Passive | Effect |
|---|---|
| Spinach | Increases weapon damage multiplier |
| Empty Tome | Reduces weapon cooldown multiplier |
| Bracer | Increases projectile speed multiplier |
| Clover | Increases treasure chest drop bonus |
| Pummarola | Periodically restores HP |

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

Upgrade categories:

- Add new weapon
- Improve base weapon or evolved route
- Improve player stats
- Improve passive items
- Trigger weapon evolution through treasure chests
- Endless post-cap rewards when normal upgrade options are exhausted

## Treasure Chests

Treasure chests can drop from enemies and can provide bonus upgrades.

Treasure behavior:

- Player opens chests by moving into pickup range.
- Chest rewards use the filtered upgrade pool.
- If an evolution is already available, chest rewards prioritize evolution.
- If a chest reward causes an evolution condition to become valid, evolution can trigger immediately after that reward.
- In Endless Mode after normal upgrades are exhausted, chests can grant endless rewards.
- Endless-phase treasure drops are separately tracked.

## Weapon Evolution

Weapon evolution is triggered by treasure chests.

Current evolution routes:

| Base Weapon | Required Passive | Evolution |
|---|---|---|
| Knife | Bracer | Thousand Edge |
| Garlic | Pummarola | Soul Eater |
| Bible | Empty Tome | Unholy Vespers |
| Magic Wand | Spinach | Holy Wand |
| Axe | Spinach | Death Spiral |

## Boss Encounter

The final Boss appears after the survival phase.

Implemented Boss systems:

- `BossController`
- Boss spawn timing and warning message
- Boss HP and contact damage from enemy data
- Boss ranged warning attack
- Boss dash attack
- Boss dash hit statistics
- Boss phase damage statistics
- Boss kill victory condition
- Post-Boss pressure through late waves and spawned enemies

## Endless Mode

Endless Mode is optional and starts after the final Boss is killed.

Implemented Endless systems:

- `EndlessManager` for post-Boss enemy spawning
- Enemy quantity scaling by endless time
- Enemy HP, damage, speed, and EXP scaling by endless time
- Soft enemy count cap
- Endless run result and local leaderboard
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
- HUD with HP/EXP bars, build lines, minimap, shield count, and Pause button
- Level-up panel
- Pause menu with Stats / Build details
- Settings menu
- Help overlay with tabbed guide content
- Result screen with compact summary, CSV download, and endless leaderboard
- Shared temporary UI theme
- Responsive layout through `ScreenManager`, `LayoutConfig`, and `SafeArea`

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
- Automatic restart from Result Scene
- Persistent CSV buffer through `localStorage`
- Downloadable current-run and all-run CSV logs

## Current Status

The project is currently suitable as a local playable prototype and balance testbed. It is not a finished game.
