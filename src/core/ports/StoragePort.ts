export type StorageValue = string;
export type StorageResult<T> = T | Promise<T>;

export interface StoragePort {
  getItem(key: string): StorageResult<StorageValue | null>;
  setItem(key: string, value: StorageValue): StorageResult<void>;
  removeItem(key: string): StorageResult<void>;
  listKeys(prefix?: string): StorageResult<string[]>;
}
