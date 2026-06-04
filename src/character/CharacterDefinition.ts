export interface CharacterBaseStats {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  startingWeaponId: string;
  baseStats: CharacterBaseStats;
}
