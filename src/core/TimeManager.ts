export class TimeManager {
  private elapsedTimeMs = 0;
  private paused = false;

  get gameTime(): number {
    return this.elapsedTimeMs;
  }

  get gameTimeSeconds(): number {
    return this.elapsedTimeMs / 1000;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  update(deltaMs: number): void {
    if (this.paused) {
      return;
    }

    this.elapsedTimeMs += Math.max(0, deltaMs);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  reset(): void {
    this.elapsedTimeMs = 0;
    this.paused = false;
  }
}
