import bossesData from '../data/bosses.json';

export type EndlessBossId =
  | 'endless_berserker'
  | 'endless_summoner'
  | 'endless_freezer'
  | 'endless_sniper'
  | 'endless_tanker';

export type EndlessBossSkillType =
  | 'berserker_dash'
  | 'summoner_call'
  | 'freezer_zone'
  | 'sniper_beam'
  | 'tanker_shockwave';

export interface EndlessBossConfig {
  id: EndlessBossId;
  enemyId: string;
  weight: number;
  baseHpMultiplier: number;
  baseDamageMultiplier: number;
  baseSpeedMultiplier: number;
  skillType: EndlessBossSkillType;
  skillCooldown: number;
  warningDuration: number;
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

