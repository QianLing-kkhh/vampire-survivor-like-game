# Content System

The content system is the architecture foundation for built-in content, future custom content, and future mod content packs.

## Core Files

- `ContentPack`: data bundle shape.
- `ContentRegistry`: unified read entry for registered content.
- `ContentBootstrap`: imports built-in JSON and registers the builtin pack.
- `ContentValidator`: first-pass content validation.
- `ContentId`: shared default IDs.

## ContentPack

`ContentPack` supports:

- `id`
- `version`
- `source`: `builtin`, `custom`, or `mod`
- `weapons`
- `enemies`
- `passives`
- `upgrades`
- `waves`
- `characters`
- `stages`
- `maps`

`ContentPackManifest` is the future metadata wrapper for custom, mod, and remote packs. It records pack id, name, version, author, source, optional content hash, compatible game-version range, dependencies, and declared provided IDs. A manifest is not a loaded pack and does not imply registration.

`ContentPackSource` describes where a pack can come from: builtin, local, custom, mod, or remote. Remote sources are only metadata in the current build.

Weapon definitions may include optional `tags` and `behavior` metadata. Tags describe archetypes such as projectile, aura, orbit, magic, physical, explosive, pierce, homing, arcing, spiral, control, base, and evolved. Behavior config describes the intended behavior family, but current built-in weapons still use their concrete runtime classes.

Current status:

- Built-in content is registered as one builtin content pack.
- Built-in content includes `graveyard_map` and `graveyard_stage` as the first multi-map / multi-stage content proof, using existing enemies, existing final Boss, and the `graveyard_waves` wave set.
- Custom/mod loading is not implemented yet.
- Remote content loading is not implemented yet.
- The registry is not a mod loader yet.

## Content Pack Providers

`ContentPackProvider` is the standard async interface for future pack sources:

- `listManifests()`
- `loadPack(manifestId)`

Provider results return structured success, errors, and warnings. Providers must not automatically register content into `ContentRegistry`; loaded packs still need validation and an explicit registration path.

`LocalContentPackProvider` is currently a shell for future local/custom pack storage. It can be instantiated and can read a localStorage-backed list if one exists, but no current gameplay flow writes or loads packs through it.

Remote provider interfaces are separate from content registration. There is no network request, API URL, authentication, upload, download, or server integration in the current implementation.

## Built-In Content

Current built-in content comes from:

- `src/data/weapons.json`
- `src/data/enemies.json`
- `src/data/passives.json`
- `src/data/upgrades.json`
- `src/data/waves.json`
- `src/data/characters.json`
- `src/data/stages.json`
- `src/data/maps.json`

`ContentBootstrap` converts arrays where needed, supports built-in wave set records such as `default` and `graveyard_waves`, validates the pack, and registers it.

## ContentRegistry

The registry provides:

- `registerPack(pack)`
- `clear()`
- `getWeapon(id)`
- `getEnemy(id)`
- `getPassive(id)`
- `getUpgradeOptions()`
- `getWaveSet(id)`
- `getCharacter(id)`
- `getStage(id)`
- `getMap(id)`
- list methods for major content groups

Business systems should not directly import gameplay JSON. They should read through `ContentRegistry` or a manager/factory backed by it.

Current allowed direct JSON import boundaries:

- `ContentBootstrap` imports builtin data to register the builtin pack.
- Help/display builders may still import builtin data for static help until localized display metadata is registry-backed.
- Boss config loaders may import Boss config data while the Boss content registry path is still maturing.

New runtime gameplay systems should not add additional direct JSON imports.

## Conflict Rules

Current first-pass behavior:

- Duplicate pack IDs warn and skip registration.
- Duplicate content IDs warn and skip the conflicting entry.
- Built-in content is not overwritten by later packs.

Future mod support may need explicit override rules, dependency order, and compatibility checks.

## Content Hash

`ContentHash` computes a stable, non-cryptographic hash over registered built-in content: weapons, enemies, passives, upgrades, the default wave set, characters, stages, and maps.

The hash is recorded in save version info, CSV rows, and replay data so test results and replay attempts can warn when they were produced against a different built-in content set. It is not a security checksum and does not replace validation for custom or mod content.

## ContentValidator

Current validation warns for:

- Missing default character or stage
- Stage references to missing map or final Boss
- Character references to missing starting weapon
- Evolution route references to missing weapon/passive IDs
- Wave references to missing enemy IDs
- Missing basic fields in weapons, enemies, passives, or upgrades
- Unknown weapon tags
- Unknown or suspicious weapon behavior config

Validation does not block startup except future critical default-content checks may become hard failures.

## Validation Scripts

`npm.cmd run validate:content` runs a lightweight Node-based content audit for local quality gates and future CI. It does not import TypeScript runtime code, so it can run from Node without a TS loader.

The current script checks:

- required `src/data/*.json` files parse correctly;
- stages reference existing maps and final bosses;
- characters reference existing starting weapons;
- wave entries reference existing enemies;
- boss configs reference existing enemy definitions;
- simple weapon evolution/passive references when those fields are present.

If a richer `src/tools/ContentAudit.ts` implementation is added later, the script can delegate to it or run it after build output is available.

## Future Content Types

Future content packs may include:

- Custom stages
- Custom maps
- Custom wave sets
- Custom characters
- Custom Boss definitions
- Custom passives
- Custom weapons
- Weapon tags and behavior configs for custom/mod weapons
- Enemy affixes
- Mutators
- Tutorials
- Cosmetics

Do not allow broad custom weapons/enemies until validators are mature.

Custom weapon runtime is not implemented yet. The current `WeaponTag` and `WeaponBehaviorConfig` system is a foundation for future passives, relics, mutators, content restrictions, achievements, and mod-defined weapons.

## Custom Stage Foundation

Custom stage schema and validation utilities now exist under `src/custom/`:

- `CustomStageSchema`
- `CustomStageValidator`
- `CustomStageSerializer`
- `CustomStageStorage`
- `CustomStageValidationResult`

Current scope:

- Custom stage metadata
- Custom map metadata
- Custom waves
- References to existing enemies/Bosses only
- Local storage shell for custom stage packages

Not implemented yet:

- Full custom content pack import/export UI
- Complex Stage selection preview for custom stages
- Automatic registration into `ContentRegistry`
- Custom weapons/enemies/passives
- Custom Boss skill definitions

Current local custom stages validate first, save through `CustomStageStorage`, and are exposed by `StageManager.listSelectableStages()` without being registered into the builtin registry. When selected, `SelectionManager` stores `selectedCustomStageId`, and `GameplayInitializer` builds runtime stage/map/waves directly from the saved package.

Future broader custom or mod content packs may still register through `ContentRegistry` once package dependency and override rules are mature. The validator catches structure, missing references, ID conflicts, and obvious density/performance risks; it is not a full balance verifier.

Custom stage packages may record `createdWithGameVersion` and `createdWithContentHash`. A different content hash should warn because references may still exist but balance/replay comparison may no longer be equivalent.

## Remote Interfaces

The current code defines interface-only remote providers for:

- Leaderboard submission and fetch
- Save upload and download
- Daily challenge fetch
- Custom stage upload, fetch, and search

These interfaces are future adapters. They do not perform requests, do not change save or leaderboard behavior, and do not make remote content trusted. Any future remote content must still pass validation before it can affect runtime content.
