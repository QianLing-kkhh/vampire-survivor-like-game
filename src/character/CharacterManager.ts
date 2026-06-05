import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { SaveManager } from '../save/SaveManager';
import { UnlockManager } from '../unlock/UnlockManager';

import { CharacterDefinition } from './CharacterDefinition';
import {
  CharacterGrowthPerLevel,
  CharacterInitialStats,
} from './CharacterStats';

type CharacterDataEntry = Partial<CharacterDefinition['baseStats']> & {
  name?: string;
  nameKey?: string;
  descriptionKey?: string;
  startingWeaponId?: string;
  skinId?: string;
  baseStats?: Partial<CharacterDefinition['baseStats']>;
  initialStats?: CharacterInitialStats;
  growthPerLevel?: CharacterGrowthPerLevel;
  levelUpEffect?: CharacterDefinition['levelUpEffect'];
  damageReactionSkill?: CharacterDefinition['damageReactionSkill'];
  exclusiveUpgradeIds?: string[];
  exclusivePassiveIds?: string[];
  exclusiveEvolutionRouteIds?: string[];
};
type CharacterData = Record<string, CharacterDataEntry>;

const DEFAULT_STARTING_WEAPON_ID = 'knife';
const DEFAULT_CHARACTER_INITIAL_STATS: CharacterInitialStats = {
  maxHp: 100,
  moveSpeed: 120,
  pickupRange: 2.2,
  expMultiplier: 1,
};

export class CharacterManager {
  constructor(
    characterData?: CharacterData,
    private selectedCharacterId = SaveManager.get().selections.selectedCharacterId,
  ) {
    ContentBootstrap.ensureInitialized();
    this.characterData = characterData ?? this.getCharacterDataFromRegistry();

    if (!this.characterData[this.selectedCharacterId]) {
      this.selectedCharacterId = DEFAULT_CONTENT_IDS.character;
    }
  }

  private readonly characterData: CharacterData;

  getSelectedCharacter(): CharacterDefinition {
    return this.getCharacter(this.getSelectedCharacterId());
  }

  getSelectedCharacterId(): string {
    const savedCharacterId = SaveManager.get().selections.selectedCharacterId;

    this.selectedCharacterId = this.characterData[savedCharacterId]
      ? savedCharacterId
      : DEFAULT_CONTENT_IDS.character;

    return this.selectedCharacterId;
  }

  setSelectedCharacterId(characterId: string): void {
    this.selectedCharacterId = this.characterData[characterId]
      ? characterId
      : DEFAULT_CONTENT_IDS.character;

    SaveManager.update({
      selections: {
        selectedCharacterId: this.selectedCharacterId,
      },
    });
  }

  getCharacter(characterId: string): CharacterDefinition {
    const resolvedCharacterId = this.characterData[characterId]
      ? characterId
      : DEFAULT_CONTENT_IDS.character;
    const character = this.characterData[resolvedCharacterId];

    return {
      id: resolvedCharacterId,
      name: character.name ?? character.nameKey ?? resolvedCharacterId,
      nameKey: character.nameKey ?? `character.${resolvedCharacterId}.name`,
      descriptionKey: character.descriptionKey ?? `character.${resolvedCharacterId}.description`,
      startingWeaponId: character.startingWeaponId ?? DEFAULT_STARTING_WEAPON_ID,
      skinId: character.skinId,
      initialStats: this.getInitialStats(character),
      growthPerLevel: character.growthPerLevel ?? {},
      levelUpEffect: character.levelUpEffect,
      damageReactionSkill: character.damageReactionSkill,
      exclusiveUpgradeIds: character.exclusiveUpgradeIds ?? [],
      exclusivePassiveIds: character.exclusivePassiveIds ?? [],
      exclusiveEvolutionRouteIds: character.exclusiveEvolutionRouteIds ?? [],
      baseStats: {
        ...this.getInitialStats(character),
        expMultiplier: this.getInitialStats(character).expMultiplier ?? 1,
      },
    };
  }

  listCharacters(options: { includeLocked?: boolean } = {}): CharacterDefinition[] {
    const characters = Object.keys(this.characterData)
      .map((characterId) => this.getCharacter(characterId));

    if (options.includeLocked === true) {
      return characters;
    }

    return characters.filter((character) => this.isCharacterUnlocked(character.id));
  }

  isCharacterUnlocked(characterId: string): boolean {
    return this.characterData[characterId] !== undefined
      && (UnlockManager.isUnlocked('character', characterId) || characterId !== '');
  }

  private getCharacterDataFromRegistry(): CharacterData {
    return ContentRegistry.listCharacters().reduce<CharacterData>((record, character) => {
      record[character.id] = {
        ...character,
        name: character.name,
      };
      return record;
    }, {});
  }

  private getInitialStats(character: CharacterDataEntry): CharacterInitialStats {
    const legacyStats = character.baseStats ?? character;
    const initialStats = character.initialStats ?? {
      maxHp: legacyStats.maxHp,
      moveSpeed: legacyStats.moveSpeed,
      pickupRange: legacyStats.pickupRange,
      expMultiplier: legacyStats.expMultiplier,
    };

    return {
      maxHp: initialStats.maxHp ?? DEFAULT_CHARACTER_INITIAL_STATS.maxHp,
      moveSpeed: initialStats.moveSpeed ?? DEFAULT_CHARACTER_INITIAL_STATS.moveSpeed,
      pickupRange: initialStats.pickupRange ?? DEFAULT_CHARACTER_INITIAL_STATS.pickupRange,
      expMultiplier: initialStats.expMultiplier ?? DEFAULT_CHARACTER_INITIAL_STATS.expMultiplier,
    };
  }
}
