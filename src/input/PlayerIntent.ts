export type PlayerIntentSource = 'manual' | 'autoStrategy' | 'replay';

export interface PlayerIntent {
  moveX: number;
  moveY: number;
  wantsPause?: boolean;
  source: PlayerIntentSource;
}

export function createMoveIntent(
  moveX: number,
  moveY: number,
  source: PlayerIntentSource,
): PlayerIntent {
  return {
    moveX: Number.isFinite(moveX) ? moveX : 0,
    moveY: Number.isFinite(moveY) ? moveY : 0,
    source,
  };
}
