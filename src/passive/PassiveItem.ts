export interface PassiveItem {
  id: string;
  name: string;
  description: string;
  maxLevel?: number;
}

export interface PassiveLevel {
  id: string;
  name: string;
  level: number;
}

export interface PassiveEffects {
  damageMultiplier: number;
  cooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  treasureDropBonus: number;
}

