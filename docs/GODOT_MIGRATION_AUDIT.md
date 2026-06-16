# Godot Migration Audit

Date: 2026-06-11

## Scope

This audit scans `src` for migration-blocking runtime dependencies:

- `Phaser`
- `window`, `document`, `navigator`, `globalThis`
- `localStorage`
- `Phaser.Math.Vector2`
- `Phaser.Geom`
- `player.body`
- `enemy.body`

The current migration direction remains: keep the Phaser runtime running, continue extracting Phaser-free core/domain state and query ports, and avoid changing gameplay behavior or serialized data formats.

## Basically Phaser-Free

- `src/core/domain`: pure math and domain types. No Phaser, DOM, browser storage, or Godot references were found.
- `src/core/ports`: pure interfaces for input, storage, audio, render events, clock, and engine adapter boundaries.
- `src/player/PlayerModel.ts`, `src/player/PlayerMovementSystem.ts`, `src/player/PlayerState.ts`, `src/player/PlayerQuery.ts`: pure player model/query boundary.
- `src/enemy/EnemyQuery.ts`, `src/enemy/EnemyModel.ts`, `src/enemy/EnemyMovementSystem.ts`, `src/enemy/EnemyDeathTypes.ts`: pure enemy query/model/movement/death result boundary.
- `src/weapon/WeaponRuntimeContext.ts`, `src/weapon/WeaponTarget.ts`, `src/weapon/OrbitPositionCalculator.ts`: pure weapon runtime view and orbit math boundary.
- `src/pickup/PickupUpdateContext.ts`, `src/pickup/TreasureUpdateContext.ts`: pure pickup/treasure update context boundaries.
- Storage callers are now mostly behind adapters; direct `localStorage` access is centralized in `src/save/storage/LocalStorageAdapter.ts`.

## Partially Coupled Modules

### player

`src/player/PlayerController.ts` still imports Phaser and keeps Phaser compatibility APIs such as `Phaser.Math.Vector2`, sprite/body synchronization, animation, camera/runtime interactions, and old public methods. This is expected while it remains the Phaser adapter.

### auto / strategy

Most AutoPlayer runtime math has been reduced to pure types, but `src/auto/AutoPlayerContextBuilder.ts` still reads `enemy.body.x`, `enemy.body.y`, and `enemy.body.radius` when building enemy snapshots. This should move to `EnemyQuery` next.

### weapon

Weapon boundaries are improved but runtime weapons remain Phaser-heavy:

- `src/weapon/Weapon.ts`: still owns Phaser scene and `Phaser.Math.Vector2` knockback input.
- `src/weapon/ProjectileWeapon.ts`, `src/weapon/MagicWandWeapon.ts`, `src/weapon/AxeWeapon.ts`: still combine projectile model state, Phaser GameObjects, target selection, collision, hit application, knockback, and visual feedback.
- `src/weapon/AuraWeapon.ts`: still combines aura visual circle/icon, range checks, damage, and knockback.
- `src/weapon/OrbitWeapon.ts`: orbit position math is now pure, but projectile bodies, hit checks, and knockback remain in Phaser runtime.

### pickup

`PickupManager` and `TreasureManager` now receive pure update contexts, but `Pickup`, `TreasureChest`, and manager internals still own Phaser sprites/bodies, magnet visuals, and object lifecycle. `TreasureManager` now uses `AudioPort` for the `treasure_open` trial path.

### enemy

`Enemy.ts` now has `EnemyModel` and implements `EnemyQuery`, but it still owns Phaser body, animation, dash, knockback, visual feedback, death runtime, and status visuals. `EnemyMovement.ts` uses a pure movement calculator for basic pursuit but still writes directly to `enemy.body` and handles separation against Phaser-backed enemy instances.

### boss

Boss systems remain high coupling:

- `BossLifecycleController`, `BossAttackController`, `BossProjectile`, and `boss/skills/*` still use Phaser scene, bodies, vectors, distance, clamp, warning visuals, and direct player body reads.
- `BossSkillContext` still exposes Phaser-specific vectors and visuals.

### gameplay

`GameplayInitializer` and `GameplayContext` are composition/runtime assembly layers and still reference Phaser-facing managers. This is acceptable short term, but context fields should increasingly be ports or query interfaces.

### scenes

`src/scenes/*` remains Phaser runtime by design. `GameScene.ts` still has camera follow on `player.body`, event wiring, audio calls, floating text, and runtime bridges.

### ui

`src/ui/*` remains Phaser presentation. `Phaser.Geom` appears mainly in hit areas and UI component geometry, which is presentation-layer coupling rather than core gameplay coupling.

### save/storage

Direct storage access is centralized:

- `src/save/storage/LocalStorageAdapter.ts` uses `globalThis.localStorage`.
- `src/content/ContentPackSource.ts` contains a `localStorageKey` data field name only, not direct storage access.

## High-Risk Coupling Points

1. Weapon projectile implementations mix projectile data, Phaser GameObjects, collision, damage, knockback, sounds, and visual feedback.
2. Boss lifecycle and boss skills still use `player.body`, `Phaser.Math.Vector2`, direct distance/clamp calls, and Phaser visuals in the same flow.
3. `Enemy.ts` still combines model state with body/sprite sync, dash, knockback, death, animation, and visual feedback.
4. `CharacterDamageReactionSkill.ts` directly reads/writes `player.body` and `enemy.body` across several reaction effects.
5. `AutoPlayerContextBuilder.ts`, `HUDStateBuilder.ts`, and parts of `GameScene.ts` still read enemy/player body fields for snapshots or presentation.

## Next 5 Recommended Tasks

1. Replace `AutoPlayerContextBuilder` enemy body reads with `EnemyQuery` / `EnemySnapshot`.
2. Introduce a pure projectile model for the simplest projectile path, but keep Phaser body creation and collision in runtime.
3. Add a `BossTargetQuery` / `BossRuntimeView` boundary before touching boss skill behavior.
4. Move `CharacterDamageReactionSkill` body writes behind player/enemy displacement or control ports.
5. Add a Phaser `RenderEventPort` adapter and route one floating text or hit effect path through it, mirroring the `AudioPort` treasure-open trial.

## Current Readiness

The project is not ready for a direct Godot port of runtime classes, but it is ready for incremental adapter-based migration. Core math, ports, storage, input intent, AutoPlayer math, player state/movement/health boundaries, enemy query/model/movement seeds, pickup update context, and weapon runtime context have enough structure to support a future Godot adapter without copying the entire Phaser object model.
