# Vampire Survivor Like Game

A playable Phaser prototype inspired by Vampire Survivors.

This is not a finished game. It is a work-in-progress prototype for testing core gameplay systems, balance, weapons, progression, boss encounters, and automated playtest logging.

## Tech Stack

- TypeScript
- Phaser
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

GitHub Pages deployment is configured through GitHub Actions. In GitHub, set Repository Settings -> Pages -> Source to GitHub Actions.

## Controls

- WASD / Arrow Keys: Move
- Hold Left Mouse: Move toward cursor
- ESC: Pause

## Gameplay

- Defeat enemies.
- Collect EXP gems to level up.
- Choose weapon, passive item, and player stat upgrades.
- Open treasure chests for bonus upgrades or weapon evolution.
- Survive until the Boss appears.
- Defeat the Boss to win.

## Current Systems

- Player movement
- Enemy waves
- Weapons
- Passive items
- Level up upgrades
- Treasure chests
- Weapon evolution
- Boss fight
- Pause menu
- Help overlay
- Temporary UI theme
- Temporary PNG assets
- Placeholder audio system
- Auto playtest mode
- CSV playtest logs

## Auto Playtest Mode

The Title Scene starts an Auto + Fast test automatically after 10 seconds with no user input.

In Auto Mode, the Result Scene restarts the next run automatically after 10 seconds. The result screen also allows downloading the accumulated CSV log for multiple runs.

## Sound

Sound is OFF by default.

You can toggle sound from the Title Scene or Pause Menu. The setting is saved locally when browser localStorage is available.

## CSV Playtest Logs

CSV logs are intended for balance analysis. They record run results and gameplay statistics such as:

- Win/loss result
- Survival time
- Final level and EXP
- Kill count
- Weapon damage, hits, and kills
- Boss spawn, kill, dash, and phase data
- Treasure drops and openings
- Weapon evolution data
- Upgrade path and auto playtest data

## Known Issues

- Audio is temporary placeholder content.
- PNG assets are temporary prototype assets.
- Balance is still under active tuning.
- Phaser makes the production bundle relatively large, so `npm run build` may show a chunk size warning.
