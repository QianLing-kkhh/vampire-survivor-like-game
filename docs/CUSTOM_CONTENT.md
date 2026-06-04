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

Import/export UI is not implemented. Custom stage packages are not automatically registered into gameplay or StageManager selection yet.

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

## Registration Path

Custom content should register through `ContentRegistry` as a `ContentPack`.

Recommended flow:

```text
Import custom content
  -> parse schema
  -> migrate if needed
  -> validate
  -> register pack
  -> save metadata
```

## First Supported Custom Content Scope

The first future version should only support:

- Custom stage
- Custom map
- Custom waves using existing enemies and Bosses

The current custom stage schema follows that scope: it only references existing enemies/Bosses and does not allow custom weapons, enemies, passives, or Boss skills. Those belong to later mod content once validators are more mature.

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

- CustomStage import/export
- Custom content pack files
- Content pack dependency declarations
- User-created map metadata
- Version migration tooling
- UI for browsing imported content
