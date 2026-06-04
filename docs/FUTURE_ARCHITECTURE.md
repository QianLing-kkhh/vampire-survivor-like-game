# Future Architecture

This document records future expansion goals so future changes do not accidentally hard-code around the current one-character, one-stage prototype.

## Expansion Targets

Future architecture should assume support for:

- Multiple characters
- Multiple stages
- Multiple maps
- Random stages
- Custom stages
- Mod / content packs
- Save/load
- Custom cosmetics
- Appearance themes and skin selections
- Mod art packs and theme asset overrides
- Unlocks and meta progression
- Achievements and quests
- Daily challenges and seed challenges
- Multi-dimensional leaderboards
- Difficulty system
- Mutator rule modifiers
- RunRuleSet composition for difficulty, challenges, custom stages, and mod rules
- Enemy affixes and elite enemies
- Enemy modifier configs for fast, shielded, explosive, split, or future mod-defined behavior
- Data-driven Boss skills
- Weapon tags and build archetypes
- Weapon behavior configs as the gradual path toward custom/mod weapon runtimes
- Relics, equipment, and one-use items
- Active skills
- Input configuration and controller support
- Tutorial system
- Version migrations
- Content validation tools
- Replay and seed reproduction
- Optional online leaderboard or cloud save adapters

## Current Architecture Principles

1. Do not put new systems directly into `GameScene`.
2. Do not let `GameplayContext` become an unlimited dump of unrelated state.
3. Do not let `PlaytestSettings` become a catch-all settings store.
4. Do not directly import gameplay JSON from business classes.
5. Do not scatter texture keys or animation keys through unrelated systems.
6. Do not hardcode stage, map, character, or Boss timing in gameplay code.
7. New systems should prefer `ContentRegistry`, `SaveManager`, `StageManager`, `MapManager`, and `CharacterManager`.
8. Custom content must pass validation before registration.
9. CSV/playtest logs and formal save data must remain separate unless intentionally integrated.
10. Future selection UI should build on existing managers, save data, and content registry rather than bypass them.
11. Enemy variants should prefer `EnemyModifier` configs over combinatorial enemy IDs.
12. Difficulty, challenge, and custom rule changes should prefer `RunRuleSet` mutators over direct runtime if/else branches.
13. Future skins/themes should use `AppearanceManager`, `AppearanceRegistry`, and `AssetKeyResolver` rather than direct texture strings.

## Planned Domain Splits

Settings should eventually split into domains:

- Runtime settings
- Audio settings
- Input settings
- Accessibility settings
- Playtest settings
- Developer/debug settings

Content should eventually split into resolvers and registries:

- Content registry for gameplay definitions
- Asset key resolver for texture/animation/icon keys
- Appearance registry for themes, skins, and future mod art packs
- Localization display resolver for names/descriptions
- Validation tools for custom content
- Enemy modifier registry for elite/affix behaviors
- Weapon tag registry for archetype interactions
- Weapon behavior registry for future custom weapon behavior types
- Difficulty manager and mutator registry for future challenge rules
- RunRuleSet as the single per-run rule composition point

## Risk Areas

- Large scene classes becoming orchestration bottlenecks
- UI gaining gameplay rules
- Content IDs being treated as display text
- New persistent state being stored outside `SaveManager`
- Mod/custom content bypassing validation
- Leaderboards mixing incompatible schemas, seeds, difficulties, or content versions
- Rule changes bypassing `RunRuleSet` and becoming invisible to CSV or leaderboard keys
- Theme or skin systems bypassing `AssetKeyResolver` and becoming impossible to swap per appearance selection
