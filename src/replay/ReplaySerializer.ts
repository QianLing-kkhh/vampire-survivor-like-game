import { ReplayData } from './ReplayData';
import { REPLAY_VERSION } from './ReplayVersion';

export interface ReplayValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ReplaySerializer {
  static serialize(replay: ReplayData): string {
    return JSON.stringify(replay, null, 2);
  }

  static parse(text: string): ReplayData | null {
    try {
      return JSON.parse(text) as ReplayData;
    } catch {
      return null;
    }
  }

  static validate(replay: unknown): ReplayValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.isObject(replay)) {
      return {
        valid: false,
        errors: ['Replay data must be an object.'],
        warnings,
      };
    }

    if (replay.replayVersion !== REPLAY_VERSION) {
      warnings.push(`Replay version ${String(replay.replayVersion)} differs from current version ${REPLAY_VERSION}.`);
    }

    if (typeof replay.runId !== 'string' || replay.runId.length === 0) {
      errors.push('Replay runId is required.');
    }

    if (typeof replay.runSeed !== 'string' || replay.runSeed.length === 0) {
      errors.push('Replay runSeed is required.');
    }

    if (!this.isObject(replay.selection)) {
      errors.push('Replay selection is required.');
    } else {
      for (const key of ['characterId', 'stageId', 'mapId']) {
        if (typeof replay.selection[key] !== 'string' || replay.selection[key].length === 0) {
          errors.push(`Replay selection.${key} is required.`);
        }
      }
    }

    if (!Array.isArray(replay.inputSamples)) {
      warnings.push('Replay inputSamples should be an array.');
    }

    if (!Array.isArray(replay.events)) {
      warnings.push('Replay events should be an array.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
