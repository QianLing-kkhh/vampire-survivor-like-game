import type { StoragePort, StorageValue } from '../../core/ports/StoragePort';

export class MemoryStorageAdapter implements StoragePort {
  private readonly values = new Map<string, StorageValue>();

  constructor(initialValues?: Iterable<readonly [string, StorageValue]>) {
    if (initialValues) {
      for (const [key, value] of initialValues) {
        this.values.set(key, value);
      }
    }
  }

  getItem(key: string): StorageValue | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: StorageValue): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  listKeys(prefix = ''): string[] {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}
