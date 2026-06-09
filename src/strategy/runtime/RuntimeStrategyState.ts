import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { cloneAutoStrategyProfile } from '../profile/AutoStrategyClone';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';
import { StrategyHasher } from '../hash/StrategyHasher';

export type StrategyEditReason = 'user' | 'preset' | 'hotkey';
export type StrategyEditValue = number | string | boolean;

export interface StrategyEditEvent {
  gameTimeSeconds: number;
  fieldPath: string;
  oldValue: StrategyEditValue;
  newValue: StrategyEditValue;
  reason: StrategyEditReason;
}

export interface RuntimeStrategySummary {
  baseProfileId: string;
  baseProfileHash: string;
  runtimeProfileHash: string;
  edited: boolean;
  editCount: number;
  editTimeline: string;
}

export class RuntimeStrategyState {
  readonly baseProfileId: string;
  readonly baseProfileHash: string;
  private readonly baseProfile: AutoStrategyProfile;
  private runtimeProfile: AutoStrategyProfile;
  private readonly editEvents: StrategyEditEvent[] = [];

  constructor(baseProfile: AutoStrategyProfile, baseProfileHash = StrategyHasher.hash(baseProfile)) {
    this.baseProfile = StrategyProfileValidator.normalize(baseProfile);
    this.baseProfileId = this.baseProfile.id;
    this.baseProfileHash = baseProfileHash;
    this.runtimeProfile = cloneAutoStrategyProfile(this.baseProfile);
  }

  getProfile(): AutoStrategyProfile {
    return cloneAutoStrategyProfile(this.runtimeProfile);
  }

  getEditEvents(): StrategyEditEvent[] {
    return this.editEvents.map((event) => ({ ...event }));
  }

  getRuntimeProfileHash(): string {
    return StrategyHasher.hash(this.runtimeProfile);
  }

  applyPatch(
    gameTimeSeconds: number,
    fieldPath: string,
    newValue: StrategyEditValue,
    reason: StrategyEditReason,
  ): StrategyEditEvent | undefined {
    const oldValue = this.readField(fieldPath);

    if (oldValue === undefined || typeof oldValue !== typeof newValue) {
      return undefined;
    }

    const safeValue = typeof newValue === 'number'
      ? Math.round(Math.max(0, Math.min(100, newValue)))
      : newValue;

    if (oldValue === safeValue) {
      return undefined;
    }

    this.writeField(fieldPath, safeValue);
    this.runtimeProfile = StrategyProfileValidator.normalize(this.runtimeProfile);

    const event: StrategyEditEvent = {
      gameTimeSeconds,
      fieldPath,
      oldValue,
      newValue: safeValue,
      reason,
    };
    this.editEvents.push(event);

    return { ...event };
  }

  resetToBase(): void {
    this.runtimeProfile = cloneAutoStrategyProfile(this.baseProfile);
    this.editEvents.length = 0;
  }

  getSummary(): RuntimeStrategySummary {
    return {
      baseProfileId: this.baseProfileId,
      baseProfileHash: this.baseProfileHash,
      runtimeProfileHash: this.getRuntimeProfileHash(),
      edited: this.editEvents.length > 0,
      editCount: this.editEvents.length,
      editTimeline: this.formatTimeline(),
    };
  }

  private readField(fieldPath: string): StrategyEditValue | undefined {
    const [section, key] = fieldPath.split('.');

    if (!section || !key || !(section in this.runtimeProfile)) {
      return undefined;
    }

    const value = (this.runtimeProfile as unknown as Record<string, Record<string, StrategyEditValue>>)[section]?.[key];

    return typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean'
      ? value
      : undefined;
  }

  private writeField(fieldPath: string, value: StrategyEditValue): void {
    const [section, key] = fieldPath.split('.');
    const target = (this.runtimeProfile as unknown as Record<string, Record<string, StrategyEditValue>>)[section];

    if (!target || !key) {
      return;
    }

    target[key] = value;
  }

  private formatTimeline(): string {
    return this.editEvents
      .map((event) => (
        `${event.gameTimeSeconds.toFixed(1)}:${event.fieldPath}:${event.oldValue}>${event.newValue}`
      ))
      .join('|');
  }
}
