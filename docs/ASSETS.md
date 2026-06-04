# Asset Guide

This project currently uses prototype assets. Legacy assets and the newer unified art pack coexist so old fallback paths can continue working.

## Asset Roots

Legacy static assets:

```text
public/assets/
```

Unified art pack:

```text
public/assets/art/
```

Phaser preload paths should be relative so GitHub Pages subpath deployment works:

```text
assets/art/player/player_walk_sheet.png
```

Do not use root-absolute `/assets/...` paths.

## Art Pack Structure

The current art pack is described by:

```text
public/assets/art/animation_manifest.json
```

Main directories:

```text
public/assets/art/
  effects/
  enemies/
  passives/
  pickups/
  player/
  ui/
  weapons/
  world/
```

## Manifest and Spritesheets

`animation_manifest.json` lists:

- `path`
- `key`
- `type`
- `frameWidth`
- `frameHeight`
- `frames`

`PreloadScene` mirrors the manifest into preload data, loads images with `this.load.image`, and loads spritesheets with `this.load.spritesheet`.

Animated assets use horizontal spritesheets for Phaser.

Rules:

- Use transparent PNG.
- Keep frames in one row.
- Use manifest `frameWidth` and `frameHeight`.
- Use stable texture keys from the manifest.
- Create Phaser animations from spritesheet keys.

Example animation keys:

- `art_player_walk`
- player 8-direction idle/walk aliases
- `art_slime_walk`
- `art_bat_fly`
- `art_golem_walk`
- `art_boss_lava_beast_idle`
- `art_knife_projectile_spin`
- `art_axe_projectile_spin`
- `art_death_spiral_projectile_spin`
- `art_magic_wand_projectile`
- `art_holy_wand_projectile`
- `art_thousand_edge_projectile_spin`
- `art_bible_orbit_book_spin`
- `art_unholy_vespers_orbit_book_spin`
- `art_garlic_core`
- `art_soul_eater_core`
- `art_hit_flash`
- `art_boss_dash_impact`
- `art_level_up_glow`

## Mini Boss Keys

`EnemyFactory` can use enemy IDs as texture keys, so these direct keys must remain preload-safe:

- `slime_boss`
- `bat_boss`
- `golem_boss`

The art pack also contains placeholder art keys for these mini boss variants.

## Common Texture Groups

Player:

- `art_player_player_walk_sheet`
- `art_player_walk`
- fallback: `player`

Enemies:

- `art_enemies_slime_walk_sheet`
- `art_enemies_bat_fly_sheet`
- `art_enemies_golem_walk_sheet`
- `art_enemies_boss_lava_beast_idle_sheet`
- mini boss placeholder PNGs
- fallback graphics if textures are missing

Weapons:

- `art_weapons_knife_projectile_sheet`
- `art_weapons_axe_projectile_sheet`
- `art_weapons_magic_wand_projectile_sheet`
- `art_weapons_bible_orbit_book_sheet`
- `art_weapons_garlic_core_sheet`
- `art_weapons_thousand_edge_projectile_sheet`
- `art_weapons_holy_wand_projectile_sheet`
- `art_weapons_death_spiral_projectile_sheet`
- `art_weapons_unholy_vespers_orbit_book_sheet`
- `art_weapons_soul_eater_core_sheet`

Pickups:

- `art_pickups_exp_gem`
- `art_pickups_treasure_chest`
- fallbacks: `exp_gem`, `treasure_chest`

Passives:

- `art_passives_spinach_icon`
- `art_passives_empty_tome_icon`
- `art_passives_bracer_icon`
- `art_passives_clover_icon`
- `art_passives_pummarola_icon`

World:

- `art_world_tree_landmark`
- `art_world_rock_landmark`
- `art_world_grave_landmark`
- `art_world_grass_tile`
- `art_world_ground_tile`

Effects:

- `art_effects_hit_flash_sheet`
- `art_effects_boss_dash_warning`
- `art_effects_boss_dash_impact_sheet`
- `art_effects_level_up_glow_sheet`

## Fallback Policy

Missing textures should never crash the game.

Allowed fallbacks:

- Old texture keys from `public/assets/`
- Phaser graphics circles, rectangles, or arcs
- Text initials for missing icons

When adding a new visible object:

1. Add or reuse an art pack asset.
2. Add preload support in `PreloadScene`.
3. Use `scene.textures.exists(key)` before relying on optional textures.
4. Keep fallback graphics until the asset is confirmed in builds.

## PNG Transparency

PNG files must contain real alpha transparency.

Do not commit PNGs with:

- White backgrounds baked into the image
- Checkerboard backgrounds baked into the image
- 0-byte or incomplete files

## Future Asset Key Resolver

Texture keys and animation keys are still partly mapped in gameplay/UI classes. A future `AssetKeyResolver` should centralize:

- weapon icon keys
- passive icon keys
- enemy texture keys
- projectile animation keys
- fallback texture rules
- art pack vs legacy key mapping

New code should avoid scattering new texture-key strings across unrelated systems.

## Audio Assets

Audio files live under:

```text
public/assets/audio/
  bgm/
  sfx/
  weapon/
  ui/
```

Audio is optional at runtime. `AudioManager` checks the Phaser audio cache before playback.

## Git Notes for Binary Assets

Binary PNG/WAV assets should be committed locally with Git:

```sh
git add public/assets
git commit -m "update prototype assets"
git push
```

Do not replace binary assets through a text-only GitHub API workflow.
