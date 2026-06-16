import { LocalStorageAdapter } from './storage/LocalStorageAdapter';
import { MemoryStorageAdapter } from './storage/MemoryStorageAdapter';

export class SaveStorage {
  private static readonly STORAGE_KEY = 'vampire_survivor_like_save_v1';
  private readonly storage = new LocalStorageAdapter(new MemoryStorageAdapter());

  loadRaw(): string | null {
    return this.storage.getItem(SaveStorage.STORAGE_KEY);
  }

  saveRaw(rawSave: string): void {
    this.storage.setItem(SaveStorage.STORAGE_KEY, rawSave);
  }

  clear(): void {
    this.storage.removeItem(SaveStorage.STORAGE_KEY);
  }
}
