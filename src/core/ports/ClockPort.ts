export interface ClockSnapshot {
  deltaMs: number;
  elapsedMs: number;
  paused: boolean;
  timeScale: number;
}

export interface ClockPort {
  getSnapshot(): ClockSnapshot;
}
