export type ImageAssetRequest = {
  type: 'image';
  key: string;
  path: string;
};

export type SpritesheetAssetRequest = {
  type: 'spritesheet';
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  endFrame?: number;
};

export type AudioAssetRequest = {
  type: 'audio';
  key: string;
  path: string;
};

export type JsonAssetRequest = {
  type: 'json';
  key: string;
  path: string;
};

export type AssetRequest =
  | ImageAssetRequest
  | SpritesheetAssetRequest
  | AudioAssetRequest
  | JsonAssetRequest;

export type AssetLoadPlan = {
  id: string;
  assets: AssetRequest[];
};
