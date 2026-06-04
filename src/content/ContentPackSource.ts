export type ContentPackSourceType =
  | 'builtin'
  | 'local'
  | 'custom'
  | 'mod'
  | 'remote';

export interface ContentPackSource {
  type: ContentPackSourceType;
  uri?: string;
  localStorageKey?: string;
  enabled: boolean;
}
