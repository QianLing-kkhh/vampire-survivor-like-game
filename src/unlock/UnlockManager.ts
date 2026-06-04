import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import { SaveManager } from '../save/SaveManager';

import { UnlockDefinition } from './UnlockDefinition';
import { UnlockReward } from './UnlockReward';
import { UnlockableType } from './UnlockableType';
import { UnlockRegistry } from './UnlockRegistry';

export interface UnlockProgress {
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UnlockEvent {
  type: 'unlocked' | 'locked';
  unlockableType: UnlockableType;
  targetId: string;
  definitionId?: string;
}

export type UnlockListener = (event: UnlockEvent) => void;

export class UnlockManager {
  private static readonly listeners = new Set<UnlockListener>();

  static initialize(): void {
    ContentBootstrap.ensureInitialized();
    UnlockRegistry.ensureBuiltInsRegistered();

    for (const definition of UnlockRegistry.list()) {
      if (definition.defaultUnlocked === true) {
        this.unlock(definition.type, definition.targetId, definition.id);
      }
    }
  }

  static isUnlocked(type: UnlockableType, targetId: string): boolean {
    this.initializeRegistryOnly();
    const save = SaveManager.get();

    switch (type) {
      case 'character':
        return save.progression.unlockedCharacterIds.includes(targetId);
      case 'stage':
        return save.progression.unlockedStageIds.includes(targetId);
      case 'map':
        return save.progression.unlockedMapIds.includes(targetId);
      case 'weapon':
        return save.progression.unlockedWeaponIds.includes(targetId);
      case 'passive':
        return save.progression.unlockedPassiveIds.includes(targetId);
      case 'cosmetic':
        return save.progression.unlockedCosmeticIds.includes(targetId);
      case 'theme':
        return save.progression.unlockedThemeIds.includes(targetId);
      case 'difficulty':
        return save.progression.unlockedDifficultyIds.includes(targetId);
      case 'challenge':
        return save.progression.unlockedChallengeIds.includes(targetId);
      default:
        return save.progression.unlocks?.[this.getUnlockKey(type, targetId)]?.unlocked === true;
    }
  }

  static unlock(
    type: UnlockableType,
    targetId: string,
    definitionId?: string,
  ): boolean {
    this.initializeRegistryOnly();

    if (this.isUnlocked(type, targetId)) {
      return false;
    }

    if (!this.targetExists(type, targetId)) {
      console.warn(`Unlock target does not exist: ${type}:${targetId}`);
    }

    const save = SaveManager.get();
    const unlockedAt = new Date().toISOString();

    SaveManager.update({
      progression: {
        ...save.progression,
        unlockedCharacterIds: type === 'character'
          ? this.addUnique(save.progression.unlockedCharacterIds, targetId)
          : save.progression.unlockedCharacterIds,
        unlockedStageIds: type === 'stage'
          ? this.addUnique(save.progression.unlockedStageIds, targetId)
          : save.progression.unlockedStageIds,
        unlockedMapIds: type === 'map'
          ? this.addUnique(save.progression.unlockedMapIds, targetId)
          : save.progression.unlockedMapIds,
        unlockedWeaponIds: type === 'weapon'
          ? this.addUnique(save.progression.unlockedWeaponIds, targetId)
          : save.progression.unlockedWeaponIds,
        unlockedPassiveIds: type === 'passive'
          ? this.addUnique(save.progression.unlockedPassiveIds, targetId)
          : save.progression.unlockedPassiveIds,
        unlockedCosmeticIds: type === 'cosmetic'
          ? this.addUnique(save.progression.unlockedCosmeticIds, targetId)
          : save.progression.unlockedCosmeticIds,
        unlockedThemeIds: type === 'theme'
          ? this.addUnique(save.progression.unlockedThemeIds, targetId)
          : save.progression.unlockedThemeIds,
        unlockedDifficultyIds: type === 'difficulty'
          ? this.addUnique(save.progression.unlockedDifficultyIds, targetId)
          : save.progression.unlockedDifficultyIds,
        unlockedChallengeIds: type === 'challenge'
          ? this.addUnique(save.progression.unlockedChallengeIds, targetId)
          : save.progression.unlockedChallengeIds,
        unlocks: {
          ...save.progression.unlocks,
          [this.getUnlockKey(type, targetId)]: {
            unlocked: true,
            unlockedAt,
          },
        },
      },
    });
    this.notify({ type: 'unlocked', unlockableType: type, targetId, definitionId });
    return true;
  }

