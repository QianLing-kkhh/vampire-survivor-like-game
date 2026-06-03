# Asset Guide

This project currently uses temporary prototype assets. They are intended for readability and testing, not final production quality.

## Asset Root

Static assets are stored under:

```text
public/assets/
```

Vite serves these files from the site root, so Phaser preload paths use `/assets/...`.

Example:

```ts
this.load.image('player', '/assets/player/player_placeholder.png');
```

## Directory Structure

Current asset folders:

```text
public/assets/
├─ audio/
├─ effects/
├─ enemy/
├─ images/
├─ pickup/
├─ player/
├─ ui/
└─ weapons/
```

## Player Assets

```text
public/assets/player/player_placeholder.png
```

Texture key:

```text
player
```

## Enemy Assets

```text
public/assets/enemy/slime_placeholder.png
public/assets/enemy/bat_placeholder.png
public/assets/enemy/golem_placeholder.png
```

Texture keys:

```text
slime
bat
golem
```

## Pickup Assets

```text
public/assets/pickup/exp_gem_placeholder.png
```

Texture key:

```text
exp_gem
```

## Effect / Weapon Assets

Base effect assets:

```text
public/assets/effects/knife_projectile.png
public/assets/effects/hit_flash.png
public/assets/effects/bible_orbit_projectile.png
```

Texture keys:

```text
knife_projectile
hit_flash
bible_orbit_projectile
```

Additional weapon and gameplay image assets:

```text
public/assets/images/axe_projectile.png
public/assets/images/magic_wand_projectile.png
public/assets/images/treasure_chest.png
public/assets/images/boss_lava_beast.png
public/assets/images/thousand_edge_projectile.png
public/assets/images/holy_wand_projectile.png
public/assets/images/death_spiral_projectile.png
public/assets/images/unholy_vespers_orbit_book.png
public/assets/images/soul_eater_core.png
```

Texture keys:

```text
axe_projectile
magic_wand_projectile
treasure_chest
boss_lava_beast
thousand_edge_projectile
holy_wand_projectile
death_spiral_projectile
unholy_vespers_orbit_book
soul_eater_core
```

## UI Assets

```text
public/assets/ui/hp_icon.png
public/assets/ui/exp_icon.png
public/assets/ui/time_icon.png
```

Texture keys:

```text
hp_icon
exp_icon
time_icon
```

## Weapon Icon Assets

```text
public/assets/weapons/knife_icon.png
public/assets/weapons/garlic_icon.png
public/assets/weapons/bible_icon.png
```

Texture keys:

```text
knife_icon
garlic_icon
bible_icon
```

## Audio Assets

Temporary audio files should be placed under:

```text
public/assets/audio/
```

Expected files:

```text
enemy_hit.wav
enemy_killed.wav
player_hit.wav
level_up.wav
upgrade_selected.wav
treasure_open.wav
boss_spawn.wav
boss_dash.wav
victory.wav
game_over.wav
ui_click.wav
```

Expected audio keys:

```text
enemy_hit
enemy_killed
player_hit
level_up
upgrade_selected
treasure_open
boss_spawn
boss_dash
victory
game_over
ui_click
```

## PreloadScene

Asset loading is centralized in:

```text
src/scenes/PreloadScene.ts
```

When adding assets:

1. Put the file under `public/assets/`.
2. Add a preload entry in `PreloadScene.ts`.
3. Use a stable texture/audio key.
4. Add a fallback path in gameplay code if the asset is optional.

## Temporary Asset Policy

The current assets are placeholder content. Keep them:

- Small enough for web builds.
- Visually readable at gameplay size.
- Named clearly by gameplay purpose.
- Easy to replace later.

## PNG Transparency Note

PNG files must contain real alpha transparency. A checkerboard pattern drawn into the image is not transparent and will appear in-game.

If a generated PNG has a white or checkerboard background, remove it before committing the file.

Recommended approach:

- Use edge-connected background removal.
- Preserve weapon highlights and glow effects.
- Avoid deleting all white pixels globally.

## Git Notes for Binary Assets

GitHub API text-file updates are not suitable for binary PNG/WAV replacement in this workflow. For binary assets, replace files locally and push with Git:

```sh
git add public/assets
git commit -m "update prototype assets"
git push
```
