# Custom Content

Custom content is planned but not implemented yet. The current code only provides the architecture foundation through `ContentPack`, `ContentRegistry`, and `ContentValidator`.

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

## Future CustomStageValidator

A future custom stage validator should check:

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

Do not immediately allow custom weapons, enemies, passives, or Boss skills until validators are more mature.

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
