import characters from '../data/characters.json';
import { SaveManager } from '../save/SaveManager';

import { CharacterDefinition } from './CharacterDefinition';

type CharacterData = Record<string, CharacterDefinition['baseStats'] & {
  name?: string;
  startingWeaponId?: string;
}>;

const DEFAULT_CHARACTER_ID = 'default';
const DEFAULT_STARTING_WEAPON_ID = 'knife';

export class CharacterManager {
  constructor(
    private readonly characterData: CharacterData = characters,
    private selectedCharacterId = SaveManager.get().selections.selectedCharacterId,
  ) {
    if (!this.characterData[this.selectedCharacterId]) {
      this.selectedCharacterId = DEFAULT_CHARACTER_ID;
    }
  }

  getSelectedCharacter(): CharacterDefinition {
    return this.getCharacter(this.selectedCharacterId);
  }

  getSelectedCharacterId(): string {
    return this.selectedCharacterId;
  }

  setSelectedCharacterId(characterId: string): void {
    this.selectedCharacterId = this.characterData[characterId]
      ? characterId
      : DEFAULT_CHARACTER_ID;

    SaveManager.update({
      selections: {
        ...SaveManager.get().selections,
        selectedCharacterId: this.selectedCharacterId,
      },
    });
  }

  getCharacter(characterId: string): CharacterDefinition {
    const resolvedCharacterId = this.characterData[characterId]
      ? characterId
      : DEFAULT_CHARACTER_ID;
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
}
