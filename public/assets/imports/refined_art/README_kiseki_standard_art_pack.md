# VSG Kiseki-Style Character Art Pack

This pack updates the playable character walking assets to the new standard.

## New standard

- 2.5D JRPG field-character style
- Strong 8-direction readability
- Independent front / side / back / diagonal poses
- Clear body lean toward movement direction
- Alternating legs and arm swing
- Cloak, robe, staff, sword, or dagger follows the motion
- 80x80 frames
- 4 frames per direction
- Combined sheet: 320x640, 4 columns x 8 rows

## Direction row order

1. walk_up
2. walk_up_right
3. walk_right
4. walk_down_right
5. walk_down
6. walk_down_left
7. walk_left
8. walk_up_left

## Compatibility

Both combined sheets and per-direction sheets are included.

Combined:

```text
public/assets/art/player/{skin}/walk_8dir_sheet.png
```

Per-direction:

```text
public/assets/art/player/{skin}/walk_up.png
public/assets/art/player/{skin}/walk_up_right.png
public/assets/art/player/{skin}/walk_right.png
public/assets/art/player/{skin}/walk_down_right.png
public/assets/art/player/{skin}/walk_down.png
public/assets/art/player/{skin}/walk_down_left.png
public/assets/art/player/{skin}/walk_left.png
public/assets/art/player/{skin}/walk_up_left.png
```

## Important code note

If the game still hardcodes playable character walk spritesheets as 64x64 in `src/scenes/PreloadScene.ts`, change those generated walk entries to load at `frameWidth: 80` and `frameHeight: 80`. The `animation_manifest.json` in this pack already records the correct 80x80 frame size.
