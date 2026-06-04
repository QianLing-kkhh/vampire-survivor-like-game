# Architecture Boundaries

This document describes lightweight architecture guardrails for future work. The project uses a script-based warning checker rather than ESLint:

```sh
npm.cmd run check:architecture
```

The script scans `src/**/*.ts` and reports warnings with file, line, rule id, and suggestion. It does not modify files and does not fail by default. Use strict mode only when intentionally tightening CI:

```sh
node scripts/check-architecture-boundaries.mjs --strict
```

## Soft Boundary Rules

### A. Direct Data JSON Imports

Gameplay and business systems should not import `src/data/*.json` directly. They should read built-in content through `ContentRegistry` or managers backed by it.

Allowed boundaries:

- `src/content/ContentBootstrap.ts`
- `src/version/ContentHash.ts`

### B. Direct `Math.random`

Gameplay randomness should use injected `RandomSource` streams from `RandomManager` so seeds, replay records, daily challenges, and tests can be reproduced more reliably.

Allowed boundaries:

- `src/random/RunSeed.ts`
- `src/random/SeededRandom.ts`

`RunSeed` may use platform randomness only to create an initial seed. That generated seed is then recorded.

### C. Direct `localStorage`

Persistent state should go through `SaveManager`, `SaveStorage`, or a dedicated storage wrapper. Gameplay systems should not write browser storage directly.

Allowed boundaries:

- `src/save/SaveStorage.ts`
- `src/custom/CustomStageStorage.ts`
- `src/replay/ReplayStorage.ts`
- `src/logging/PlaytestLogBuffer.ts`
- `src/content/providers/LocalContentPackProvider.ts`

### D. Hardcoded Texture / Animation Keys

New runtime code should avoid scattering concrete Phaser texture, animation, and icon keys. Use `AssetKeyResolver` and `AssetKeyMap` so future appearance themes, skins, and asset packs can override visuals from one path.

Allowed boundaries:

- `src/assets/AssetKeyMap.ts`
- `src/assets/AssetKeyResolver.ts`
- `src/scenes/PreloadScene.ts`

### E. GameScene Size

`GameScene` should remain orchestration-oriented. If it grows past the warning threshold, new work should look for a runtime service, manager, or flow object instead of adding more gameplay detail to the scene.

## Handling Warnings

Warnings are not automatically wrong. Treat them as review prompts:

1. If the warning is new and avoidable, move the code through the intended manager or resolver.
2. If the warning is an intentional compatibility boundary, add it to the script whitelist with a short documentation note.
3. If the warning is legacy code, leave it until the owning system is migrated.
4. Do not silence warnings by moving gameplay rules into UI or save code.

## Relationship To Validation

`npm.cmd run validate` includes `npm.cmd run check:architecture`. Because the boundary checker is warning-only by default, current legacy warnings do not block builds. This keeps the script useful for Codex reviews and future CI without forcing a broad cleanup pass.
