import { PerformanceStats } from './PerformanceStats';

type ObjectCounter = 'created' | 'reused' | 'destroyed';

interface ObjectCounters {
  created: number;
  reused: number;
  destroyed: number;
}

export class PerformanceMonitor {
  private static readonly SAMPLE_INTERVAL_MS = 500;
  private static readonly SPEED_SAMPLE_INTERVAL_MS = 1000;
  private static readonly SLOWDOWN_WARN_AFTER_MS = 5000;
  private static readonly SLOWDOWN_WARN_THROTTLE_MS = 30000;

  private fps = 0;
  private deltaMs = 0;
  private averageDeltaMs = 0;
  private sampleElapsedMs = 0;
  private speedSampleRealElapsedMs = 0;
  private speedSampleGameElapsedSeconds = 0;
  private gameSecondsPerRealSecond = 0;
  private slowdownElapsedMs = 0;
  private warnCooldownMs = 0;
  private frameCount = 0;
  private readonly countersByType = new Map<string, ObjectCounters>();
  private stats: PerformanceStats = {
    fps: 0,
    deltaMs: 0,
    enemyCount: 0,
  };

  update(realDeltaMs: number, gameDeltaMs = realDeltaMs): void {
    const safeRealDeltaMs = Math.max(0, realDeltaMs);

    this.deltaMs = safeRealDeltaMs;
    this.sampleElapsedMs += safeRealDeltaMs;
    this.speedSampleRealElapsedMs += safeRealDeltaMs;
    this.speedSampleGameElapsedSeconds += Math.max(0, gameDeltaMs) / 1000;
    this.warnCooldownMs = Math.max(0, this.warnCooldownMs - safeRealDeltaMs);
    this.frameCount += 1;

    if (this.speedSampleRealElapsedMs >= PerformanceMonitor.SPEED_SAMPLE_INTERVAL_MS) {
      this.gameSecondsPerRealSecond = this.speedSampleGameElapsedSeconds
        / (this.speedSampleRealElapsedMs / 1000);
      this.speedSampleRealElapsedMs = 0;
      this.speedSampleGameElapsedSeconds = 0;
    }

    if (this.sampleElapsedMs < PerformanceMonitor.SAMPLE_INTERVAL_MS) {
      this.updateSlowdownWarning(safeRealDeltaMs);
      return;
    }

    this.fps = this.frameCount / (this.sampleElapsedMs / 1000);
    this.averageDeltaMs = this.sampleElapsedMs / Math.max(1, this.frameCount);
    this.sampleElapsedMs = 0;
    this.frameCount = 0;
    this.stats = {
      ...this.stats,
      fps: this.fps,
      deltaMs: this.deltaMs,
      averageDeltaMs: this.averageDeltaMs,
      gameSecondsPerRealSecond: this.gameSecondsPerRealSecond,
    };
    this.updateSlowdownWarning(safeRealDeltaMs);
  }

  updateCounts(counts: Partial<PerformanceStats>): void {
    this.stats = {
      ...this.stats,
      ...counts,
      fps: this.fps,
      deltaMs: this.deltaMs,
      averageDeltaMs: this.averageDeltaMs,
      gameSecondsPerRealSecond: this.gameSecondsPerRealSecond,
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
    this.averageDeltaMs = 0;
    this.sampleElapsedMs = 0;
    this.speedSampleRealElapsedMs = 0;
    this.speedSampleGameElapsedSeconds = 0;
    this.gameSecondsPerRealSecond = 0;
    this.slowdownElapsedMs = 0;
    this.warnCooldownMs = 0;
    this.frameCount = 0;
    this.countersByType.clear();
    this.stats = {
      fps: 0,
      deltaMs: 0,
      enemyCount: 0,
    };
  }

  private updateSlowdownWarning(deltaMs: number): void {
    const configuredTimeScale = this.stats.configuredTimeScale ?? 1;
    const isSlow = configuredTimeScale >= 3
      && ((this.averageDeltaMs > 45) || (this.fps > 0 && this.fps < 25));

    this.slowdownElapsedMs = isSlow
      ? this.slowdownElapsedMs + deltaMs
      : 0;

    if (
      this.slowdownElapsedMs < PerformanceMonitor.SLOWDOWN_WARN_AFTER_MS
      || this.warnCooldownMs > 0
    ) {
      return;
    }

    this.warnCooldownMs = PerformanceMonitor.SLOWDOWN_WARN_THROTTLE_MS;
    console.warn('Late endless slowdown warning', {
      timeScale: configuredTimeScale,
      effectiveTimeScale: this.stats.effectiveTimeScale ?? configuredTimeScale,
      fps: this.fps,
      averageDeltaMs: this.averageDeltaMs,
      enemyCount: this.stats.enemyCount,
      projectileCount: this.stats.projectileCount ?? 0,
      pickupCount: this.stats.pickupCount ?? 0,
      floatingTextCount: this.stats.floatingTextActiveCount
        ?? this.stats.floatingTextCount
        ?? 0,
      bossCount: this.stats.activeBossCount ?? 0,
      activeSlowZones: this.stats.slowZoneCount ?? 0,
      renderObjectEstimate: this.stats.totalRenderableWorldObjects ?? 0,
      spawnAccumulatorSummary: this.stats.spawnAccumulatorSummary ?? '',
    });
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
