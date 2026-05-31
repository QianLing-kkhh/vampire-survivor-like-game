# AGENTS.md

## Project

This is a 2D Vampire Survivors-like roguelike survival game.

The user is the project owner and architect.
Codex is responsible only for engineering implementation.

## Core Rule

Do not explore the whole repository unless explicitly asked.

Default behavior:
- Read only the files specified by the user.
- Modify only the files specified by the user.
- If more files are required, explain why and list them before reading.
- Do not perform broad grep/find/tree searches unless explicitly requested.
- Do not refactor unrelated systems.

## Architecture Principles

1. Keep systems separated.
2. Use data-driven design.
3. Use events for cross-system communication.
4. Avoid direct dependencies between gameplay systems.
5. Do not put gameplay logic in UI.
6. Do not put business logic in GameManager.
7. Prefer small composable classes over large manager classes.
8. Prefer adding new data/config/effects over changing core systems.
9. Before architecture changes, output impact scope first.
10. Keep changes minimal and local.

## Main Systems

- core: game loop, game state, event bus, time control
- player: movement, health, base stats
- enemy: enemy entity, movement, pooling, factory
- combat: damage calculation, hit detection, status effects
- weapon: automatic weapons, cooldowns, projectiles, aura, orbit weapons
- progression: exp, level, upgrade choices
- spawn: waves, spawn timing, difficulty scaling
- pickup: exp gems, coins, magnet, item pickup
- ui: HUD, level-up panel, result screen
- data: JSON or CSV configuration
- save: save and load data
- audio: BGM and SFX playback

## Forbidden Coupling

Do not allow:
- Enemy directly creating exp gems
- Weapon directly modifying UI
- UI directly changing combat logic
- Player directly controlling enemy spawn
- Spawn directly modifying player stats
- Save system containing gameplay rules
- GameManager containing weapon, combat, spawn, or progression logic

Use events instead.

Example:
Enemy dies
→ publish EnemyKilled
→ PickupManager listens and creates exp gem
→ UI listens and updates kill count
→ Audio listens and plays sound

## Data-Driven Rule

Weapons, enemies, waves, characters, upgrades, and pickups should be defined in data files whenever possible.

Preferred:
- src/data/weapons.json
- src/data/enemies.json
- src/data/waves.json
- src/data/upgrades.json
- src/data/characters.json

Avoid hardcoding gameplay values in source code.

## Implementation Rules

When implementing a feature:
1. Identify the target system.
2. Modify only that system.
3. Keep public interfaces stable.
4. Add minimal code.
5. Do not rewrite existing working code.
6. Do not change unrelated names or formatting.
7. Do not introduce new dependencies without asking.
8. Update relevant documentation only if requested.

## Verification

When code changes are made:
- Run the smallest relevant test or build command if available.
- Do not run expensive full-project commands unless necessary.
- If a command fails, report the failure and relevant short error only.
- Do not paste long logs.

## Response Style

For each task, respond with:
1. Files changed
2. Summary of changes
3. Verification result
4. Notes or risks

Keep explanations short.
