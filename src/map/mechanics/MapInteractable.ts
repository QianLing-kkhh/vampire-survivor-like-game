export interface MapInteractable {
  readonly id: string;
  update(deltaMs: number): void;
  destroy(): void;
}
