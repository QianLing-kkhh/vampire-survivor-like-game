import type { ContentPack } from './ContentPack';
import type { ContentPackManifest } from './ContentPackManifest';

export interface ContentPackProviderResult {
  success: boolean;
  pack?: ContentPack;
  errors: string[];
  warnings: string[];
}

export interface ContentPackProvider {
  readonly id: string;
  listManifests(): Promise<ContentPackManifest[]>;
  loadPack(manifestId: string): Promise<ContentPackProviderResult>;
}
