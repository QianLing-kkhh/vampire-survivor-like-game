export class SaveStorage {
  private static readonly STORAGE_KEY = 'vampire_survivor_like_save_v1';
  private memoryRaw: string | null = null;

  loadRaw(): string | null {
    try {
      const rawSave = globalThis.localStorage?.getItem(SaveStorage.STORAGE_KEY);

      if (rawSave !== undefined && rawSave !== null) {
        this.memoryRaw = rawSave;
        return rawSave;
      }
    } catch {
      // Memory fallback is enough for environments without localStorage.
    }

    return this.memoryRaw;
  }

  saveRaw(rawSave: string): void {
    this.memoryRaw = rawSave;

    try {
      globalThis.localStorage?.setItem(SaveStorage.STORAGE_KEY, rawSave);
    } catch {
      // Memory fallback is enough for environments without localStorage.
    }
  }

  clear(): void {
    this.memoryRaw = null;

    try {
      globalThis.localStorage?.removeItem(SaveStorage.STORAGE_KEY);
    } catch {
      // Memory fallback is enough for environments without localStorage.
    }
  }
}
