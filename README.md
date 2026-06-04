# Vampire Survivor Like Game

A playable **Vampire Survivors-like Phaser prototype** built with TypeScript, Phaser 3, and Vite.

This is not a finished game. It is a playable prototype for testing core survival gameplay, weapon progression, Boss pressure, endless mode, automated playtesting, CSV logging, responsive UI, temporary audio, and the current art pack.

## Tech Stack

- TypeScript
- Phaser 3
- Vite

## Local Development

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

On Windows PowerShell, if `npm` is blocked by execution policy, use:

```sh
npm.cmd run dev
```

## Build

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

Recommended validation commands during development:

```sh
npm.cmd exec tsc
npm.cmd run build
```

GitHub Pages deployment is configured through GitHub Actions. In GitHub, set **Repository Settings -> Pages -> Source** to **GitHub Actions**.

## Controls

- WASD / Arrow Keys: Move
- Hold Left Mouse: Move toward cursor
- Virtual Joystick: Mobile / narrow-screen movement
- ESC: Pause / Resume
- Pause button: Available in all layouts

## Basic Gameplay

- Defeat enemies and collect EXP gems.
- Level up to choose weapons, passives, stat upgrades, or endless rewards.
- Open treasure chests for bonus upgrades or weapon evolution.
- Survive until the final Boss appears.
- Defeat the Boss to win, or continue into Endless Mode when enabled.

## Current Systems

Implemented systems currently include:

- Refactored gameplay architecture with `GameplayContext`, `GameplayInitializer`, and `GameplayUpdater`
- Centralized `UpgradeFlow` for level-up, treasure, evolution, and endless rewards
- `EnemyFlow` for enemy movement, contact damage, kill handling, and shield absorption
- `BossController` for final Boss spawn, ranged warning attack, dash, and Boss victory state
- Base and evolved weapon systems
- Passive items and weapon evolution through treasure chests
- Endless Mode after Boss kill when enabled
- Endless enemy quantity and stat scaling
- Endless rewards: Emergency Heal, Overdrive, Time Slow, Shield, and Minor Growth
- Local endless leaderboard
- Title, HUD, LevelUpPanel, PauseMenu, SettingsMenu, HelpOverlay, and ResultScene
- Responsive layout with safe areas, minimap placement, mobile joystick, and all-mode Pause button
- i18n support for `en-US`, `zh-CN`, and `ja-JP`
- Channel-based audio settings for BGM, SFX, weapon, and UI sounds
- Art pack and spritesheet assets under `public/assets/art/`
- Auto playtesting with separate Auto Movement, Auto Upgrade, and Fast Mode
- Persistent CSV playtest logs

## Auto Playtest

The Title Scene starts an Auto + Fast test automatically after 10 seconds with no user input.

Current automated settings are split:

- Auto Movement: lets `AutoPlayer` control movement.
- Auto Upgrade: lets the level-up panel select upgrades automatically.
- Fast Mode: increases runtime speed immediately when enabled.

In auto testing, the Result Scene can restart the next run automatically after 10 seconds. The result screen allows downloading current-run CSV data or the accumulated CSV buffer.

## Sound

Audio is disabled by default. New users start with:

- `audioEnabled = false`
- BGM volume = 0
- SFX volume = 0
- Weapon volume = 0
- UI volume = 0

Audio can be enabled and channel volumes can be changed in Settings. Missing audio files are skipped safely.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FEATURES.md`](docs/FEATURES.md)
- [`docs/PLAYTESTING.md`](docs/PLAYTESTING.md)
- [`docs/ENDLESS_MODE.md`](docs/ENDLESS_MODE.md)
- [`docs/UI_AND_SETTINGS.md`](docs/UI_AND_SETTINGS.md)
- [`docs/AUDIO.md`](docs/AUDIO.md)
- [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md)
- [`docs/ASSETS.md`](docs/ASSETS.md)

## Known Issues / Temporary Items

- Gameplay balance is still under active tuning.
- PNG and spritesheet assets are prototype assets.
- Audio files are temporary or optional placeholders.
- Phaser makes the production bundle relatively large, so `npm run build` may show a chunk size warning.
- Auto playtest results can vary significantly depending on balance, Boss pressure, endless scaling, and evolution timing.
