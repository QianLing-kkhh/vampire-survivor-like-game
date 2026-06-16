export interface EnemyStats {
  hp: number;
  moveSpeed: number;
  damage: number;
  exp: number;
  scale?: number;
  bossLike?: boolean;
  mergeable?: boolean;
  dashEnabled?: boolean;
  dashCooldown?: number;
  dashWarningDuration?: number;
  dashDuration?: number;
  dashSpeed?: number;
  dashDamageMultiplier?: number;
}

export interface EnemyKilledEvent {
  x: number;
  y: number;
  exp: number;
  mergeLevel?: number;
  enemyId?: string;
  isBoss?: boolean;
  isBossLike?: boolean;
}

export function isEnemyKilledEvent(value: unknown): value is EnemyKilledEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Partial<EnemyKilledEvent>;

  return (
    typeof event.x === 'number'
    && typeof event.y === 'number'
    && typeof event.exp === 'number'
  );
}
