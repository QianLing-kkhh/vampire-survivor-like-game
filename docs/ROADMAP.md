# Roadmap

This roadmap is directional. It distinguishes implemented foundations from complete player-facing features.

## Architecture Readiness Review

Current conclusion: the project has enough architecture foundation to enter a content proof phase. Further broad foundation work should pause unless a concrete content feature exposes a missing boundary. The next stage should validate existing systems with real playable content, small UI polish passes, and repeatable test workflows.

Architecture completion matrix:

| System | Status | Runtime Used? | UI Exists? | Save-backed? | Docs Accurate? | Next Action |
|---|---|---:|---:|---:|---:|---|
| SaveManager | implemented | yes | partial | yes | yes | use for real feature settings/progression |
| SettingsManager | implemented | yes | yes | yes | yes | migrate new settings away from PlaytestSettings |
| ContentRegistry | implemented | yes | no | n/a | yes | add new playable content through registry-backed data |
| AssetKeyResolver | implemented | yes | no | n/a | yes | keep new visuals resolver-backed |
| AppearanceManager | foundation | partial | no | yes | yes | pause until skins/themes have real art |
| Character/Stage/Map managers | implemented | yes | minimal | yes | yes | add 2-3 characters and 1-2 stages |
| SelectionManager | implemented | yes | minimal | yes | yes | polish selection UI after more content exists |
| CustomStage | implemented foundation | yes | tool/editor-lite | separate storage | yes | improve editor-lite usability and ship sample custom stage |
| RNGManager | implemented | yes | no | run metadata | yes | migrate remaining gameplay randomness opportunistically |
| GameEventBus | foundation | partial | no | no | yes | use for new achievements/tutorials; avoid full migration now |
| AchievementManager | foundation | yes | viewer | yes | yes | validate with small content goals, not complex UI |
| UnlockManager | foundation | partial | viewer | yes | yes | keep default unlocked; use only when new content needs gating |
| RelicManager | shell | empty runtime | no | no | yes | implement 3-5 real relics as content proof |
| TutorialManager | foundation | yes | temporary hints | yes | yes | test non-blocking prompts during UI polish |
| Replay | foundation | records only | tool | separate storage | yes | improve import/export only after repro workflow needs it |
| DailyChallenge | foundation | activatable | minimal | selection-backed | yes | smoke test and refine summary/clear flow |
| Difficulty/Mutator | foundation | yes via RunRuleSet | no | selection-backed | yes | use in one challenge/custom stage before adding UI |
| EnemyModifier | foundation | optional | no | no | yes | add one elite/affix encounter for proof |
| WeaponTag/Behavior | foundation | partial | help display partial | no | yes | use tags for relic/weapon pool proof |
| BossSkillFactory | implemented | yes for endless Bosses | no | config-backed | yes | add 1-2 new Boss configs before more abstractions |
| LeaderboardKey | implemented | yes | partial | yes | yes | verify custom/challenge keys before online plans |
| Version/ContentHash | implemented | yes | no | yes/records | yes | keep CSV/replay compatibility checks stable |
| DebugPanel | foundation | opt-in | yes | developer setting | yes | use during stabilization, keep hidden by default |
| MaintenanceCommands | partial scripts | no | no | no | yes | keep as scripts; no runtime command layer needed now |
| PlaytestScenarioRunner | shell | no | no | no | yes | connect later after content proof needs scenario batches |
| ContentAudit | partial script | no | no | no | yes | keep JSON/script checks; TS `src/tools` audit can wait |
| Validation scripts | implemented | yes for release flow | no | no | yes | keep in pre-release and CI-quality gate |

Systems to pause:

- Remote providers, until a real server/API exists.
- Full replay playback, until deterministic input and timing are centralized.
- Full mod loader, until custom stage validation/import is proven with real content.
- Complex achievement/reward UI, until unlock rewards affect actual content.
- Full custom map editor, while editor-lite can still validate stage authoring needs.
- Appearance/theme expansion, until there are real alternate art assets.
- Additional foundation registries, unless a content feature proves the need.

Recommended implementation focus:

- P0: fix UI overlap/mobile layout, improve Help/Encyclopedia data quality, improve custom stage editor-lite usability, smoke test DailyChallenge and Records/Achievements viewer.
- P1: add 2-3 characters, 1-2 stages/maps, one elite modifier encounter, 1-2 Boss configs, 3-5 relics, and 2-3 active skills if an active-skill foundation is introduced by real gameplay need.
- P2: polish custom stage play flow, replay import/export, playtest scenario runner connection, and balance analyzer report workflow.

