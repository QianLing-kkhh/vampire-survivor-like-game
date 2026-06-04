import { GameEvent } from './GameEvent';

export class GameEventRecorder {
  private readonly events: GameEvent[] = [];

  constructor(private readonly maxEvents = 1000) {}

  record(event: GameEvent): void {
    this.events.push(event);

    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }
  }

  getRecentEvents(): GameEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }

  exportJson(): string {
    return JSON.stringify(this.events, null, 2);
  }
}
