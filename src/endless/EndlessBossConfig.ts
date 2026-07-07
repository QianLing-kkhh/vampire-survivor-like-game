import { BossSkillConfig } from '../boss/skills/BossSkillConfig';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';

export type EndlessBossId =
  | 'endless_berserker'
  | 'endless_summoner'
  | 'endless_freezer'
  | 'endless_sniper'
  | 'endless_tanker';

export interface EndlessBossConfig {
  id: EndlessBossId;
  enemyId: string;
  weight: number;
  baseHpMultiplier: number;
  baseDamageMultiplier: number;
  baseSpeedMultiplier: number;
  skills: BossSkillConfig[];
  description: string;
}

ContentBootstrap.ensureInitialized();

export const ENDLESS_BOSS_CONFIGS: readonly EndlessBossConfig[] =
  ContentRegistry.listEndlessBossConfigs();

export function getEndlessBossConfig(id: EndlessBossId): EndlessBossConfig {
  const config = ContentRegistry.getEndlessBossConfig(id);

  if (!config) {
    throw new Error(`Endless boss config not found: ${id}`);
  }

  return config;
}
