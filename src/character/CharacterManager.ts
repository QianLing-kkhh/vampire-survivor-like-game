import characters from '../data/characters.json';

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
    private selectedCharacterId = DEFAULT_CHARACTER_ID,
  ) {}

  getSelectedCharacter(): CharacterDefinition {
    return this.getCharacter(this.selectedCharacterId);
  }

  getCharacter(characterId: string): CharacterDefinition {
    const character = this.characterData[characterId] ?? this.characterData[DEFAULT_CHARACTER_ID];

    return {
      id: characterId,
      name: character.name ?? characterId,
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
