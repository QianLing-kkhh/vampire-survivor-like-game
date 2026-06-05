import characters from '../data/characters.json';
import enemies from '../data/enemies.json';
import maps from '../data/maps.json';
import passives from '../data/passives.json';
import stages from '../data/stages.json';
import upgrades from '../data/upgrades.json';
import waves from '../data/waves.json';
import weapons from '../data/weapons.json';

import { CharacterDefinition } from '../character/CharacterDefinition';
import { MapDefinition } from '../map/MapDefinition';
import { PassiveItem } from '../passive/PassiveItem';
import { WeaponConfig } from '../weapon/Weapon';

import { ContentPack } from './ContentPack';
import { ContentRegistry } from './ContentRegistry';
import { ContentValidator } from './ContentValidator';
import { DEFAULT_CONTENT_IDS } from './ContentId';
import { SpawnWave } from '../spawn/SpawnWave';

type CharacterJson = Record<string, Partial<CharacterDefinition['baseStats']> & {
  name?: string;
  nameKey?: string;
  descriptionKey?: string;
  startingWeaponId?: string;
  skinId?: string;
  initialStats?: CharacterDefinition['initialStats'];
  growthPerLevel?: CharacterDefinition['growthPerLevel'];
  levelUpEffect?: CharacterDefinition['levelUpEffect'];
  damageReactionSkill?: CharacterDefinition['damageReactionSkill'];
  exclusiveUpgradeIds?: string[];
  exclusivePassiveIds?: string[];
  exclusiveEvolutionRouteIds?: string[];
}>;

export class ContentBootstrap {
  private static initialized = false;

  static ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    const builtInContentPack = this.createBuiltInContentPack();

    new ContentValidator().validatePack(builtInContentPack);
    ContentRegistry.registerPack(builtInContentPack);
    this.initialized = true;
  }

  private static createBuiltInContentPack(): ContentPack {
    return {
      id: 'builtin',
      version: '1.0.0',
      source: 'builtin',
      weapons: weapons as Record<string, WeaponConfig>,
      enemies,
      passives: this.passivesToRecord(passives),
      upgrades,
      waves: this.toWaveSetRecord(waves),
      characters: this.charactersToRecord(characters as CharacterJson),
      stages,
      maps: maps as Record<string, MapDefinition>,
    };
  }

  private static toWaveSetRecord(waveData: unknown): Record<string, readonly SpawnWave[]> {
    if (Array.isArray(waveData)) {
      return {
        [DEFAULT_CONTENT_IDS.waveSet]: waveData as readonly SpawnWave[],
      };
    }

    return waveData as Record<string, readonly SpawnWave[]>;
  }

  private static passivesToRecord(passiveList: readonly PassiveItem[]): Record<string, PassiveItem> {
    return passiveList.reduce<Record<string, PassiveItem>>((record, passive) => {
      record[passive.id] = passive;
      return record;
    }, {});
  }

  private static charactersToRecord(
    characterData: CharacterJson,
  ): Record<string, CharacterDefinition> {
    const record: Record<string, CharacterDefinition> = {};

    for (const [id, character] of Object.entries(characterData)) {
      const initialStats = character.initialStats ?? {
        maxHp: character.maxHp ?? 100,
        moveSpeed: character.moveSpeed ?? 120,
        pickupRange: character.pickupRange ?? 2.2,
        expMultiplier: character.expMultiplier ?? 1,
      };

      record[id] = {
        id,
        name: character.name ?? character.nameKey ?? id,
        nameKey: character.nameKey ?? `character.${id}.name`,
        descriptionKey: character.descriptionKey ?? `character.${id}.description`,
        startingWeaponId: character.startingWeaponId ?? 'knife',
        skinId: character.skinId,
        initialStats,
        growthPerLevel: character.growthPerLevel ?? {},
        levelUpEffect: character.levelUpEffect,
        damageReactionSkill: character.damageReactionSkill,
        exclusiveUpgradeIds: character.exclusiveUpgradeIds ?? [],
        exclusivePassiveIds: character.exclusivePassiveIds ?? [],
        exclusiveEvolutionRouteIds: character.exclusiveEvolutionRouteIds ?? [],
        baseStats: {
          maxHp: initialStats.maxHp,
          moveSpeed: initialStats.moveSpeed,
          pickupRange: initialStats.pickupRange,
          expMultiplier: initialStats.expMultiplier ?? 1,
        },
      };
    }

    return record;
  }
}