## Phase 1: Stabilize Current Prototype

Status: ongoing.

- Stabilize current gameplay.
- Keep docs accurate.
- Improve UI/layout overlap issues.
- Keep CSV schema stable during balance tests.
- Continue normal and endless balance passes.
- Monitor weapon damage, treasure pacing, shield strength, and endless Boss pressure.

## Phase 2: Architecture Foundations

Status: foundation complete enough for content proof. Pause broad new architecture work.

- `AssetKeyResolver`
- Settings domain split and `SettingsManager`
- `CustomStage` schema, validator, serializer, storage, tool, editor-lite, and play integration
- `MapMechanicRuntime` for low-risk map-specific obstacles, slow zones, portals, and visual light sources
- Structured `LeaderboardKey` and local leaderboard records
- `RunMetadata`, seeded RNG, version/content hash, replay record foundation
- GameEvent, Achievement, Tutorial, Unlock, Relic, Difficulty/Mutator, EnemyModifier, BossSkill, WeaponTag/Behavior foundations
- Content pack manifest and local/remote provider interfaces

Remaining work:

- Continue migrating direct gameplay randomness to `RandomSource`.
- Continue moving orchestration out of `GameScene` as stable services emerge.
- Keep dedicated maintenance/audit tooling script-based unless real runtime tooling is needed.

## Phase 3: Selection and Tools UI

Status: content-proof target.

- Implemented: `CharacterSelectScene`, `StageSelectScene`, `RecordsScene`, `ReplayToolScene`, `DailyChallengeScene`, `CustomStageToolScene`, `CustomStageEditorLiteScene`.
- Next: validate these screens with multiple real characters/stages/custom stages before adding map selection, difficulty selection, appearance selection, random stage selection, custom challenge selection, richer previews, or unlock polish.

## Phase 4: Gameplay Extensibility

Status: ready for small real content proofs.

- Implemented foundation: `BossSkillFactory`, data-driven endless Boss skills, `EnemyModifier`, weapon tags/behavior configs, `RunRuleSet` mutators, Relic system shell.
- Next: prove these with a small set of playable relics, elite enemies, Boss configs, and stage/challenge rules before custom/mod weapon runtime or custom enemy/passive content.

## Phase 5: Long-Term Systems

Status: pause unless content proof creates demand.

- Implemented foundation: achievements, milestones shell, unlock manager, tutorials, daily challenge local UI, replay record/import/export shell.
- Planned later: quests, rewards, complete replay playback, deterministic input injection, online leaderboard, cloud save adapter, remote custom stage sharing, mod pack loading, content validation reports, content dependency resolution.

## Next Three Phases

### Phase A: Stabilization

- Fix UI overlap and mobile layout issues.
- Validate Title, selection scenes, Settings, Help, Records, Replay Tool, Daily Challenge, Result, and Custom Stage tools on desktop and portrait layouts.
- Keep CSV buffer, DebugPanel, validate scripts, pre-release checks, and balance analyzer reliable.
- Run `npm.cmd run validate`, `npm.cmd run pre-release`, and a manual smoke test before release pushes.

### Phase B: Content Proof

- Add 2 characters.
- Added `graveyard_map` and `graveyard_stage` as the first content proof for multi-map / multi-stage flow, using existing enemies and Boss.
- Added first differentiated map mechanics proof for `graveyard_map`: obstacles, a slow river, paired portals, and light-source visuals.
- Add 1 sample custom stage package.
- Add 1 new Boss config using `BossSkillFactory`.
- Add 3 relics and connect them through `RelicManager`.
- Add 2 active skills only if the feature is scoped as real gameplay, not another abstract foundation.

### Phase C: Tool Proof

- Complete the custom stage editor-lite loop for create, validate, save, select, play, export.
- Exercise Daily Challenge from Title to GameScene to Result/leaderboard metadata.
- Verify Records/Achievement viewer with real unlock/progress examples.
- Verify Replay import/export compatibility warnings.
- Connect `PlaytestScenarioRunner` only after multiple content scenarios exist.
- Standardize balance analyzer report usage for normal/endless samples.
