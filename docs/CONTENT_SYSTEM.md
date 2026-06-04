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

Current status:

- Built-in content is registered as one builtin content pack.
- Custom/mod loading is not implemented yet.
- The registry is not a mod loader yet.

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

`ContentBootstrap` converts arrays where needed, wraps the default wave set, validates the pack, and registers it.

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

## Conflict Rules

Current first-pass behavior:

- Duplicate pack IDs warn and skip registration.
- Duplicate content IDs warn and skip the conflicting entry.
- Built-in content is not overwritten by later packs.

Future mod support may need explicit override rules, dependency order, and compatibility checks.

## ContentValidator

Current validation warns for:

- Missing default character or stage
- Stage references to missing map or final Boss
- Character references to missing starting weapon
- Evolution route references to missing weapon/passive IDs
- Wave references to missing enemy IDs
- Missing basic fields in weapons, enemies, passives, or upgrades

Validation does not block startup except future critical default-content checks may become hard failures.

## Future Content Types

Future content packs may include:

- Custom stages
- Custom maps
- Custom wave sets
- Custom characters
- Custom Boss definitions
- Custom passives
- Custom weapons
- Enemy affixes
- Mutators
- Tutorials
- Cosmetics

Do not allow broad custom weapons/enemies until validators are mature.

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

- Import/export UI
- Stage selection UI for custom stages
- Automatic registration into `ContentRegistry`
- Custom weapons/enemies/passives
- Custom Boss skill definitions

Future custom stages should validate first, then register through `ContentRegistry` as custom content packs. The validator catches structure, missing references, ID conflicts, and obvious density/performance risks; it is not a full balance verifier.