  static lock(type: UnlockableType, targetId: string): boolean {
    this.initializeRegistryOnly();

    if (!this.isUnlocked(type, targetId)) {
      return false;
    }

    const save = SaveManager.get();

    SaveManager.update({
      progression: {
        ...save.progression,
        unlockedCharacterIds: type === 'character'
          ? save.progression.unlockedCharacterIds.filter((id) => id !== targetId)
          : save.progression.unlockedCharacterIds,
        unlockedStageIds: type === 'stage'
          ? save.progression.unlockedStageIds.filter((id) => id !== targetId)
          : save.progression.unlockedStageIds,
        unlockedMapIds: type === 'map'
          ? save.progression.unlockedMapIds.filter((id) => id !== targetId)
          : save.progression.unlockedMapIds,
        unlockedWeaponIds: type === 'weapon'
          ? save.progression.unlockedWeaponIds.filter((id) => id !== targetId)
          : save.progression.unlockedWeaponIds,
        unlockedPassiveIds: type === 'passive'
          ? save.progression.unlockedPassiveIds.filter((id) => id !== targetId)
          : save.progression.unlockedPassiveIds,
        unlockedCosmeticIds: type === 'cosmetic'
          ? save.progression.unlockedCosmeticIds.filter((id) => id !== targetId)
          : save.progression.unlockedCosmeticIds,
        unlockedThemeIds: type === 'theme'
          ? save.progression.unlockedThemeIds.filter((id) => id !== targetId)
          : save.progression.unlockedThemeIds,
        unlockedDifficultyIds: type === 'difficulty'
          ? save.progression.unlockedDifficultyIds.filter((id) => id !== targetId)
          : save.progression.unlockedDifficultyIds,
        unlockedChallengeIds: type === 'challenge'
          ? save.progression.unlockedChallengeIds.filter((id) => id !== targetId)
          : save.progression.unlockedChallengeIds,
        unlocks: {
          ...save.progression.unlocks,
          [this.getUnlockKey(type, targetId)]: {
            unlocked: false,
          },
        },
      },
    });
    this.notify({ type: 'locked', unlockableType: type, targetId });
    return true;
  }

  static unlockByDefinitionId(id: string): boolean {
    const definition = UnlockRegistry.get(id);

    if (!definition) {
      console.warn(`Unlock definition not found: ${id}`);
      return false;
    }

    return this.unlock(definition.type, definition.targetId, definition.id);
  }

  static getUnlockedIds(type: UnlockableType): string[] {
    const save = SaveManager.get();

    switch (type) {
      case 'character':
        return [...save.progression.unlockedCharacterIds];
      case 'stage':
        return [...save.progression.unlockedStageIds];
      case 'map':
        return [...save.progression.unlockedMapIds];
      case 'weapon':
        return [...save.progression.unlockedWeaponIds];
      case 'passive':
        return [...save.progression.unlockedPassiveIds];
      case 'cosmetic':
        return [...save.progression.unlockedCosmeticIds];
      case 'theme':
        return [...save.progression.unlockedThemeIds];
      case 'difficulty':
        return [...save.progression.unlockedDifficultyIds];
      case 'challenge':
        return [...save.progression.unlockedChallengeIds];
      default:
        return Object.entries(save.progression.unlocks ?? {})
          .filter(([key, progress]) => key.startsWith(`${type}:`) && progress.unlocked)
          .map(([key]) => key.slice(`${type}:`.length));
    }
  }

  static listUnlocks(type?: UnlockableType): UnlockDefinition[] {
    const definitions = type
      ? UnlockRegistry.listByType(type)
      : UnlockRegistry.list();

    return definitions.map((definition) => ({
      ...definition,
      defaultUnlocked: definition.defaultUnlocked === true,
    }));
  }

  static applyReward(reward: UnlockReward): boolean {
    return this.unlock(reward.type, reward.targetId);
  }

  static subscribe(listener: UnlockListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static initializeRegistryOnly(): void {
    ContentBootstrap.ensureInitialized();
    UnlockRegistry.ensureBuiltInsRegistered();
  }

  private static targetExists(type: UnlockableType, targetId: string): boolean {
    switch (type) {
      case 'character':
        return ContentRegistry.getCharacter(targetId) !== undefined;
      case 'stage':
        return ContentRegistry.getStage(targetId) !== undefined;
      case 'map':
        return ContentRegistry.getMap(targetId) !== undefined;
      case 'weapon':
        return ContentRegistry.getWeapon(targetId) !== undefined;
      case 'passive':
        return ContentRegistry.getPassive(targetId) !== undefined;
      default:
        return true;
    }
  }

  private static addUnique(items: readonly string[], item: string): string[] {
    return items.includes(item) ? [...items] : [...items, item];
  }

  private static getUnlockKey(type: UnlockableType, targetId: string): string {
    return `${type}:${targetId}`;
  }

  private static notify(event: UnlockEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.warn(`Unlock listener failed for ${event.unlockableType}:${event.targetId}`, error);
      }
    }
  }
}
