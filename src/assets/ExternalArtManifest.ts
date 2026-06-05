export interface ExternalArtManifest {
  version: number;
  name?: string;
  author?: string;
  description?: string;
  basePath: string;
  assets: ExternalArtAsset[];
}

export type ExternalArtAssetType =
  | 'spritesheet'
  | 'image'
  | 'effect'
  | 'portrait'
  | 'icon'
  | 'ui';

export type ExternalArtAssetCategory =
  | 'player'
  | 'enemy'
  | 'boss'
  | 'weapon'
  | 'passive'
  | 'pickup'
  | 'world'
  | 'effect'
  | 'ui';

export type ExternalArtAssetState = 'idle' | 'walk' | 'attack' | 'hit' | 'skill';

export type ExternalArtAssetDirection =
  | 'up'
  | 'up_right'
  | 'right'
  | 'down_right'
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left';

export interface ExternalArtAsset {
  id: string;
  type: ExternalArtAssetType;
  category: ExternalArtAssetCategory;
  path: string;
  textureKey: string;
  animationKey?: string;
  logicalKey?: string;
  frameWidth?: number;
  frameHeight?: number;
  frameCount?: number;
  frameRate?: number;
  repeat?: number;
  state?: ExternalArtAssetState;
  direction?: ExternalArtAssetDirection;
  targetId?: string;
  skinId?: string;
}

export const EXTERNAL_ART_IMPORT_BASE_PATH = 'assets/imports';
export const EXTERNAL_ART_MANIFEST_PATH = `${EXTERNAL_ART_IMPORT_BASE_PATH}/manifest.json`;
export const EXTERNAL_ART_MANIFEST_CACHE_KEY = 'external_art_manifest';
