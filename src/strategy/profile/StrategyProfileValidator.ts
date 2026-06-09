import type { AutoStrategyProfile } from './AutoStrategyProfile';
import { cloneAutoStrategyProfile } from './AutoStrategyClone';
import {
  AUTO_STRATEGY_PROFILE_VERSION,
  DEFAULT_AUTO_STRATEGY_PROFILE,
} from './AutoStrategyDefaults';

const WEIGHT_MIN = 0;
const WEIGHT_MAX = 100;

export class StrategyProfileValidator {
  static normalize(profile: unknown): AutoStrategyProfile {
    if (!this.isObject(profile)) {
      return cloneAutoStrategyProfile(DEFAULT_AUTO_STRATEGY_PROFILE);
    }

    const fallback = DEFAULT_AUTO_STRATEGY_PROFILE;

    return {
      version: AUTO_STRATEGY_PROFILE_VERSION,
      id: this.readString(profile.id, fallback.id),
      name: this.readString(profile.name, fallback.name),
      movement: this.normalizeSection(profile.movement, fallback.movement),
      upgrade: this.normalizeSection(profile.upgrade, fallback.upgrade),
      treasure: this.normalizeSection(profile.treasure, fallback.treasure),
      relic: this.normalizeSection(profile.relic, fallback.relic),
    };
  }

  static normalizeForHash(profile: AutoStrategyProfile): Omit<AutoStrategyProfile, 'name'> {
    const normalized = this.normalize(profile);
    const { name: _name, ...hashableProfile } = normalized;

    return hashableProfile;
  }

  private static normalizeSection<T extends object>(
    value: unknown,
    fallback: T,
  ): T {
    const source = this.isObject(value) ? value : {};
    const result = { ...fallback } as Record<string, number>;

    for (const key of Object.keys(fallback)) {
      result[key] = this.readWeight(
        source[key],
        typeof result[key] === 'number' ? result[key] : 0,
      );
    }

    return result as T;
  }

  private static readWeight(value: unknown, fallback: number): number {
    const raw = typeof value === 'number' && Number.isFinite(value) ? value : fallback;

    return Math.round(Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, raw)));
  }

  private static readString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }

  private static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
