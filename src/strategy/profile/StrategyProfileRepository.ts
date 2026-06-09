import { SaveManager } from '../../save/SaveManager';
import {
  AutoStrategyProfile,
  DEFAULT_AUTO_STRATEGY_PROFILE_ID,
  cloneAutoStrategyProfile,
  createDefaultStrategySaveData,
} from './AutoStrategyProfile';
import { StrategyProfileValidator } from './StrategyProfileValidator';

export class StrategyProfileRepository {
  static getSelectedProfile(): AutoStrategyProfile {
    const strategy = SaveManager.get().strategy ?? createDefaultStrategySaveData();
    const selected = strategy.profilesById[strategy.selectedProfileId]
      ?? strategy.profilesById[DEFAULT_AUTO_STRATEGY_PROFILE_ID];

    return StrategyProfileValidator.normalize(selected);
  }

  static saveProfile(profile: AutoStrategyProfile, select = false): AutoStrategyProfile {
    const normalized = StrategyProfileValidator.normalize(profile);
    const current = SaveManager.get().strategy ?? createDefaultStrategySaveData();

    SaveManager.update({
      strategy: {
        selectedProfileId: select ? normalized.id : current.selectedProfileId,
        profilesById: {
          ...current.profilesById,
          [normalized.id]: normalized,
        },
      },
    });

    return cloneAutoStrategyProfile(normalized);
  }

  static selectProfile(profileId: string): AutoStrategyProfile {
    const current = SaveManager.get().strategy ?? createDefaultStrategySaveData();
    const selectedProfile = current.profilesById[profileId]
      ?? current.profilesById[DEFAULT_AUTO_STRATEGY_PROFILE_ID];
    const normalized = StrategyProfileValidator.normalize(selectedProfile);

    SaveManager.update({
      strategy: {
        selectedProfileId: normalized.id,
        profilesById: current.profilesById,
      },
    });

    return normalized;
  }
}
