# Roadmap

This roadmap is directional. It distinguishes implemented foundations from complete player-facing features.

## Phase 1: Stabilize Current Prototype

Status: ongoing.

- Stabilize current gameplay.
- Keep docs accurate.
- Improve UI/layout overlap issues.
- Keep CSV schema stable during balance tests.
- Continue normal and endless balance passes.
- Monitor weapon damage, treasure pacing, shield strength, and endless Boss pressure.

## Phase 2: Architecture Foundations

Status: foundation mostly implemented.

- `AssetKeyResolver`
- Settings domain split and `SettingsManager`
- `CustomStage` schema, validator, serializer, storage, tool, editor-lite, and play integration
- Structured `LeaderboardKey` and local leaderboard records
- `RunMetadata`, seeded RNG, version/content hash, replay record foundation
- GameEvent, Achievement, Tutorial, Unlock, Relic, Difficulty/Mutator, EnemyModifier, BossSkill, WeaponTag/Behavior foundations
- Content pack manifest and local/remote provider interfaces

Remaining work:

- Continue migrating direct gameplay randomness to `RandomSource`.
- Continue moving orchestration out of `GameScene` as stable services emerge.
- Add dedicated maintenance/audit command tooling if needed.

## Phase 3: Selection and Tools UI

Status: minimal UI implemented, full UX planned.

- Implemented: `CharacterSelectScene`, `StageSelectScene`, `RecordsScene`, `ReplayToolScene`, `DailyChallengeScene`, `CustomStageToolScene`, `CustomStageEditorLiteScene`.
- Planned: map selection, difficulty selection, appearance selection, random stage selection, custom challenge selection, richer stage/character previews, unlock-aware display polish.

## Phase 4: Gameplay Extensibility

Status: architecture foundation implemented; most features are not active gameplay yet.

- Implemented foundation: `BossSkillFactory`, data-driven endless Boss skills, `EnemyModifier`, weapon tags/behavior configs, `RunRuleSet` mutators, Relic system shell.
- Planned active features: relic drops/choices, active skills, richer enemy affix spawning, custom/mod weapon runtime, custom enemy/passive content, more data-driven final Boss migration.

## Phase 5: Long-Term Systems

Status: foundation or planned.

- Implemented foundation: achievements, milestones shell, unlock manager, tutorials, daily challenge local UI, replay record/import/export shell.
- Planned: quests, rewards, complete replay playback, deterministic input injection, online leaderboard, cloud save adapter, remote custom stage sharing, mod pack loading, content validation reports, content dependency resolution.
