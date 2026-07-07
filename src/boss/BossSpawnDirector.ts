import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';
import { BossFactory } from './BossFactory';

interface BossSpawnConfig {
  time: number;
  bossId: string;
  spawned: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface WorldSize {
  width: number;
  height: number;
}

const BOSS_ID_SUFFIX = '_boss';
const BOSS_IDS = {
  slime: `slime${BOSS_ID_SUFFIX}`,
  bat: `bat${BOSS_ID_SUFFIX}`,
  golem: `golem${BOSS_ID_SUFFIX}`,
} as const;

export class BossSpawnDirector {
  private static readonly EDGE_PADDING = 80;

  private readonly bossSpawns: BossSpawnConfig[] = [
    { time: 60, bossId: BOSS_IDS.slime, spawned: false },
    { time: 120, bossId: BOSS_IDS.bat, spawned: false },
    { time: 180, bossId: BOSS_IDS.golem, spawned: false },
    { time: 240, bossId: BOSS_IDS.golem, spawned: false },
  ];

  constructor(
    private readonly bossFactory: BossFactory,
    private readonly getPlayerPosition: () => Position,
    private readonly getWorldSize: () => WorldSize,
    private readonly onBossSpawned: (boss: Enemy) => void,
  ) {}

  update(gameTimeSeconds: number): void {
    for (const bossSpawn of this.bossSpawns) {
      if (bossSpawn.spawned || gameTimeSeconds < bossSpawn.time) {
        continue;
      }

      bossSpawn.spawned = true;
      this.spawnBoss(bossSpawn.bossId);
      return;
    }
  }

  private spawnBoss(bossId: string): void {
    const spawnPosition = this.getSpawnPosition();
    const boss = this.bossFactory.create(bossId, spawnPosition.x, spawnPosition.y);

    this.onBossSpawned(boss);
  }

  private getSpawnPosition(): Position {
    const playerPosition = this.getPlayerPosition();
    const worldSize = this.getWorldSize();
    const padding = BossSpawnDirector.EDGE_PADDING;
    const candidates: Position[] = [
      { x: worldSize.width / 2, y: padding },
      { x: worldSize.width - padding, y: worldSize.height / 2 },
      { x: worldSize.width / 2, y: worldSize.height - padding },
      { x: padding, y: worldSize.height / 2 },
    ];

    let farthestPosition = candidates[0];
    let farthestDistance = -Infinity;

    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        candidate.x,
        candidate.y,
      );

      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestPosition = candidate;
      }
    }

    return {
      x: Phaser.Math.Clamp(farthestPosition.x, padding, worldSize.width - padding),
      y: Phaser.Math.Clamp(farthestPosition.y, padding, worldSize.height - padding),
    };
  }
}
