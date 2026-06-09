# Project Map

This document is a concise map of the current repository layout. It is meant to help Codex and future contributors find the owner system before making a small change.

## Root Structure

- `src/`: Phaser/TypeScript game code.
- `src/data/`: built-in gameplay configuration JSON.
- `public/assets/`: runtime art, external art packs, UI, and audio resources.
- `docs/`: architecture, content, asset, playtesting, save, and UI documentation.
- `scripts/`: validation, audit, and architecture-check helpers.

## Source Directories

### `src/scenes`

Phaser scene lifecycle, scene transitions, and high-level orchestration.

Current rule: `GameScene` coordinates runtime services, UI events, and scene transitions, but new gameplay details should move into owner systems or small runtime helpers.

### `src/gameplay`

Per-run runtime composition and orchestration.

Key owners:

- `GameplayInitializer`: creates the runtime object graph.
- `bootstrap/`: run selection resolution, rule-set creation, runtime event wiring, and final context assembly helpers used by `GameplayInitializer`.
- `GameplayContext`: stores per-run references.
- `GameplayUpdater`: advances systems in the frame update order.
- `RuntimeDiagnosticsCollector`: gathers performance counts.
- `RuntimeTextureReadiness`: checks current-map runtime texture readiness.
- `RuntimeSettingsSynchronizer`: syncs playtest settings into runtime context.

### `src/auto`

Auto movement and auto upgrade behavior.

Key owners:

- `AutoPlayer`: movement policy and scoring.
- `AutoPlayerContextBuilder`: scene-to-auto movement snapshot builder.
- `AutoUpgradeSelector`: automated upgrade selection policy.

### `src/player`

Player movement, health, shields, invulnerability, temporary survival effects, and base stat model.

### `src/character`

Character definitions, runtime stat growth, starting weapon, level-up effects, damage reaction skills, and skin identity.

### `src/enemy`

Enemy entity, movement, factory, pooling, flow, death publication, and Boss controller integration.

### `src/boss`

Boss attack controller, Boss spawn director, and Boss skill runtime helpers.

### `src/combat`

Damage calculation and deterministic weapon/target modifier handling.

### `src/weapon`

Weapon manager, weapon factory, concrete weapon behaviors, projectiles, aura/orbit weapons, weapon tags, and weapon runtime stats.

### `src/progression`

Experience, level, upgrade selection/application, upgrade flow, and progression context builders.

Key owners:

- `UpgradeFlow`: level-up, treasure rewards, evolution, invalid reward fallback, and endless reward coordination.
- `UpgradeSelectionContextBuilder`: manual and auto upgrade context construction.

### `src/passive`

Passive item levels and passive-derived modifiers.

### `src/relic`

Relic definitions, relic runtime manager, event-driven relic effects, and relic reward selection.

### `src/treasure`

Treasure reward coordination that is not UI-specific.

### `src/pickup`

EXP gems, treasure chests, pickup manager, pickup merging, and collection behavior.

### `src/spawn`

Wave and enemy spawn timing. Spawn caps should be injected through runtime initialization and enforced in `SpawnDirector`.

### `src/map`

Map definitions, map manager, custom-stage map resolution, and map mechanics.

### `src/world`

World rendering, landmark rendering, visibility rendering, and map render config consumption.

### `src/run`

Run counters, result building, result coordination, and run-end summaries.

Key owners:

- `RunState`: authoritative run counters.
- `RunStats`: runtime combat/stat summaries.
- `RunResultBuilder`: result scene and CSV output data.
- `RunEndCoordinator`: run-ended payload and result-build input preparation.

### `src/events`

Typed per-run event bus, event payloads, recorder, and legacy event bridge.

### `src/logging` and `src/replay`

Playtest CSV rows, CSV buffers, replay recording, and replay storage.

### `src/settings` and `src/save`

Domain settings, save schema, save migration, storage, and settings facade.

### `src/selection`

Save-backed character/stage/map/difficulty/challenge/ruleset selection facade and summaries.

### `src/ui`

Pure Phaser UI components and overlays: HUD, level-up panel, pause menu, settings menu, help, result support, floating text, and stats build panels.

`src/ui/pause/PauseFlowCoordinator.ts` owns pause-flow decisions; `GameScene` still performs Phaser scene operations.

### `src/assets` and `src/visual`

Asset key maps, asset resolution, manifest helpers, fallback logging, visual scale, display quality helpers, and shadows.

### `src/stage`, `src/rules`, `src/difficulty`, `src/challenge`, `src/achievement`, `src/tutorial`, `src/unlock`

Content-facing managers for stage/rules/difficulty/challenge/meta systems.

## Codex Usage Rule

For each Codex task, specify:

- target system
- files to read
- files to modify
- task details
- forbidden changes
- verification method

Do not use this file as permission to broadly explore the repository. Start with the owner system and widen only when the current task requires it.
