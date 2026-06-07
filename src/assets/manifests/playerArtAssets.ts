import type { ArtManifestAsset } from './AssetManifestTypes';

export const PLAYER_ART_SKIN_IDS = [
  'assassin_default',
  'witch_default',
  'priest_default',
  'warrior_default',
] as const;

export const PLAYER_ART_DIRECTIONS = [
  'up',
  'up_right',
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
] as const;

export const PLAYER_CHARACTER_ANIMATION_ASSETS: ArtManifestAsset[] = PLAYER_ART_SKIN_IDS.flatMap(
  (skinId) => ['walk', 'idle'].flatMap((state) => PLAYER_ART_DIRECTIONS.map((direction) => ({
    path: `player/${skinId}/${state}_${direction}.png`,
    key: `art_player_${skinId}_${state}_${direction}`,
    type: 'spritesheet' as const,
    frameWidth: 80,
    frameHeight: 80,
    frames: 4,
  }))),
);

export const PLAYER_CHARACTER_IMAGE_ASSETS: ArtManifestAsset[] = [
  ...PLAYER_ART_SKIN_IDS.flatMap((skinId) => [
    {
      path: `player/${skinId}/portrait.png`,
      key: `art_player_${skinId}_portrait`,
      type: 'image' as const,
      frameWidth: 128,
      frameHeight: 128,
      frames: 1,
    },
    {
      path: `player/${skinId}/hit_fx.png`,
      key: `art_player_${skinId}_hit_fx`,
      type: 'image' as const,
      frameWidth: 96,
      frameHeight: 96,
      frames: 1,
    },
  ]),
  { path: 'player/assassin_default/blink_trail.png', key: 'art_player_assassin_default_blink_trail', type: 'image' as const, frameWidth: 128, frameHeight: 64, frames: 1 },
  { path: 'player/assassin_default/blink_flash.png', key: 'art_player_assassin_default_blink_flash', type: 'image' as const, frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'player/witch_default/slow_zone.png', key: 'art_player_witch_default_slow_zone', type: 'image' as const, frameWidth: 192, frameHeight: 192, frames: 1 },
  { path: 'player/priest_default/sanctuary_circle.png', key: 'art_player_priest_default_sanctuary_circle', type: 'image' as const, frameWidth: 224, frameHeight: 224, frames: 1 },
  { path: 'player/warrior_default/counter_wave.png', key: 'art_player_warrior_default_counter_wave', type: 'image' as const, frameWidth: 192, frameHeight: 192, frames: 1 },
];
