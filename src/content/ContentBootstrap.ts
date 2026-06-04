import characters from '../data/characters.json';
import enemies from '../data/enemies.json';
import maps from '../data/maps.json';
import passives from '../data/passives.json';
import stages from '../data/stages.json';
import upgrades from '../data/upgrades.json';
import waves from '../data/waves.json';
import weapons from '../data/weapons.json';

import { CharacterDefinition } from '../character/CharacterDefinition';
import { PassiveItem } from '../passive/PassiveItem';
import { WeaponConfig } from '../weapon/Weapon';

import { ContentPack } from './ContentPack';
import { ContentRegistry } from './ContentRegistry';
import { ContentValidator } from './ContentValidator';
import { DEFAULT_CONTENT_IDS } from './ContentId';

type CharacterJson = Record<string, CharacterDefinition['baseStats'] & {
  name?: string;
  startingWeaponId?: string;
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
      waves: {
        [DEFAULT_CONTENT_IDS.waveSet]: waves,
      },
      characters: this.charactersToRecord(characters),
      stages,
      maps,
    };
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
      record[id] = {
        id,
        name: character.name ?? id,
        startingWeaponId: character.startingWeaponId ?? 'knife',
        baseStats: {
          maxHp: character.maxHp,
          moveSpeed: character.moveSpeed,
          pickupRange: character.pickupRange,
          expMultiplier: character.expMultiplier,
        },
      };
    }

    return record;
  }
}
