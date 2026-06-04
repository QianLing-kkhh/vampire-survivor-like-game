export interface Poolable {
  resetForReuse(...args: unknown[]): void;
  releaseToPool(): void;
  isActiveInPool(): boolean;
}
