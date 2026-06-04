# Custom Content

Custom content is planned but not exposed through UI yet. The current code provides the architecture foundation through `ContentPack`, `ContentRegistry`, `ContentValidator`, and the first custom stage schema/validator utilities.

## Custom Stages Are More Than JSON

A custom stage system needs:

- Schema definitions
- Validation
- Serialization
- Storage
- Import/export
- Version migration
- Asset reference checks
- Compatibility checks with registered content

Do not treat arbitrary JSON import as a complete custom content system.

## Custom Stage Foundation

The current custom stage foundation lives under `src/custom/`:

- `CustomStageSchema`: package, stage, map, wave, and spawn region types.
- `CustomStageValidationResult`: structured errors and warnings.
- `CustomStageValidator`: structural, reference, range, performance-risk, and basic playability checks.
- `CustomStageSerializer`: JSON parse/serialize/clone/normalize helpers.
- `CustomStageStorage`: localStorage plus memory fallback shell for saved custom stage packages.

`CustomStageToolScene` provides a minimal local utility for custom stage packages:

- Paste JSON through a browser prompt.
- Validate with `CustomStageValidator`.
- Display error/warning counts and the first few issues.
- Save valid packages to `CustomStageStorage`.
- List stored custom stage IDs.
- Export stored package JSON through clipboard or console fallback.
- Open `CustomStageEditorLiteScene` for prompt-driven basic field and wave editing.

`CustomStageEditorLiteScene` is an editor-lite, not a full map editor. It can create or load a package, edit package/stage/map basics, edit a simple wave list, validate, save, and export JSON. It does not support terrain painting, custom enemies, custom weapons, custom assets, online sharing, or direct play from the editor.

Saved valid custom stage packages can now be selected from `StageSelectScene` and launched through the normal `GameScene` flow. The tool itself still does not start gameplay directly; it only validates, saves, lists, and exports packages.

## CustomStageValidator

The current validator checks:

- Map size bounds
- Enemy IDs
- Boss IDs
- Wave density
- Spawn intervals
- Asset references
- Completion possibility
- Performance risk
- Required content pack dependencies
- Supported schema version

Validator output is advisory for balance. It can reject invalid structure and obvious missing references, but it does not guarantee a stage is fun, fair, or fully balanced.

## Runtime Selection Path

Custom stages are intentionally not mixed into the builtin `ContentRegistry`.

Current flow:

```text
Import or paste custom stage JSON
  -> parse schema
  -> validate
  -> save package in CustomStageStorage
  -> StageManager exposes valid packages as selectable custom stages
  -> SelectionManager stores selectedCustomStageId
  -> GameplayInitializer builds runtime stage/map/waves from the package
```

This keeps builtin content isolated while still allowing validated local custom stages to run.

## First Supported Custom Content Scope

The first future version should only support:

- Custom stage
- Custom map
- Custom waves using existing enemies and Bosses

The current custom stage schema follows that scope: it only references existing enemies/Bosses and does not allow custom weapons, enemies, passives, or Boss skills. Those belong to later mod content once validators are more mature.

## Difficulty And Mutators

`DifficultyDefinition`, `MutatorConfig`, and `RunRuleSet` now exist as a foundation for custom stage and challenge rules.

Current custom stage packages may declare stage-level `mutators`, and `CustomStageValidator` checks their basic shape and numeric ranges. Custom stages selected from `StageSelectScene` can use these stage-level mutators. No built-in stage enables mutators by default.

Supported first-pass mutator types:

- `enemyStat`
- `spawnRate`
- `treasureRate`
- `expRate`
- `bossTiming`
- `weaponPool`

Future custom stages should use mutators for rule changes instead of hardcoding behavior in gameplay classes. Validator checks are structural and advisory; they do not guarantee balance.

## Enemy Modifiers

`EnemyModifier` is now available as an architecture foundation for future elite enemies, affixes, random endless upgrades, custom stage wave modifiers, and mod content.

Current built-in modifier types:

- `fast`
- `shielded`
- `explosive`
- `splitOnDeath`

Built-in waves do not use modifiers by default, so current normal and endless balance is unchanged. Custom stage waves may include a `modifiers` array in schema, and `CustomStageValidator` checks known modifier types and basic numeric ranges. This is a validation and runtime foundation, not a complete elite enemy UI or balance pass.

## Leaderboard Keys

Custom leaderboard records should use structured keys that include:

- stage ID
- map ID
- character ID
- difficulty/mutator set
- seed
- content pack ID/version

This prevents incompatible custom runs from being mixed into one leaderboard.

## Future Import / Export

Planned but not implemented:

- Custom content pack files
- Content pack dependency declarations
- User-created map metadata
- Version migration tooling
- UI for browsing imported content

The current Custom Stage Tool is intentionally local-only. It does not load remote files, upload data, or register content packs. Valid saved custom stages are launched only through `StageSelectScene`, not directly from the tool.

## Remote Sharing Interfaces

`RemoteCustomStageProvider` now defines the future shape for custom stage upload, fetch, and search. It is interface-only:

- No server is configured.
- No network request is made.
- No remote package is trusted or registered.
- No online sharing UI exists.

`ContentPackManifest` is the future metadata format for custom/mod/remote content packs. Custom stages or broader mod packs should declare source, version, content hash, dependencies, and provided IDs through a manifest before registration. Validation remains mandatory before any loaded custom or remote content can enter the runtime selection path.

Audit boundary: playable custom stages currently support only existing enemy/Boss references and local package storage. Custom enemies, weapons, passives, Boss skills, assets, remote sharing, dependency resolution, and mod pack registration remain planned.
