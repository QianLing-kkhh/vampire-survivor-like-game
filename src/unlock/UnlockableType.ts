export type BuiltInUnlockableType =
  | 'character'
  | 'stage'
  | 'map'
  | 'weapon'
  | 'passive'
  | 'cosmetic'
  | 'theme'
  | 'difficulty'
  | 'challenge'
  | 'customSlot';

export type UnlockableType = BuiltInUnlockableType | string;
