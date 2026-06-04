export interface PooledObjectFactory<T> {
  create(...args: unknown[]): T;
  destroy?(item: T): void;
}
