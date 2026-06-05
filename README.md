# Vampire Survivor Like Game

A **Phaser + TypeScript Vampire Survivors-like prototype** for testing survival gameplay systems, automated playtesting, balance data, and architecture foundations.

This is not a finished game. The current project focus is system architecture, gameplay prototyping, automated testing, CSV analysis, responsive UI, and content/save foundations for future expansion.

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

## Build and Validation

Create a production build:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

Recommended validation commands on Windows:

```sh
npm.cmd exec tsc
npm.cmd run build
npm.cmd run validate
npm.cmd run pre-release
```

GitHub Pages deployment is configured through GitHub Actions. In GitHub, set **Repository Settings -> Pages -> Source** to **GitHub Actions**.

See [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) before pushing release or deployment changes.

The current Vite production bundle can show a chunk-size warning. That warning is expected for now and does not by itself mean the build failed.

## Controls

- WASD / Arrow Keys: Move
- Hold Left Mouse: Move toward cursor
- Virtual Joystick: Mobile / narrow-screen movement
- ESC: Pause / Resume
- Pause button: Available in all layouts

## Current Architecture Entry Points

- Save system: `SaveData`, `SaveStorage`, `SaveMigrator`, `SaveManager`
- Content registry: `ContentPack`, `ContentRegistry`, `ContentBootstrap`, `ContentValidator`, `ContentId`
- Character / Stage / Map selection: `SelectionManager`, `CharacterManager`, `StageManager`, `MapManager`
- Gameplay runtime: `GameplayContext`, `GameplayInitializer`, `GameplayUpdater`
- Progression: `UpgradeFlow`, `UpgradeSelector`, `UpgradeApplier`, weapon/passive/evolution managers
- Enemy and Boss flow: `EnemyFlow`, `BossController`, `EndlessBossManager`
- Endless mode: `EndlessManager`, `EndlessRewardManager`, `EndlessLeaderboard`
- UI: responsive HUD, minimal selection scenes, Records, Replay Tool, Daily Challenge, custom stage tools, SettingsMenu, HelpOverlay, ResultScene
- Support layers: AudioManager channels, i18n, art pack / spritesheet assets, version/content metadata, seeded RNG, GameEvent foundation

## Current Systems

Implemented systems currently include:

- Refactored gameplay runtime with `GameplayContext`, `GameplayInitializer`, and `GameplayUpdater`
- Centralized `UpgradeFlow` for level-up, treasure, evolution, and endless rewards
- `EnemyFlow`, `BossController`, and rotating Endless Boss architecture
- Base and evolved weapons, passive items, weapon evolution, weapon knockback, and pickup magnet animation
- Endless Mode with enemy quantity/stat scaling, post-cap rewards, local leaderboard, and endless Boss pressure
- Save architecture for settings, progression, selections, cosmetics, and records
- Content registry architecture for built-in content and future custom/mod content packs
- Content pack manifest and local/remote provider interfaces for future mods and online adapters
- Minimal Character / Stage selection UI and save-backed selection data flow
- Custom Stage Tool, Editor Lite, validation, local storage, Stage Select integration, and playable custom stage runtime path
- Seeded `RandomManager`, run metadata, version/content hash metadata, and Replay foundation
- GameEvent foundation plus Achievement, Tutorial, Unlock, Relic, Daily Challenge, Records, DebugPanel, and Playtest Scenario foundations
- Responsive UI, virtual joystick, SettingsMenu, tabbed HelpOverlay, and compact ResultScene
- i18n support for `en-US`, `zh-CN`, and `ja-JP`
- Channel-based audio settings for BGM, SFX, weapon, and UI sounds
- Unified art pack and spritesheet assets under `public/assets/art/`
- Auto playtesting with separate Auto Movement, Auto Upgrade, and Fast Mode
- Persistent CSV playtest logs

## Auto Playtest

The Title Scene starts an Auto Movement + Auto Upgrade + Fast Mode test automatically after 10 seconds with no user input.

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

- [`docs/SYSTEM_MAP.md`](docs/SYSTEM_MAP.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/FUTURE_ARCHITECTURE.md`](docs/FUTURE_ARCHITECTURE.md)
- [`docs/CONTENT_SYSTEM.md`](docs/CONTENT_SYSTEM.md)
- [`docs/SAVE_SYSTEM.md`](docs/SAVE_SYSTEM.md)
- [`docs/CUSTOM_CONTENT.md`](docs/CUSTOM_CONTENT.md)
- [`docs/FEATURES.md`](docs/FEATURES.md)
- [`docs/PLAYTESTING.md`](docs/PLAYTESTING.md)
- [`docs/ASSETS.md`](docs/ASSETS.md)
- [`docs/ENDLESS_MODE.md`](docs/ENDLESS_MODE.md)
- [`docs/UI_AND_SETTINGS.md`](docs/UI_AND_SETTINGS.md)
- [`docs/AUDIO.md`](docs/AUDIO.md)
- [`docs/LOCALIZATION.md`](docs/LOCALIZATION.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md)

## Known Issues / Temporary Items

- Gameplay balance is still under active tuning.
- Mod loading, remote content, cloud save, online leaderboard, and remote daily challenge services are interface-only foundations; no network requests are made.
- Custom stages support local validation, storage, selection, and play using existing enemies/Bosses. They do not support custom enemies, weapons, passives, assets, or online sharing yet.
- Character and stage selection have minimal UI. Map, cosmetic, difficulty, random stage, and custom challenge selection remain planned or foundation-only.
- Replay can record/export/import summaries and key events, but playback and deterministic input injection are not implemented.
- Relics are a runtime foundation only; no relic drops, selection UI, or active gameplay relics exist yet.
- PNG and spritesheet assets are prototype assets.
- Audio files are temporary or optional placeholders.
- Auto playtest results can vary significantly depending on balance, Boss pressure, endless scaling, and evolution timing.
