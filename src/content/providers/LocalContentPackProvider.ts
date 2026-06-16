import type { ContentPack } from '../ContentPack';
import type {
  ContentPackProvider,
  ContentPackProviderResult,
} from '../ContentPackProvider';
import type { ContentPackManifest } from '../ContentPackManifest';
import { LocalStorageAdapter } from '../../save/storage/LocalStorageAdapter';

interface LocalContentPackEntry {
  manifest: ContentPackManifest;
  pack: ContentPack;
}

export class LocalContentPackProvider implements ContentPackProvider {
  private static memoryEntries: LocalContentPackEntry[] = [];
  private static readonly storage = new LocalStorageAdapter();

  readonly id = 'local';

  constructor(
    private readonly storageKey = 'vampire_survivor_like_local_content_packs_v1',
  ) {}

  static clearDefaultStorage(): void {
    LocalContentPackProvider.memoryEntries = [];
    LocalContentPackProvider.storage.removeItem('vampire_survivor_like_local_content_packs_v1');
  }

  async listManifests(): Promise<ContentPackManifest[]> {
    return this.loadEntries().map((entry) => ({ ...entry.manifest }));
  }

  async loadPack(manifestId: string): Promise<ContentPackProviderResult> {
    const entry = this.loadEntries().find(
      (candidate) => candidate.manifest.id === manifestId,
    );

    if (!entry) {
      return {
        success: false,
        errors: [`Local content pack not found: ${manifestId}`],
        warnings: [],
      };
    }

    return {
      success: true,
      pack: this.clone(entry.pack),
      errors: [],
      warnings: [],
    };
  }

  private loadEntries(): LocalContentPackEntry[] {
    const serialized = this.readStorage();
    if (!serialized) {
      return LocalContentPackProvider.memoryEntries.map((entry) =>
        this.clone(entry),
      );
    }

    try {
      const parsed = JSON.parse(serialized) as unknown;
      if (!Array.isArray(parsed)) {
        console.warn('Local content pack storage is not an array.');
        return [];
      }

      return parsed
        .filter((entry): entry is LocalContentPackEntry =>
          this.isEntry(entry),
        )
        .map((entry) => this.clone(entry));
    } catch (error) {
      console.warn('Failed to parse local content pack storage.', error);
      return [];
    }
  }

  private readStorage(): string | null {
    return LocalContentPackProvider.storage.getItem(this.storageKey);
  }

  private isEntry(value: unknown): value is LocalContentPackEntry {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as {
      manifest?: { id?: unknown };
      pack?: { id?: unknown; version?: unknown };
    };

    return (
      typeof candidate.manifest?.id === 'string' &&
      typeof candidate.pack?.id === 'string' &&
      typeof candidate.pack?.version === 'string'
    );
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
