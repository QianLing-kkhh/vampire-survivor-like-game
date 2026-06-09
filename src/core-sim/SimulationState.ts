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
  currentHp: number;
  maxHp: number;
  radius: number;
  moveSpeed: number;
  damagePerSecond: number;
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

export interface SimRunStats {
  kills: number;
  damageDealt: number;
  damageTaken: number;
  expCollected: number;
  levelsGained: number;
  pickupsCollected: number;
  enemiesSpawned: number;
}

export interface SimulationState {
  timeMs: number;
  spawnAccumulatorMs: number;
  nextEnemyId: number;
  nextPickupId: number;
  player: SimPlayerState;
  enemies: SimEnemyState[];
  pickups: SimPickupState[];
  weapon: SimWeaponState;
  runStats: SimRunStats;
  result?: 'gameOver' | 'completed';
}
