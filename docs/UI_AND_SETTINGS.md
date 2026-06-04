# UI and Settings

This document describes the current UI screens, runtime settings, and responsive layout rules.

## UI Screens

### Title

The Title Scene provides:

- Start Game
- Start Auto Test
- Settings
- Help
- Auto-test countdown after no input

### Game HUD

The HUD shows:

- HP bar
- EXP bar
- Level
- Time and current goal
- Weapon + matching passive build rows
- Shield stack count when available
- Minimap
- Pause button in all modes

The permanent HUD should stay lightweight and avoid large background panels.

### LevelUpPanel

The LevelUpPanel displays available upgrade cards. Auto Upgrade can select a card after a short delay when enabled.

### PauseMenu

The PauseMenu contains:

- Resume
- Restart
- Return to Title
- Stats / Build
- Settings
- Help

The Stats / Build page shows detailed character, weapon, passive, damage, and shield information.

### SettingsMenu

SettingsMenu is a reusable overlay opened from Title, Pause, and Result flows.

### HelpOverlay

HelpOverlay uses tab buttons and data-driven help sections. It includes controls, weapons, UI, evolution, passives, upgrades, treasures, and endless help.

### ResultScene

ResultScene shows compact run results, auto restart countdown, CSV download buttons, Settings, and endless leaderboard entries when available.

## Settings

Current settings:

- Auto Movement
- Auto Upgrade
- Fast Mode
- Endless Mode
- Audio
- BGM Volume
- SFX Volume
- Weapon Volume
- UI Volume
- Language

Settings are saved through `PlaytestSettings` and `localStorage` when available.

## Immediate Apply Rule

Settings should apply immediately to the current run.

- Auto Movement changes whether `AutoPlayer` controls movement.
- Auto Upgrade changes whether LevelUpPanel auto-selects options.
- Fast Mode changes runtime time scale.
- Endless Mode changes final Boss result behavior.
- Audio and volume settings affect playback immediately.
- Language changes refresh current Settings UI and uses i18n lookup elsewhere.

Do not restart the scene just to apply settings.

## Responsive Layout

Responsive layout is handled by:

- `ScreenManager`
- `LayoutConfig`
- `SafeArea`

Target layouts:

- Desktop landscape: wider HUD, minimap in the upper-right area, buttons may use two columns where appropriate.
- Mobile portrait: compact HUD, smaller minimap, Pause button in a non-overlapping safe-area corner, vertical menus and level-up cards.
- Narrow landscape: compact spacing and smaller buttons.

## Pause Button Rule

The HUD Pause button must be visible in all layouts:

- Desktop landscape
- Desktop portrait
- Mobile landscape
- Mobile portrait

It should have higher depth than minimap and normal HUD elements. The minimap and Pause button should not share an overlapping rectangle.

ESC pause remains supported.

## Virtual Joystick

The virtual joystick appears on touch-capable or narrow-screen layouts.

Rules:

- It should sit away from the left and bottom edges.
- Its active area can be larger than the visible base circle.
- It should not replace the all-mode HUD Pause button.
- It should not affect desktop keyboard/mouse movement.

## HUD Rule

Permanent HUD should avoid large persistent background panels. Detailed information belongs in PauseMenu Stats / Build.

HUD build rows should display:

```text
[weapon icon] Weapon Lv.X / Y + [passive icon] Passive Lv.A / B
```

If too many rows exist, show a limited number and a `+N more` row.

## Help System

Help content should prefer:

- Tab icons over long button labels
- Data-driven values where possible
- Short visible text on small screens
- Truncation instead of overlap when content exceeds available space

CSV field names, internal IDs, and debug keys should not be translated for display unless a dedicated display layer is added.
