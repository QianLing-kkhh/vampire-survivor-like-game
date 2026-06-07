import { GameEventType } from './GameEventType';

export interface TimedPayload {
  gameTimeSeconds: number;
}

export interface RunStartedPayload extends TimedPayload {
  runId: string;
  runSeed: string;
  characterId: string;
  stageId: string;
  mapId: string;
}

export interface RunEndedPayload extends TimedPayload {
  runId: string;
  resultType: 'gameOver' | 'victory';
  survivalTime: number;
  endlessSurvivalTime?: number;
  killCount: number;
  treasureOpenCount?: number;
  evolutionCount?: number;
  endlessStarted: boolean;
}

export interface PlayerDamageTakenPayload extends TimedPayload {
  actualDamage: number;
  incomingDamage?: number;
  shieldAbsorbed?: boolean;
  currentHp: number;
}

export interface PlayerLevelUpPayload extends TimedPayload {
  level: number;
}

export interface EnemySpawnedPayload extends TimedPayload {
  enemyId: string;
  x: number;
  y: number;
  isBoss?: boolean;
}

export interface EnemyKilledPayload extends TimedPayload {
  enemyId: string;
  enemyInstanceId?: string;
  x: number;
  y: number;
  sourceWeaponId?: string;
  exp: number;
  isBoss?: boolean;
}

export interface BossSpawnedPayload extends TimedPayload {
  bossId: string;
  x: number;
  y: number;
}

export interface BossKilledPayload extends TimedPayload {
  bossId: string;
  x: number;
  y: number;
}

export interface BossSkillPayload extends TimedPayload {
  bossId?: string;
  skillType: string;
}

export interface EndlessStartedPayload extends TimedPayload {
  endlessStartTime: number;
}

export interface EndlessRewardChosenPayload extends TimedPayload {
  rewardId: string;
  source: 'level' | 'chest';
}

export interface EndlessBossPayload extends TimedPayload {
  bossId: string;
  x: number;
  y: number;
}

export interface TreasurePayload extends TimedPayload {
  x: number;
  y: number;
}

export interface UpgradeOptionsShownPayload extends TimedPayload {
  optionIds: string[];
  source?: 'levelUp' | 'treasure';
}

export interface UpgradeSelectedPayload extends TimedPayload {
  upgradeId: string;
  source?: 'levelUp' | 'treasure';
}

export interface UpgradeAppliedPayload extends TimedPayload {
  upgradeId: string;
  source: 'levelUp' | 'treasure' | 'endlessReward';
}

export interface UpgradeSkippedPayload extends TimedPayload {
  reason: string;
}

export interface WeaponEvolvedPayload extends TimedPayload {
  baseWeaponId: string;
  evolvedWeaponId: string;
}

export type GameEventPayloadMap = {
  'run.started': RunStartedPayload;
  'run.ended': RunEndedPayload;
  'player.damageTaken': PlayerDamageTakenPayload;
  'player.levelUp': PlayerLevelUpPayload;
  'enemy.spawned': EnemySpawnedPayload;
  'enemy.killed': EnemyKilledPayload;
  'boss.spawned': BossSpawnedPayload;
  'boss.killed': BossKilledPayload;
  'boss.skillUsed': BossSkillPayload;
  'boss.skillHit': BossSkillPayload;
  'endless.started': EndlessStartedPayload;
  'endless.rewardChosen': EndlessRewardChosenPayload;
  'endless.bossSpawned': EndlessBossPayload;
  'endless.bossKilled': EndlessBossPayload;
  'pickup.treasureDropped': TreasurePayload;
  'pickup.treasureOpened': TreasurePayload;
  'upgrade.optionsShown': UpgradeOptionsShownPayload;
  'upgrade.selected': UpgradeSelectedPayload;
  'upgrade.applied': UpgradeAppliedPayload;
  'upgrade.skipped': UpgradeSkippedPayload;
  'weapon.evolved': WeaponEvolvedPayload;
};

export type GameEventPayload<TType extends string> =
  TType extends keyof GameEventPayloadMap
    ? GameEventPayloadMap[TType]
    : Record<string, unknown>;

export type KnownGameEventPayload<TType extends GameEventType> =
  TType extends keyof GameEventPayloadMap
    ? GameEventPayloadMap[TType]
    : Record<string, unknown>;
