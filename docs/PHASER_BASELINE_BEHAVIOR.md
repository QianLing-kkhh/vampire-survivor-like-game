# Phaser Baseline Behavior

Date: 2026-06-12

This document records the legacy Phaser project as the behavior baseline for future Godot migration work. It describes behavior to preserve, not new feature work to add.

## Maintenance Scope

- This repository is in maintenance mode.
- The formal future development line is `xianxia-survivor-godot`.
- Phaser changes should preserve the current playable baseline unless they fix an obvious blocker.
- Do not add weapons, enemies, characters, bosses, systems, balance changes, backend services, Steam integrations, or Godot code here.

## Player-Facing Flow

The baseline player flow is:

1. Load the title screen.
2. Start a normal run.
3. Move with keyboard, pointer movement, or the virtual joystick.
4. Pause, resume, open settings, or return to title.
5. Gain experience, choose upgrades, fight enemies and bosses, collect pickups, and reach victory, game over, or an exit path.
6. Review the result screen and optionally restart or return to title.

## Preserved Runtime Behavior

- Existing player movement, hit response, health, death, and world-bound behavior are baseline behavior.
- Existing enemy movement, spawn timing, merge behavior, boss pressure, contact damage, drops, and kill events are baseline behavior.
- Existing weapon cooldowns, targeting, projectile, aura, orbit, knockback, damage, passive, and evolution behavior are baseline behavior.
- Existing pickup, treasure, magnet, experience, level-up, upgrade, result, leaderboard, replay, local save, and CSV playtest data behavior are baseline behavior.
- Existing automated playtest and headless simulation behavior remain available as reference tooling.

## Hidden Player Navigation Entries

The following developer or experimental entries are hidden from normal player navigation for the legacy baseline:

- Title screen `Developer`
- Title screen `Auto Strategy`
- Pause menu `Developer`
- Result screen `Developer`

The underlying tools are not deleted; hiding the entries keeps the player-facing legacy game cleaner while preserving reference code for migration and debugging.

## Minimum Legacy Smoke Check

Before treating a maintenance change as accepted:

1. Run TypeScript and build validation.
2. Load the game locally.
3. Start a normal run from the title screen.
4. Move, pause, resume, and open settings.
5. Confirm no hidden developer or auto-strategy entry is visible from title, pause, or result navigation.
6. Reach result or return to title without breaking the normal flow.

