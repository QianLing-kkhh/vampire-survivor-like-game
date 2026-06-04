# Audio

This document describes the current prototype audio system.

## AudioManager Overview

`AudioManager` centralizes all audio playback.

It supports:

- `playBgm`
- `playSfx`
- `playWeapon`
- `playUi`
- `stopBgm`
- `pauseBgm`
- `resumeBgm`
- `setChannelVolume`
- `getChannelVolume`
- `setAudioEnabled`
- `isAudioEnabled`

Playback is defensive. Missing audio keys are skipped instead of crashing the game.

## Default Audio State

Audio is off by default.

New users start with:

- `audioEnabled = false`
- `bgmVolume = 0`
- `sfxVolume = 0`
- `weaponVolume = 0`
- `uiVolume = 0`

The user must enable audio and raise channel volumes in Settings.

## Channels

### bgm

Background music.

Example keys:

- `title_bgm`
- `gameplay_bgm`
- `boss_bgm`
- `result_bgm`

Only one BGM should play at a time.

### sfx

General gameplay sound effects.

Example keys:

- `enemy_hit`
- `enemy_killed`
- `player_hit`
- `level_up`
- `upgrade_selected`
- `treasure_open`
- `boss_spawn`
- `boss_dash`
- `victory`
- `game_over`

High-frequency keys such as `enemy_hit` have cooldowns and may be skipped in auto mode.

### weapon

Weapon attack and hit sounds.

Example keys:

- `knife_attack`
- `axe_throw`
- `magic_wand_shot`
- `bible_orbit_hit`
- `garlic_aura_tick`
- `thousand_edge_attack`
- `holy_wand_shot`
- `death_spiral_throw`
- `unholy_vespers_hit`
- `soul_eater_tick`

Weapon sounds have cooldowns to avoid excessive noise.

### ui

UI sounds.

Example keys:

- `ui_click`
- `ui_hover`
- `ui_back`
- `ui_confirm`

## SettingsMenu Behavior

SettingsMenu exposes:

- Audio: ON/OFF
- BGM Volume
- SFX Volume
- Weapon Volume
- UI Volume

Volume buttons cycle through fixed steps:

```text
0% -> 25% -> 50% -> 75% -> 100% -> 0%
```

Changing BGM volume updates the currently playing BGM volume. Turning audio off stops BGM and prevents future sounds from playing.

## Missing Audio Fallback

Before playback, `AudioManager` checks:

```ts
scene.cache.audio.exists(key)
```

If the key is missing, playback is skipped.

This allows the prototype to run without every temporary audio file present.

## Browser Autoplay Note

Browsers may require a user interaction before audio playback is allowed. The game should not assume BGM can start before the player interacts with the page.

## Asset Paths

Audio files are expected under:

```text
public/assets/audio/bgm/
public/assets/audio/sfx/
public/assets/audio/weapon/
public/assets/audio/ui/
```

Some legacy flat audio paths under `public/assets/audio/` may still be loaded for compatibility.
