import { PerformanceStats } from './PerformanceStats';

type ObjectCounter = 'created' | 'reused' | 'destroyed';

interface ObjectCounters {
  created: number;
  reused: number;
  destroyed: number;
}

export class PerformanceMonitor {
  private static readonly SAMPLE_INTERVAL_MS = 500;

  private fps = 0;
  private deltaMs = 0;
  private sampleElapsedMs = 0;
  private frameCount = 0;
  private readonly countersByType = new Map<string, ObjectCounters>();
  private stats: PerformanceStats = {
    fps: 0,
    deltaMs: 0,
    enemyCount: 0,
  };

  update(deltaMs: number): void {
    this.deltaMs = deltaMs;
    this.sampleElapsedMs += deltaMs;
    this.frameCount += 1;

    if (this.sampleElapsedMs < PerformanceMonitor.SAMPLE_INTERVAL_MS) {
      return;
    }

    this.fps = this.frameCount / (this.sampleElapsedMs / 1000);
    this.sampleElapsedMs = 0;
    this.frameCount = 0;
    this.stats = {
      ...this.stats,
      fps: this.fps,
      deltaMs: this.deltaMs,
    };
  }

  updateCounts(counts: Partial<PerformanceStats>): void {
    this.stats = {
      ...this.stats,
      ...counts,
      fps: this.fps,
      deltaMs: this.deltaMs,
      createdObjectCount: this.getTotalCounter('created'),
      reusedObjectCount: this.getTotalCounter('reused'),
      destroyedObjectCount: this.getTotalCounter('destroyed'),
    };
  }

  getStats(): PerformanceStats {
    return { ...this.stats };
  }

  recordCreated(type: string): void {
    this.increment(type, 'created');
  }

  recordReused(type: string): void {
    this.increment(type, 'reused');
  }

  recordDestroyed(type: string): void {
    this.increment(type, 'destroyed');
  }

  reset(): void {
    this.fps = 0;
    this.deltaMs = 0;
    this.sampleElapsedMs = 0;
    this.frameCount = 0;
    this.countersByType.clear();
    this.stats = {
      fps: 0,
      deltaMs: 0,
      enemyCount: 0,
    };
  }

  private increment(type: string, counter: ObjectCounter): void {
    const counters = this.countersByType.get(type) ?? {
      created: 0,
      reused: 0,
      destroyed: 0,
    };

    counters[counter] += 1;
    this.countersByType.set(type, counters);
  }

  private getTotalCounter(counter: ObjectCounter): number {
    let total = 0;

    for (const counters of this.countersByType.values()) {
      total += counters[counter];
    }

    return total;
  }
}
