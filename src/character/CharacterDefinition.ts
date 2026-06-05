import { CharacterDamageReactionConfig } from './CharacterDamageReactionSkill';
import { CharacterLevelUpEffectConfig } from './CharacterLevelUpEffect';
import {
  CharacterGrowthPerLevel,
  CharacterInitialStats,
} from './CharacterStats';

export interface CharacterBaseStats {
  maxHp: number;
  moveSpeed: number;
  pickupRange: number;
  expMultiplier: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  nameKey: string;
  descriptionKey: string;
  startingWeaponId: string;
  skinId?: string;
  initialStats: CharacterInitialStats;
  growthPerLevel: CharacterGrowthPerLevel;
  levelUpEffect?: CharacterLevelUpEffectConfig;
  damageReactionSkill?: CharacterDamageReactionConfig;
  exclusiveUpgradeIds?: string[];
  exclusivePassiveIds?: string[];
  exclusiveEvolutionRouteIds?: string[];
  baseStats: CharacterBaseStats;
}
