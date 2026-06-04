import { ReplayData } from './ReplayData';

export class ReplayPlaybackController {
  private replay: ReplayData | null = null;

  load(replay: ReplayData): void {
    this.replay = JSON.parse(JSON.stringify(replay)) as ReplayData;
  }

  isLoaded(): boolean {
    return this.replay !== null;
  }

  getReplay(): ReplayData | null {
    return this.replay
      ? JSON.parse(JSON.stringify(this.replay)) as ReplayData
      : null;
  }

  clear(): void {
    this.replay = null;
  }
}
