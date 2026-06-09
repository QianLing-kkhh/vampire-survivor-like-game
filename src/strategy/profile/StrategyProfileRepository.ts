import { SaveManager } from '../../save/SaveManager';
import {
  AutoStrategyProfile,
  DEFAULT_AUTO_STRATEGY_PROFILE_ID,
  INTERNAL_AUTO_STRATEGY_PROFILES,
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
      .filter((profile) => !this.isInternalProfile(profile.id))
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
    const normalized = this.ensureWritableProfile(StrategyProfileValidator.normalize(profile));
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

  static copyProfile(profileId: string): AutoStrategyProfile {
    const current = this.getStrategyWithBuiltIns();
    const source = current.profilesById[profileId]
      ?? current.profilesById[DEFAULT_AUTO_STRATEGY_PROFILE_ID];
    const normalized = StrategyProfileValidator.normalize(source);
    const copy = StrategyProfileValidator.normalize({
      ...normalized,
      id: this.createCustomProfileId(normalized.id),
      name: `${normalized.name} Copy`,
    });

    return this.saveProfile(copy, true);
  }

  static deleteProfile(profileId: string): boolean {
    if (this.isReadonlyProfile(profileId)) {
      return false;
    }

    const current = this.getStrategyWithBuiltIns();

    if (!current.profilesById[profileId]) {
      return false;
    }

    const { [profileId]: _removed, ...profilesById } = current.profilesById;
    const selectedProfileId = current.selectedProfileId === profileId
      ? DEFAULT_AUTO_STRATEGY_PROFILE_ID
      : current.selectedProfileId;

    SaveManager.update({
      strategy: {
        selectedProfileId,
        profilesById,
      },
    });

    return true;
  }

  static importProfile(profile: AutoStrategyProfile, select = true): AutoStrategyProfile {
    const normalized = StrategyProfileValidator.normalize(profile);
    const current = this.getStrategyWithBuiltIns();
    const needsNewId = this.isReadonlyProfile(normalized.id)
      || current.profilesById[normalized.id] !== undefined;
    const imported = this.ensureWritableProfile({
      ...normalized,
      id: needsNewId
        ? this.createCustomProfileId(normalized.id)
        : normalized.id,
    });

    return this.saveProfile(imported, select);
  }

  static isReadonlyProfile(profileId: string): boolean {
    return this.isBuiltInProfile(profileId) || this.isInternalProfile(profileId);
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

  private static ensureWritableProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
    if (!this.isReadonlyProfile(profile.id)) {
      return profile;
    }

    return {
      ...profile,
      id: this.createCustomProfileId(profile.id),
      name: `${profile.name} Custom`,
    };
  }

  private static createCustomProfileId(baseId: string): string {
    const current = this.getStrategyWithBuiltIns();
    const safeBaseId = baseId.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
      || 'strategy';
    let candidate = `custom_${safeBaseId}`;
    let index = 2;

    while (current.profilesById[candidate]) {
      candidate = `custom_${safeBaseId}_${index}`;
      index += 1;
    }

    return candidate;
  }

  private static isBuiltInProfile(profileId: string): boolean {
    return Object.prototype.hasOwnProperty.call(createBuiltInStrategyProfileMap(), profileId);
  }

  private static isInternalProfile(profileId: string): boolean {
    return INTERNAL_AUTO_STRATEGY_PROFILES.some((profile) => profile.id === profileId);
  }
}
