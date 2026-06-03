# Feature Overview

This document summarizes the systems currently implemented in the prototype.

## Core Loop

The current gameplay loop is:

1. Start from the Title Scene.
2. Move around the map and avoid enemies.
3. Defeat enemies with automatic weapons.
4. Collect EXP gems.
5. Level up and choose upgrades.
6. Open treasure chests for bonus upgrades or weapon evolution.
7. Survive until the Boss appears.
8. Defeat the Boss to win.
9. Review results and playtest statistics in the Result Scene.

## Scenes

Implemented scenes include:

- `BootScene`
- `PreloadScene`
- `TitleScene`
- `GameScene`
- `UIScene`
- `ResultScene`

## Player

Implemented player systems:

- Keyboard movement with WASD / Arrow Keys
- Mouse movement by holding the left mouse button
- HP and max HP
- Damage intake
- Knockback after taking damage
- Level and EXP progression
- Player stat upgrades such as movement speed, pickup range, and max HP

## Enemies

Implemented enemy systems:

- Data-driven enemy creation from JSON
- Enemy movement toward the player
- Contact damage
- Damage cooldowns
- Death handling
- EXP gem drops
- Treasure chest drop chances
- Boss flag support

Enemy types currently include:

- Slime
- Bat
- Golem
- Boss

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

Upgrade categories:

- Add new weapon
- Improve base weapon
- Improve player stats
- Improve passive items
- Trigger weapon evolution through treasure chests when conditions are met

Weapon upgrade totals are capped to match the current evolution requirements, preventing unnecessary upgrades after a base weapon has reached its evolution threshold.

## Treasure Chests

Treasure chests can drop from enemies and can provide bonus upgrades.

Treasure behavior:

- Player opens chests by moving into pickup range.
- Chest rewards use the filtered upgrade pool.
- If an evolution is already available, chest rewards prioritize evolution.
- If a chest reward causes an evolution condition to become valid, evolution can be triggered immediately after that reward.

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

The Boss appears after the survival phase.

Implemented Boss systems:

- Boss spawn timing
- Boss HP and damage
- Boss kill victory condition
- Boss dash attack
- Boss dash statistics
- Boss phase damage statistics
- Post-300-second wave pressure

## UI

Implemented UI systems:

- Title menu
- HUD
- Minimap
- Level-up panel
- Pause menu
- Help overlay
- Result screen
- Shared temporary UI theme

## Audio

Audio is managed through `AudioManager`.

Current behavior:

- Audio event keys are centralized.
- Missing audio files are safely skipped.
- Sound can be toggled from UI settings.
- Temporary audio files can be placed under `public/assets/audio/`.

## Automated Playtesting

Implemented test systems:

- Auto Mode
- Fast Mode
- Weighted upgrade selection for test variety
- Evolution-focused auto upgrade behavior
- Automatic restart from Result Scene
- Persistent CSV buffer through `localStorage`
- Downloadable all-run CSV logs

## Current Status

The project is currently suitable as a local playable prototype and balance testbed. It is not a finished game.
