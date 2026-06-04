export type BossSkillType =
  | 'dash'
  | 'beam'
  | 'summon'
  | 'shockwave'
  | 'slowZone';

export interface BaseBossSkillConfig {
  type: BossSkillType;
  cooldownMs: number;
  initialDelayMs?: number;
  warningMs?: number;
  enabled?: boolean;
}

export interface DashSkillConfig extends BaseBossSkillConfig {
  type: 'dash';
  durationMs: number;
  speed: number;
  hitRadius: number;
  damageMultiplier: number;
  knockbackDistance?: number;
}

export interface BeamSkillConfig extends BaseBossSkillConfig {
  type: 'beam';
  width: number;
  length: number;
  damageMultiplier: number;
  knockbackDistance?: number;
}

export interface SummonSkillConfig extends BaseBossSkillConfig {
  type: 'summon';
  summons: Array<{
    enemyId: string;
    count: number;
  }>;
  ringRadius?: number;
  spawnIntervalMs?: number;
  useEndlessScaling?: boolean;
}

export interface ShockwaveSkillConfig extends BaseBossSkillConfig {
  type: 'shockwave';
  radius: number;
  damageMultiplier: number;
  knockbackDistance?: number;
}

export interface SlowZoneSkillConfig extends BaseBossSkillConfig {
  type: 'slowZone';
  radius: number;
  durationMs: number;
  playerSpeedMultiplier: number;
}

export type BossSkillConfig =
  | DashSkillConfig
  | BeamSkillConfig
  | SummonSkillConfig
  | ShockwaveSkillConfig
  | SlowZoneSkillConfig;
