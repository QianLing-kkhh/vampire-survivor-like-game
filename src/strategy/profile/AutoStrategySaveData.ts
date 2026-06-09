import type { AutoStrategyProfile } from './AutoStrategyProfile';
import { DEFAULT_AUTO_STRATEGY_PROFILE_ID } from './AutoStrategyDefaults';
import { BUILT_IN_AUTO_STRATEGY_PROFILES } from './AutoStrategyPresets';
import { cloneAutoStrategyProfile } from './AutoStrategyClone';

export interface StrategySaveData {
  selectedProfileId: string;
  profilesById: Record<string, AutoStrategyProfile>;
}

export function createDefaultStrategySaveData(): StrategySaveData {
  return {
    selectedProfileId: DEFAULT_AUTO_STRATEGY_PROFILE_ID,
    profilesById: createBuiltInStrategyProfileMap(),
  };
}

export function createBuiltInStrategyProfileMap(): Record<string, AutoStrategyProfile> {
  return BUILT_IN_AUTO_STRATEGY_PROFILES.reduce<Record<string, AutoStrategyProfile>>((result, profile) => {
    result[profile.id] = cloneAutoStrategyProfile(profile);
    return result;
  }, {});
}

