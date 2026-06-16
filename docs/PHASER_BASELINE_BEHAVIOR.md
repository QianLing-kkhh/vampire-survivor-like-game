# Phaser Baseline Behavior

Date: 2026-06-11

This document records the current Phaser runtime as the behavior baseline for the future Godot migration. It describes what the migrated version must preserve, not how the future engine should be structured.

The migration rule is: match gameplay behavior first, then replace Phaser-specific rendering, input, physics, audio, and storage adapters behind equivalent engine boundaries.

## Player Movement

- The player moves from input intent or auto-movement intent without changing current movement feel.
- Manual movement preserves current normalization, speed, delta-time handling, collision/body sync, and world-bounds behavior.
- Mouse/pointer aim and facing direction preserve current runtime semantics.
- `externalMoveDirection` remains the path used by auto movement to drive the player and keeps its current priority over manual movement when active.
- Player health, alive/dead state, hit radius, collision radius, velocity, facing direction, and aim direction are exposed through Phaser-free query APIs, while Phaser body/sprite synchronization remains a runtime adapter concern.

## Auto Movement

- Auto movement reads a pure strategy snapshot containing player, enemies, pickups, treasure, map mechanics, boss warnings, weapon context, delta time, and world bounds.
- Strategy layer weights, route selection, tactical/micro-control behavior, final boss safety logic, debug output semantics, and `externalMoveDirection` output are the current baseline.
- Enemy data entering auto strategy should be snapshot/query data, not Phaser body objects.
- The migrated implementation should preserve deterministic headless simulation behavior for the same seed, character, stage, difficulty, strategy profile, and tick interval.

## Enemy Movement, Contact, And Knockback

- Basic enemies pursue the player using current speed, delta-time integration, slow multipliers, separation behavior, and movement locks.
- Contact damage, contact immunity windows, merge preparation behavior, merge cooldowns, and movement suppression keep existing timing and event semantics.
- Enemy knockback from weapons, boss interactions, skills, and map effects preserves current direction, strength, duration, and world-bounds behavior.
- Enemy dash, warning, impact, merge, boss-like flags, elite flags, and death state remain behavior-compatible with the Phaser runtime.
- Phaser bodies and visuals are runtime details; the behavior baseline is enemy position, collision radius, health, alive/dead state, damage, movement speed, and emitted events.

## Weapons

### Fire And Cooldown

- Weapon cooldowns, passive modifiers, character modifiers, runtime damage modifiers, projectile speed modifiers, radius modifiers, and upgrade effects preserve current values and order of application.
- Automatic weapon firing remains driven by the existing update cadence and elapsed delta time.

### Hit And Damage

- Damage calculation uses the current `DamageCalculator`, target damage multipliers, boss/elite modifiers, hit result semantics, and run-stat recording.
- Weapon hit, kill, and total damage counters preserve current behavior.
- Knockback remains part of weapon hit resolution where currently configured.

### Projectile Weapons

- Projectile spawn position, target selection, projectile count, spread angle, speed, pierce, damage falloff, lifetime, path blocking, hit radius, and explosion behavior preserve current behavior.
- Phaser projectile sprites/bodies are runtime visuals and collision carriers, not part of the future core model.

### Aura Weapons

- Aura radius, tick cadence, percent max HP damage, boss/elite caps, knockback behavior, and aura visuals preserve current player-centered behavior.
- Aura visual body/icon ownership remains a Phaser runtime concern until replaced by a render adapter.

### Orbit Weapons

- Orbit projectile count, orbit speed, radius scaling cycle, hit radius, hit cooldowns, projectile rotation, and knockback preserve current behavior.
- Orbit position math is pure baseline logic; Phaser projectile bodies remain runtime adapters.

## Pickup, Treasure, And Magnet

- Experience gems, coins, treasure chests, pickup range, magnet range, attraction speed, final collection distance, pickup count, and reward events preserve current behavior.
- Pickup and treasure update paths receive pure player/query context, while Phaser sprites/bodies and magnet visuals remain runtime concerns.
- Treasure drop chance, boss guaranteed chest behavior, endless drop window limits, reward request flow, and treasure-open sound behavior preserve current semantics.

## Experience, Level, And Upgrade

- Experience gain, total experience, required experience, level-up events, upgrade choice generation, auto-upgrade selection, treasure reward application, evolution rules, passive effects, and temporary pickup range modifiers preserve existing data-driven behavior.
- UI pauses, upgrade panels, auto-selection timing, and upgrade-applied callbacks remain behavior-compatible.
- Save, replay, leaderboard, and run summary fields connected to progression must remain compatible with existing serialized data.

## Boss Spawn, Skills, And Death

- Boss spawn timing, spawn position rules, boss warning events, boss BGM/SFX changes, and boss lifecycle callbacks preserve current runtime behavior.
- Boss skills preserve current warning shapes, danger semantics, dash/beam/shockwave/ring/slow-zone behavior, projectile behavior, damage, knockback, and cooldown timing.
- Boss death, victory/endless transition behavior, reward flow, score/run-stat effects, UI messaging, and audio transitions preserve current semantics.
- Boss Phaser bodies, warning visuals, projectiles, and camera/audio effects are runtime adapter responsibilities.

## Save And Storage

- Save keys, JSON structures, schema versions, replay data, custom stage data, leaderboard keys, local content pack data, playtest settings, and debug/playtest log persistence preserve current compatibility.
- Browser builds continue to use localStorage through the storage adapter path.
- Pure core/domain and core/ports must not import browser storage APIs.

## UI And Result Scene

- HUD health, experience, level, timer, weapon/status displays, minimap, floating text, pause/settings/help panels, live strategy controls, upgrade panels, treasure reward presentation, and result scene output preserve current user-visible behavior.
- Result scene stats, victory/game-over presentation, leaderboard/replay metadata, buttons, and audio preserve existing semantics.
- Phaser text, panels, hit areas, tweens, icons, and layout components are presentation-layer details and should not be treated as future Godot core logic.

## Migration Acceptance Baseline

A migrated subsystem should be considered behavior-compatible only when it preserves:

- deterministic simulation output for the same inputs and seeds;
- movement, collision, knockback, pickup, and projectile timing;
- damage, health, experience, upgrade, drop, and boss semantics;
- existing save/replay/leaderboard compatibility;
- current runtime events used by UI, audio, telemetry, and summary systems.

Current verification commands for this baseline:

```sh
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd run validate:sim
```
