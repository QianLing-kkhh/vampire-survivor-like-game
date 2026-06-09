import { SaveManager } from '../../save/SaveManager';
import {
  AutoStrategyProfile,
  DEFAULT_AUTO_STRATEGY_PROFILE_ID,
  cloneAutoStrategyProfile,
  createBuiltInStrategyProfileMap,
  createDefaultStrategySaveData,
} from './AutoStrategyProfile';
import { StrategyProfileValidator } from './StrategyProfileValidator';

export class StrategyProfileRepository {
  static listProfiles(): AutoStrategyProfile[] {
    const strategy = this.getStrategyWithBuiltIns();

    return Object.values(strategy.profilesById)
      .map((profile) => StrategyProfileValidator.normalize(profile))
      .sort((a, b) => this.getProfileSortIndex(a.id) - this.getProfileSortIndex(b.id)
        || a.name.localeCompare(b.name));
  }

  static getSelectedProfile(): AutoStrategyProfile {
    const strategy = this.getStrategyWithBuiltIns();
    const selected = strategy.profilesById[strategy.selectedProfileId]
      ?? strategy.profilesById[DEFAULT_AUTO_STRATEGY_PROFILE_ID];

    return StrategyProfileValidator.normalize(selected);
  }

  static saveProfile(profile: AutoStrategyProfile, select = false): AutoStrategyProfile {
    const normalized = StrategyProfileValidator.normalize(profile);
    const current = this.getStrategyWithBuiltIns();

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
    const current = this.getStrategyWithBuiltIns();
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

  private static getStrategyWithBuiltIns(): ReturnType<typeof createDefaultStrategySaveData> {
    const current = SaveManager.get().strategy ?? createDefaultStrategySaveData();
    const builtIns = createBuiltInStrategyProfileMap();
    const profilesById = {
      ...builtIns,
      ...current.profilesById,
    };

    return {
      selectedProfileId: profilesById[current.selectedProfileId]
        ? current.selectedProfileId
        : DEFAULT_AUTO_STRATEGY_PROFILE_ID,
      profilesById,
    };
  }

  private static getProfileSortIndex(profileId: string): number {
    const index = Object.keys(createBuiltInStrategyProfileMap()).indexOf(profileId);

    return index >= 0 ? index : 1000;
  }
}
