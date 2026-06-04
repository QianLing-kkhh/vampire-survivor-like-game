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
- Central unlock state for characters, stages, maps, cosmetics, weapons, passives, difficulties, and challenge access
- Achievements and quests
- Milestones, starter goals, and achievement-driven unlock rewards
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
- Relic effects for rule-changing run items separate from passive numeric growth
- Active skills
- Input configuration and controller support
- Tutorial system
- Event-driven tutorial triggers and non-blocking guide prompts
- Version migrations
- Content validation tools
- Replay and seed reproduction
- Unified GameEvent timeline for achievements, tutorials, unlocks, debug tooling, and replay foundations
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
14. Future CharacterSelect, StageSelect, CustomStageSelect, daily challenge, and seeded-run flows should write through `SelectionManager`.
15. Gameplay randomness should use injected `RandomSource` streams from `RandomManager`, not direct `Math.random()`.
16. New cross-system observers should subscribe to `GameEventBus` instead of wiring directly into `GameScene`, manager callbacks, or UI events.
17. Achievements, milestones, quests, and unlock triggers should evaluate data-driven definitions and persist through `SaveManager.progression`.
18. Unlock state should be owned by `UnlockManager`; content managers can query it but should not duplicate unlock rules.
19. Relic-style rule changes should use `RelicManager` / `RelicEffect`, not passive upgrades or scene conditionals.
20. Tutorial and guide prompts should use `TutorialManager` and `GameEventBus`, not `GameScene` conditionals.

## Seeded Runs And Replay

`RandomManager`, `SeededRandom`, and `RunSeed` provide the foundation for seeded gameplay randomness. A `runSeed` is recorded in playtest CSV, and random streams are split by domain so visual randomness does not disturb gameplay-critical streams.

Important boundaries:

- A seed can reproduce random decisions only when version, content, settings, selection, and update order are also compatible.
- A complete replay still needs input recording, content/version hashes, and deterministic timing.
- Daily challenges, random stages, seeded custom stages, and leaderboard fairness should set or preserve `SelectionState.seed`.
- New random systems should request a domain stream such as upgrade, spawn, treasure, endless, Boss, or visual from `RandomManager`.

## Game Events And Replay Foundations

`GameEventBus`, `GameEventRecorder`, and `GameEventBridge` provide the foundation for future achievements, quests, tutorials, unlocks, audio/floating-text listener cleanup, and replay/debug timelines.

Important boundaries:

- `GameEventBus` is per-run and lives in `GameplayContext`.
- Existing `core/EventBus`, Phaser scene events, and callbacks are still present during migration.
- `GameEventBridge` mirrors selected legacy events so new systems can start listening without risky rewrites.
- `GameEventRecorder` stores a bounded recent event timeline, but it is not a full replay system.
- Complete replay still requires run seed, input samples, deterministic timing, content/version hashes, and compatible update order.

## Tutorials And Guides

`TutorialManager`, `TutorialRegistry`, and `TutorialStep` provide the foundation for future new-player guidance, Help prompts, mobile controls teaching, starter tasks, and first-time event hints.

Important boundaries:

- Tutorial triggers should be data-driven and event-driven where possible.
- Tutorial prompts should remain non-blocking unless a future dedicated onboarding flow explicitly opts into pauses.
- HelpOverlay is static reference material; TutorialManager decides when a contextual prompt should be shown.
- Tutorial seen/disabled state is formal save data under `SaveManager.progression.tutorial`.
- Future guide UI should subscribe to `TutorialManager` rather than adding checks to `GameScene`.

## Achievements And Milestones

`AchievementManager`, `AchievementRegistry`, and `AchievementEvaluator` provide an event-driven foundation for achievements, tutorial goals, challenge objectives, and future unlock rewards.

Important boundaries:

- Achievement logic should be expressed as `AchievementDefinition` conditions, not as `GameScene` conditionals.
- Achievement progress is stored in formal save progression data.
- `AchievementReward` is a data shape for future unlock integration; complex unlock execution is not implemented yet.
- Milestones are intended for reusable threshold counters, such as kills, treasures, evolutions, and endless survival targets.
- Future Character / Stage / Skin unlocks should integrate through an unlock layer or manager, then be referenced by achievement rewards.

## Unlocks

`UnlockManager`, `UnlockRegistry`, and `UnlockDefinition` provide the foundation for future content access rules and reward-driven unlocks.

Important boundaries:

- Existing default character, stage, map, and theme remain unlocked.
- New content should register an `UnlockDefinition` rather than adding unlock logic to selection scenes.
- `AchievementReward`, milestone rewards, daily challenge rewards, and quest rewards can map to `UnlockReward`.
- Selection and content managers may check `UnlockManager`, but they should not store unlock state themselves.
- Unlock data is stored in formal save progression data.

## Relics

Relics are intended for rule-changing items, challenge rewards, stage rewards, character build identity, and custom content mechanics. They should remain separate from passives.

Important boundaries:

- Passive effects are upgradeable numeric growth.
- Relic effects are special rules or mechanics.
- Relics should be represented by `RelicDefinition` and `RelicEffectConfig`.
- Runtime behavior should flow through `RelicManager` and effect hooks.
- Relic drops, relic selection UI, relic save persistence, and custom relic content are not implemented yet.

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
- Selection manager for character, stage, map, difficulty, challenge, custom stage, seed, and ruleset IDs
- Game event bus and recorder for achievements, tutorials, replay diagnostics, unlocks, and listener cleanup
- Achievement and milestone registries for event-driven goals and future unlock rewards
- Unlock registry and manager for content access state and reward application
- Relic registry and manager for rule-changing run items
- Tutorial registry and manager for event-driven, non-blocking guide prompts

## Risk Areas

- Large scene classes becoming orchestration bottlenecks
- UI gaining gameplay rules
- Content IDs being treated as display text
- New persistent state being stored outside `SaveManager`
- Mod/custom content bypassing validation
- Leaderboards mixing incompatible schemas, seeds, difficulties, or content versions
- Rule changes bypassing `RunRuleSet` and becoming invisible to CSV or leaderboard keys
- Theme or skin systems bypassing `AssetKeyResolver` and becoming impossible to swap per appearance selection
- Selection UI directly mutating individual managers instead of using `SelectionManager`
- Event consumers wiring directly into `GameScene` or manager callbacks instead of using `GameEventBus`
- Achievement or quest progress being stored outside `SaveManager`
- Character, stage, map, or cosmetic managers duplicating unlock storage instead of using `UnlockManager`
- Relic effects being implemented as passive upgrades or ad hoc `GameScene` conditionals
- Tutorial prompts being hardcoded into scenes instead of routed through `TutorialManager`
