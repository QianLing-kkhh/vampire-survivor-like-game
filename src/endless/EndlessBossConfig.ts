import bossesData from '../data/bosses.json';
import { BossSkillConfig } from '../boss/skills/BossSkillConfig';

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

const typedBossesData = bossesData as {
  endlessBosses: Record<EndlessBossId, EndlessBossConfig>;
};

export const ENDLESS_BOSS_CONFIGS: readonly EndlessBossConfig[] = Object.values(
  typedBossesData.endlessBosses,
);

export function getEndlessBossConfig(id: EndlessBossId): EndlessBossConfig {
  return typedBossesData.endlessBosses[id];
}
