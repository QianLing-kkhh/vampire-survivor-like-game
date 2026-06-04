import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { SaveManager } from '../save/SaveManager';

import { CharacterDefinition } from './CharacterDefinition';

type CharacterData = Record<string, CharacterDefinition['baseStats'] & {
  name?: string;
  startingWeaponId?: string;
}>;

const DEFAULT_STARTING_WEAPON_ID = 'knife';

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
      name: character.name ?? resolvedCharacterId,
      startingWeaponId: character.startingWeaponId ?? DEFAULT_STARTING_WEAPON_ID,
      baseStats: {
        maxHp: character.maxHp,
        moveSpeed: character.moveSpeed,
        pickupRange: character.pickupRange,
        expMultiplier: character.expMultiplier,
      },
    };
  }

  listCharacters(): CharacterDefinition[] {
    return Object.keys(this.characterData).map((characterId) => this.getCharacter(characterId));
  }

  private getCharacterDataFromRegistry(): CharacterData {
    return ContentRegistry.listCharacters().reduce<CharacterData>((record, character) => {
      record[character.id] = {
        ...character.baseStats,
        name: character.name,
        startingWeaponId: character.startingWeaponId,
      };
      return record;
    }, {});
  }
}
