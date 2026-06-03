# Vampire Survivor Like Game

A playable **Phaser + TypeScript** prototype inspired by *Vampire Survivors*.

This is not a finished game. It is a work-in-progress prototype for testing core gameplay systems, weapon balance, progression, boss encounters, automated playtesting, CSV logging, and temporary UI/audio/visual assets.

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
- ESC: Pause / Resume

## Basic Gameplay

- Defeat enemies and collect EXP gems.
- Level up to choose upgrades.
- Open treasure chests for bonus upgrades or weapon evolution.
- Survive until the Boss appears.
- Defeat the Boss to win.

## Current Systems

Implemented systems currently include:

- Player movement
- Mouse movement support
- Enemy waves and post-Boss pressure waves
- Enemy contact damage
- Player damage, knockback, and recovery
- Weapon system
- Passive item system
- Level-up upgrade choices
- Treasure chest rewards
- Weapon evolution through treasure chests
- Boss encounter
- Boss dash attack and dash statistics
- HUD with weapons, passives, stats, minimap, and Boss state
- Title scene
- Help overlay
- Pause menu
- Result scene
- Temporary UI theme
- Temporary PNG assets
- Temporary audio system and placeholder audio support
- Auto playtest mode
- Fast test mode
- Persistent CSV playtest logs

For more detail, see:

- [`docs/FEATURES.md`](docs/FEATURES.md)
- [`docs/PLAYTESTING.md`](docs/PLAYTESTING.md)
- [`docs/ASSETS.md`](docs/ASSETS.md)

## Weapons

Base weapons currently include:

- Knife
- Garlic
- Bible
- Magic Wand
- Axe

Evolved weapons currently include:

- Thousand Edge
- Soul Eater
- Unholy Vespers
- Holy Wand
- Death Spiral

## Passive Items

Current passive items include:

- Spinach
- Empty Tome
- Bracer
- Clover
- Pummarola

## Weapon Evolution

Weapon evolution is triggered through treasure chests after the required base weapon and passive item conditions are met.

Current routes:

| Base Weapon | Required Passive | Evolution |
|---|---|---|
| Knife | Bracer | Thousand Edge |
| Garlic | Pummarola | Soul Eater |
| Bible | Empty Tome | Unholy Vespers |
| Magic Wand | Spinach | Holy Wand |
| Axe | Spinach | Death Spiral |

## Auto Playtest Mode

The Title Scene starts an Auto + Fast test automatically after 10 seconds with no user input.

In Auto Mode, the Result Scene can restart the next run automatically after 10 seconds. The result screen allows downloading the accumulated CSV log for multiple runs.

Playtest logs persist in `localStorage`, so refreshing the page should not immediately lose accumulated runs unless the CSV buffer is cleared.

## CSV Playtest Logs

CSV logs are intended for balance analysis. They record run results and gameplay statistics such as:

- Run result
- Survival time
- Final level and EXP
- Kill count
- Upgrade path
- Weapon damage, hits, and kills
- Passive items
- Treasure drops and openings
- Weapon evolution data
- Boss spawn, kill, dash, and phase data
- Auto playtest mode data
- CSV buffer diagnostics such as run index, session ID, and real-time gaps

See [`docs/PLAYTESTING.md`](docs/PLAYTESTING.md) for details.

## Sound

Sound can be toggled from the Title Scene or Pause Menu. The setting is saved locally when browser `localStorage` is available.

The current audio files are temporary placeholder assets and can be replaced later.

## Assets

PNG and audio assets are temporary prototype assets stored under `public/assets/`.

See [`docs/ASSETS.md`](docs/ASSETS.md) for asset paths and naming conventions.

## Known Issues / Temporary Items

- Gameplay balance is still under active tuning.
- PNG assets are temporary prototype assets.
- Audio is temporary placeholder content.
- Phaser makes the production bundle relatively large, so `npm run build` may show a chunk size warning.
- Auto playtest results can vary significantly depending on current balance, Boss waves, and evolution timing.
