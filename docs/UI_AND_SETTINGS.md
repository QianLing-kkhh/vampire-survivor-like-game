# UI and Settings

This document describes the current UI screens, runtime settings, and responsive layout rules.

## UI Screens

### Title

The Title Scene provides:

- Start Game
- Start Auto Test
- Select Character
- Select Stage
- Records
- Settings
- Help
- Auto-test countdown after no input

Title should not duplicate individual settings toggles. Settings belong in `SettingsMenu`.

### CharacterSelectScene / StageSelectScene

The current selection scenes are intentionally minimal:

- List registered built-in characters or stages.
- Highlight the current selection.
- Confirm writes through `SelectionManager`.
- Back returns to Title.

They do not implement unlocks, detailed previews, custom stages, random stages, daily challenges, or difficulty selection yet.

### RecordsScene

RecordsScene is the minimal read-only entry for save-backed records:

- Achievements
- Leaderboards
- Unlocks

It does not implement achievement reward claiming, unlock actions, online leaderboard features, or raw metadata inspection. Empty systems should show a compact empty state instead of failing.

### Game HUD

The HUD shows:

- HP bar
- EXP bar
- Level
- Time and current goal
- Weapon + matching passive build rows
- Shield/endless text when relevant
- Minimap
- Pause button in all modes

The permanent HUD should stay lightweight and avoid large background panels that cover gameplay.

### LevelUpPanel

The LevelUpPanel displays available upgrade cards. It uses icon-first weapon/passive presentation where possible. Auto Upgrade can select a card after a short delay when enabled.

### PauseMenu

The PauseMenu contains:

- Resume
- Restart
- Return to Title
- Stats / Build
- Settings
- Help

Detailed character, weapon, passive, damage, shield, and endless stats belong in PauseMenu Stats / Build, not in the permanent HUD.

### SettingsMenu

SettingsMenu is the unified settings entry opened from Title, Pause, and Result flows.

Title, Pause, and Result should not each show their own duplicated Auto/Fast/Endless/Sound/Language toggle lists.

### HelpOverlay

HelpOverlay uses tab buttons and data-driven help sections. It includes controls, weapons, UI, evolution, passives, upgrades, treasures, and endless help.

Help text should avoid hardcoded gameplay values when a manager/config can provide those values.

The Guide tab documents the non-blocking tutorial hint layer. HelpOverlay remains static help; event-triggered prompts belong to `TutorialManager`.

### ResultScene

ResultScene shows compact run results, auto restart countdown, CSV download buttons, Settings, and endless leaderboard entries when available.

It should not display raw CSV, raw debug strings, or long unbounded stat blobs.

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

Settings are persisted through `PlaytestSettings`, which now reads/writes through `SaveManager`.

Settings storage is split into domains behind `SettingsManager`:

- `GameplaySettings`
- `AudioSettings`
- `DisplaySettings`
- `InputSettings`
- `DeveloperSettings`

`DeveloperSettings` includes a developer-only DebugPanel toggle and presentation settings. The panel is disabled by default, can be toggled with F3, and is intended for local diagnostics rather than player-facing UI.

`PlaytestSettings` remains as a compatibility facade so existing UI and runtime callers keep working. New systems should use `SettingsManager` directly when they belong to a specific settings domain.

## Appearance

Appearance selection is save-backed but has no UI yet.

- Current theme: `default`
- `AppearanceManager` owns selected theme and skin IDs.
- `UITheme` remains the active default UI style constants.
- Future theme/skin controls should live in `SettingsMenu` or a dedicated appearance screen, not scattered across Title/Pause/Result.
- Runtime asset lookup should continue through `AssetKeyResolver` so active themes can override texture, animation, icon, world, UI, or audio keys later.

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

## Mobile Portrait Rules

- Pause button must be visible and clickable.
- Pause button must not overlap HP/EXP bars or minimap.
- Minimap should move or shrink if it conflicts with Pause or stats.
- Build rows should be limited and should not cover the virtual joystick.
- Virtual joystick should sit away from the left and bottom edges.

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

HUD build rows should display weapon plus matching passive on the same row. If too many rows exist, show a limited number and a `+N more` row.

DebugPanel is not part of the permanent HUD. It should remain hidden unless developer settings enable it, and it should stay below modal UI such as PauseMenu.

## Help System

Help content should prefer:

- Tab icons over long button labels
- Data-driven values where possible
- Short visible text on small screens
- Truncation instead of overlap when content exceeds available space

CSV field names, internal IDs, and debug keys should not be translated for display unless a dedicated display layer is added.

## Tutorial Hints

`TutorialManager` is the event-driven guide layer for first-time prompts such as level-up, treasure, evolution, Boss, endless, and mobile joystick hints.

Rules:

- Tutorial prompts should be temporary and non-blocking.
- Tutorial prompts should not pause gameplay or force-open HelpOverlay.
- Seen one-time steps are saved through `SaveManager.progression.tutorial`.
- Future guide UI can listen to `TutorialManager`; gameplay systems should not hardcode tutorial checks in `GameScene`.
