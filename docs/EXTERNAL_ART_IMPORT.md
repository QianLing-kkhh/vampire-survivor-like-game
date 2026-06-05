# External Art Import

External final art is generated outside this codebase by ChatGPT or another image tool. Codex should not design final art here. Codex only identifies, validates, registers, connects, and preserves fallback behavior.

## Drop-In Directory

Place imported PNG files under:

```text
public/assets/imports/
```

The runtime manifest is:

```text
public/assets/imports/manifest.json
```

`manifest.json` is optional. If it does not exist, the game starts with built-in art. `manifest.example.json` is a template and does not affect runtime.

## Recommended Specs

- Player frame size: 64x64 or 80x80.
- Walk animation: 4 horizontal frames.
- Idle animation: 2-4 horizontal frames.
- File format: transparent PNG.
- Keep one animation direction per file.
- Do not bake white, checkerboard, or opaque backgrounds into PNGs.

## Naming Rules

Use stable, readable folder names:

```text
player/assassin_default/walk_down.png
player/assassin_default/idle_down.png
player/assassin_default/portrait.png
weapons/knife_icon.png
effects/witch_slow_zone.png
```

Manifest paths must be relative to `basePath`, use forward slashes, and must not contain `..`.

## Manifest Fields

Required top-level fields:

- `version`: manifest schema version number.
- `basePath`: normally `assets/imports`.
- `assets`: array of asset entries.

Required asset fields:

- `id`: stable import id.
- `type`: `spritesheet`, `image`, `effect`, `portrait`, `icon`, or `ui`.
- `category`: `player`, `enemy`, `boss`, `weapon`, `passive`, `pickup`, `world`, `effect`, or `ui`.
- `path`: PNG path relative to `basePath`.
- `textureKey`: Phaser texture key.

Optional asset fields:

- `animationKey`: Phaser animation key for spritesheets.
- `logicalKey`: resolver override key.
- `frameWidth`, `frameHeight`, `frameCount`, `frameRate`, `repeat`: spritesheet animation data.
- `state`, `direction`: player animation lookup metadata.
- `targetId`: character, weapon, enemy, or effect id.
- `skinId`: skin id such as `assassin_default`.

Spritesheets must include `frameWidth` and `frameHeight`.

## Replace A Character Animation

Example logical key:

```text
player.assassin_default.walk.down
```

Add a spritesheet asset with:

- `category`: `player`
- `type`: `spritesheet`
- `skinId`: `assassin_default`
- `state`: `walk`
- `direction`: `down`
- `logicalKey`: `player.assassin_default.walk.down`
- `animationKey`: a unique external animation key

`AssetKeyResolver` will prefer the imported animation when it is loaded. Missing files fall back to built-in art.

## Replace A Portrait

Add a portrait asset with:

- `category`: `player`
- `type`: `portrait`
- `skinId`: `assassin_default`
- `logicalKey`: `player.assassin_default.portrait`

Portraits can still display in graphics/minimal mode, matching the current UI icon policy.

## Replace A Weapon Icon

Add an icon asset with:

- `category`: `weapon`
- `type`: `icon`
- `targetId`: weapon id such as `knife`
- `logicalKey`: `weapon.knife.icon`

Weapon icons use UI/icon fallback behavior and do not affect weapon logic.

## Validation

Run:

```sh
npm.cmd run validate:external-art
```

The script checks:

- `manifest.json` is valid JSON when present.
- `assets` is an array.
- each asset path exists.
- `textureKey` values are unique.
- `animationKey` values are unique.
- spritesheets define `frameWidth` and `frameHeight`.

If no manifest exists, it prints `No external art manifest found.` and exits successfully.

## Fallback Check

To confirm fallback behavior:

1. Remove or rename `public/assets/imports/manifest.json`.
2. Run the game or build.
3. Confirm built-in art is still used.
4. Add a manifest entry with a missing PNG.
5. Run `npm.cmd run validate:external-art` and confirm it reports the missing file.

Runtime import errors should warn and continue with built-in fallback art.

## Boundary

Do not modify gameplay files to import art. Do not change character stats, weapon behavior, enemy data, wave data, CSV files, or save rules for visual imports. External art should enter through `public/assets/imports/manifest.json`, `PreloadScene`, and `AssetKeyResolver`.
