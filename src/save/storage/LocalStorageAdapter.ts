import type { StoragePort, StorageValue } from '../../core/ports/StoragePort';

import { MemoryStorageAdapter } from './MemoryStorageAdapter';

interface SyncStoragePort {
  getItem(key: string): StorageValue | null;
  setItem(key: string, value: StorageValue): void;
  removeItem(key: string): void;
  listKeys(prefix?: string): string[];
}

interface BrowserStorageLike {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
}

export class LocalStorageAdapter implements StoragePort {
  constructor(
    private readonly fallback: SyncStoragePort = new MemoryStorageAdapter(),
    private readonly getStorage = LocalStorageAdapter.getBrowserStorage,
  ) {}

  getItem(key: string): StorageValue | null {
    try {
      const value = this.getStorage()?.getItem(key);

      if (value !== undefined && value !== null) {
        return value;
      }
    } catch {
      // Fall back to memory storage when browser storage is unavailable.
    }

    return this.fallback.getItem(key);
  }

  setItem(key: string, value: StorageValue): void {
    this.fallback.setItem(key, value);

    try {
      this.getStorage()?.setItem(key, value);
    } catch {
      // Memory fallback already contains the latest value.
    }
  }

  removeItem(key: string): void {
    this.fallback.removeItem(key);

    try {
      this.getStorage()?.removeItem(key);
    } catch {
      // Memory fallback already removed the value.
    }
  }

  listKeys(prefix = ''): string[] {
    try {
      const storage = this.getStorage();

      if (storage) {
        const keys = new Set(this.fallback.listKeys(prefix));

        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);

          if (key !== null && key.startsWith(prefix)) {
            keys.add(key);
          }
        }

        return [...keys];
      }
    } catch {
      // Fall back to memory storage when browser storage is unavailable.
    }

    return this.fallback.listKeys(prefix);
  }

  private static getBrowserStorage(): BrowserStorageLike | undefined {
    return globalThis.localStorage as BrowserStorageLike | undefined;
  }
}
