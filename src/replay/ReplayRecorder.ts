import { GameEvent } from '../events/GameEvent';
import { getCurrentVersionInfo } from '../version/VersionInfo';

import {
  ReplayData,
  ReplayEventMarker,
  ReplayInputSample,
  ReplayResultSummary,
  ReplayStartConfig,
} from './ReplayData';
import { REPLAY_VERSION } from './ReplayVersion';

const REPLAY_RECORDED_EVENT_TYPES = new Set([
  'run.started',
  'enemy.killed',
  'player.levelUp',
  'weapon.evolved',
  'pickup.treasureOpened',
  'boss.spawned',
  'boss.killed',
  'endless.started',
  'endless.rewardChosen',
  'run.ended',
]);

export class ReplayRecorder {
  private static readonly MAX_EVENTS = 5000;
  private static readonly MIN_INPUT_INTERVAL_MS = 100;

  private replayData: ReplayData | null = null;
  private lastInputSampleTimeMs = Number.NEGATIVE_INFINITY;
  private eventLimitWarningShown = false;

  start(config: ReplayStartConfig): void {
    const versionInfo = config.versionInfo ?? getCurrentVersionInfo();

    this.replayData = {
      replayVersion: REPLAY_VERSION,
      createdAt: new Date().toISOString(),
      gameVersion: versionInfo.gameVersion,
      contentHash: versionInfo.contentHash,
      saveSchemaVersion: config.saveSchemaVersion ?? versionInfo.saveSchemaVersion,
      csvSchemaVersion: config.csvSchemaVersion ?? versionInfo.csvSchemaVersion,
      versionInfo,
      metadata: config.metadata ? { ...config.metadata } : undefined,
      runId: config.metadata?.runId ?? config.runId,
      runSeed: config.metadata?.runSeed ?? config.runSeed,
      selection: { ...config.selection },
      settingsSnapshot: { ...config.settingsSnapshot },
      inputSamples: [],
      events: [],
    };
    this.lastInputSampleTimeMs = Number.NEGATIVE_INFINITY;
    this.eventLimitWarningShown = false;
  }

  stop(result?: ReplayResultSummary): ReplayData | null {
    if (!this.replayData) {
      return null;
    }

    if (result) {
      this.replayData.result = { ...result };
    }

    return this.getReplayData();
  }

  recordInput(timeMs: number, inputState: Omit<ReplayInputSample, 'timeMs'>): void {
    if (!this.replayData) {
      return;
    }

    if (timeMs - this.lastInputSampleTimeMs < ReplayRecorder.MIN_INPUT_INTERVAL_MS) {
      return;
    }

    this.replayData.inputSamples.push({
      timeMs,
      ...inputState,
    });
    this.lastInputSampleTimeMs = timeMs;
  }

  recordEvent(event: GameEvent): void {
    if (!this.replayData || !REPLAY_RECORDED_EVENT_TYPES.has(event.type)) {
      return;
    }

    if (this.replayData.events.length >= ReplayRecorder.MAX_EVENTS) {
      if (!this.eventLimitWarningShown) {
        console.warn('Replay event limit reached; further replay events will be skipped.');
        this.eventLimitWarningShown = true;
      }

      return;
    }

    this.replayData.events.push(this.toEventMarker(event));
  }

  getReplayData(): ReplayData | null {
    return this.replayData
      ? JSON.parse(JSON.stringify(this.replayData)) as ReplayData
      : null;
  }

  clear(): void {
    this.replayData = null;
    this.lastInputSampleTimeMs = Number.NEGATIVE_INFINITY;
    this.eventLimitWarningShown = false;
  }

  private toEventMarker(event: GameEvent): ReplayEventMarker {
    const payload = this.toRecordPayload(event.payload);

    return {
      timeMs: Math.max(0, Math.round(event.gameTimeSeconds * 1000)),
      type: event.type,
      ...(payload ? { payload } : {}),
    };
  }

  private toRecordPayload(payload: unknown): Record<string, unknown> | undefined {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  }
}
