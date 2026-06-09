export interface SimVector2 {
  x: number;
  y: number;
}

export interface SimPlayerState extends SimVector2 {
  currentHp: number;
  maxHp: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  radius: number;
  moveSpeed: number;
  pickupRange: number;
}

export interface SimEnemyState extends SimVector2 {
  id: number;
  enemyId: string;
  currentHp: number;
  maxHp: number;
  radius: number;
  moveSpeed: number;
  damagePerSecond: number;
  exp: number;
  bossLike: boolean;
}

export interface SimPickupState extends SimVector2 {
  id: number;
  exp: number;
  radius: number;
}

export interface SimWeaponState {
  weaponId: string;
  cooldownMs: number;
  cooldownRemainingMs: number;
  damage: number;
  range: number;
  hitsPerAttack: number;
}

export interface SimBossState {
  spawned: boolean;
  killed: boolean;
}

export interface SimEndlessState {
  started: boolean;
  startedAtMs?: number;
  scalingLevel: number;
  bossSpawnCount: number;
}

export interface SimRunStats {
  kills: number;
  bossKills: number;
  damageDealt: number;
  damageTaken: number;
  expCollected: number;
  levelsGained: number;
  pickupsCollected: number;
  enemiesSpawned: number;
}

export interface SimTracePoint {
  tick: number;
  timeMs: number;
  score: number;
  playerX: number;
  playerY: number;
  playerHp: number;
  level: number;
  enemyCount: number;
  pickupCount: number;
  kills: number;
  exp: number;
  damageDealt: number;
  damageTaken: number;
  pickupsCollected: number;
  enemiesSpawned: number;
  bossSpawned: boolean;
  bossKilled: boolean;
  endlessStarted: boolean;
  result?: 'gameOver' | 'completed' | 'victory';
}

export interface SimulationState {
  tick: number;
  timeMs: number;
  spawnAccumulatorMs: number;
  waveAccumulatorsMs: Record<string, number>;
  waveSpawnedCounts: Record<string, number>;
  nextEnemyId: number;
  nextPickupId: number;
  player: SimPlayerState;
  enemies: SimEnemyState[];
  pickups: SimPickupState[];
  weapon: SimWeaponState;
  boss: SimBossState;
  endless: SimEndlessState;
  runStats: SimRunStats;
  trace: SimTracePoint[];
  result?: 'gameOver' | 'completed' | 'victory';
}
