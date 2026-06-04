# Roadmap

This roadmap is directional. It is not a commitment to implement every item immediately.

## Phase 1: Stabilize Current Prototype

- Stabilize current gameplay.
- Keep docs accurate.
- Improve UI/layout overlap issues.
- Keep CSV schema stable during balance tests.
- Continue normal and endless balance passes.
- Monitor weapon damage, treasure pacing, shield strength, and endless Boss pressure.

## Phase 2: Architecture Cleanup

- Add `AssetKeyResolver`.
- Split settings into clearer domains.
- Add `CustomStage` schema and validator.
- Add structured `LeaderboardKey`.
- Strengthen content validation.
- Add content/version metadata to records where needed.

## Phase 3: Selection and Custom Content UI

- `CharacterSelectScene`
- `StageSelectScene`
- `AppearanceManager`
- Custom stage import/export
- Custom map metadata editor/import path
- Save-backed selection UX

## Phase 4: Gameplay Extensibility

- `BossSkillFactory`
- Data-driven Boss skill configs
- `EnemyModifier` / enemy affixes
- Weapon tags and build archetypes
- Mutator / difficulty system
- Relic / equipment / one-use item foundation
- Active skill foundation

## Phase 5: Long-Term Systems

- Achievements
- Quests
- Daily challenges
- Seed challenge mode
- Replay / seed reproduction
- Optional online leaderboard
- Optional cloud save adapter
- Content validation tooling and reports
