import { CharacterDamageReactionConfig } from './CharacterDamageReactionSkill';
import { CharacterLevelUpEffectConfig } from './CharacterLevelUpEffect';
import {
  CharacterGrowthPerLevel,
  CharacterInitialStats,
} from './CharacterStats';
import { PlayerStatsData } from '../player/PlayerStats';

export type CharacterBaseStats = PlayerStatsData;

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
