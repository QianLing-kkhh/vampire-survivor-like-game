export type ContentPackManifestSource = 'builtin' | 'custom' | 'mod' | 'remote';

export interface ContentPackManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  source: ContentPackManifestSource;
  contentHash?: string;
  gameVersionRange?: {
    min?: string;
    max?: string;
  };
  dependencies?: Array<{
    id: string;
    version?: string;
  }>;
  provides?: {
    weapons?: string[];
    enemies?: string[];
    passives?: string[];
    stages?: string[];
    maps?: string[];
    bosses?: string[];
    themes?: string[];
    skins?: string[];
    achievements?: string[];
  };
}
