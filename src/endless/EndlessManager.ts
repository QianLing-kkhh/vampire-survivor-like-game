import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';

interface EndlessSpawnRule {
  enemyId: string;
  intervalSeconds: number;
  count: number;
}

interface EndlessTier {
  startTimeSeconds: number;
  rules: EndlessSpawnRule[];
}

interface EndlessRuleState {
  elapsedMs: number;
}

export interface EndlessEnemyScaling {
  scalingLevel: number;
  hpMultiplier: number;
  damageMultiplier: number;
  speedMultiplier: number;
  expMultiplier: number;
}

export interface EndlessManagerConfig {
  scene: Phaser.Scene;
  enemyFactory: EnemyFactory;
  enemies: Enemy[];
  getPlayerPosition: () => { x: number; y: number };
  getWorldSize: () => { width: number; height: number };
  onEnemySpawned(enemy: Enemy): void;
}

export class EndlessManager {
  private static readonly SAFE_SPAWN_RADIUS = 500;
  private static readonly SPAWN_MARGIN = 120;
  private static readonly MAX_ENEMIES = 250;
  private static readonly TIERS: EndlessTier[] = [
    {
      startTimeSeconds: 0,
      rules: [
        { enemyId: 'bat', intervalSeconds: 1.0, count: 2 },
        { enemyId: 'slime', intervalSeconds: 1.2, count: 3 },
      ],
    },
    {
      startTimeSeconds: 60,
      rules: [
        { enemyId: 'bat', intervalSeconds: 0.8, count: 3 },
        { enemyId: 'slime', intervalSeconds: 1.0, count: 4 },
        { enemyId: 'golem', intervalSeconds: 2.0, count: 1 },
      ],
    },
    {
      startTimeSeconds: 120,
      rules: [
        { enemyId: 'bat', intervalSeconds: 0.55, count: 4 },
        { enemyId: 'slime', intervalSeconds: 0.75, count: 5 },
        { enemyId: 'golem', intervalSeconds: 1.5, count: 2 },
      ],
    },
    {
      startTimeSeconds: 180,
      rules: [
        { enemyId: 'bat', intervalSeconds: 0.4, count: 5 },
        { enemyId: 'slime', intervalSeconds: 0.6, count: 6 },
        { enemyId: 'golem', intervalSeconds: 1.1, count: 3 },
      ],
    },
  ];

  private started = false;
  private startTimeSeconds = 0;
  private activeTierIndex = -1;
  private ruleStates: EndlessRuleState[] = [];

  constructor(private readonly config: EndlessManagerConfig) {}

  start(gameTimeSeconds: number): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.startTimeSeconds = gameTimeSeconds;
    this.activeTierIndex = -1;
    this.ruleStates = [];
  }

  update(gameTimeSeconds: number, deltaMs: number): void {
    if (!this.started || this.getAliveEnemyCount() >= EndlessManager.MAX_ENEMIES) {
      return;
    }

    const endlessTimeSeconds = Math.max(0, gameTimeSeconds - this.startTimeSeconds);
    const tierIndex = this.getTierIndex(endlessTimeSeconds);

    if (tierIndex !== this.activeTierIndex) {
      this.activeTierIndex = tierIndex;
      this.ruleStates = EndlessManager.TIERS[tierIndex].rules.map(() => ({ elapsedMs: 0 }));
    }

    const tier = EndlessManager.TIERS[this.activeTierIndex];

    tier.rules.forEach((rule, index) => {
      const state = this.ruleStates[index];
      state.elapsedMs += deltaMs;

      while (
        this.getAliveEnemyCount() < EndlessManager.MAX_ENEMIES
        && state.elapsedMs >= rule.intervalSeconds * 1000
      ) {
        state.elapsedMs -= rule.intervalSeconds * 1000;
        this.spawnBatch(rule.enemyId, rule.count, endlessTimeSeconds);
      }
    });
  }

  isStarted(): boolean {
    return this.started;
  }

  getEndlessTimeSeconds(gameTimeSeconds: number): number {
    return this.started ? Math.max(0, gameTimeSeconds - this.startTimeSeconds) : 0;
  }

  static getEnemyScale(endlessTimeSeconds: number): EndlessEnemyScaling {
    const scalingLevel = Math.floor(Math.max(0, endlessTimeSeconds) / 60);

    return {
      scalingLevel,
      hpMultiplier: 1 + scalingLevel * 0.35,
      damageMultiplier: 1 + scalingLevel * 0.20,
      speedMultiplier: Math.min(1 + scalingLevel * 0.05, 1.5),
      expMultiplier: 1 + scalingLevel * 0.15,
    };
  }

  reset(): void {
    this.started = false;
    this.startTimeSeconds = 0;
    this.activeTierIndex = -1;
    this.ruleStates = [];
  }

  private getTierIndex(endlessTimeSeconds: number): number {
    let selectedIndex = 0;

    EndlessManager.TIERS.forEach((tier, index) => {
      if (endlessTimeSeconds >= tier.startTimeSeconds) {
        selectedIndex = index;
      }
    });

    return selectedIndex;
  }

  private spawnBatch(enemyId: string, count: number, endlessTimeSeconds: number): void {
    const scaling = EndlessManager.getEnemyScale(endlessTimeSeconds);
    const baseStats = this.config.enemyFactory.getEnemyStats(enemyId);
    const scaledStats = {
      ...baseStats,
      hp: Math.round(baseStats.hp * scaling.hpMultiplier),
      damage: Math.round(baseStats.damage * scaling.damageMultiplier),
      moveSpeed: baseStats.moveSpeed * scaling.speedMultiplier,
      exp: Math.round(baseStats.exp * scaling.expMultiplier),
    };

    for (let index = 0; index < count; index += 1) {
      const position = this.getSpawnPosition();
      const enemy = this.config.enemyFactory.create(enemyId, position.x, position.y, scaledStats);

      this.config.onEnemySpawned(enemy);
    }
  }

  private getSpawnPosition(): { x: number; y: number } {
    const player = this.config.getPlayerPosition();
    const world = this.config.getWorldSize();
    const cameraView = this.config.scene.cameras.main.worldView;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const side = Phaser.Math.Between(0, 3);
      const position = this.getCameraEdgePosition(cameraView, world, side);

      if (Phaser.Math.Distance.Between(position.x, position.y, player.x, player.y)
        >= EndlessManager.SAFE_SPAWN_RADIUS) {
        return position;
      }
    }

    return this.getFarthestBoundaryPosition(world, player);
  }

  private getCameraEdgePosition(
    cameraView: Phaser.Geom.Rectangle,
    world: { width: number; height: number },
    side: number,
  ): { x: number; y: number } {
    const margin = EndlessManager.SPAWN_MARGIN;
    let x = cameraView.centerX;
    let y = cameraView.centerY;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(cameraView.left - margin, cameraView.right + margin);
        y = cameraView.top - margin;
        break;
      case 1:
        x = cameraView.right + margin;
        y = Phaser.Math.Between(cameraView.top - margin, cameraView.bottom + margin);
        break;
      case 2:
        x = Phaser.Math.Between(cameraView.left - margin, cameraView.right + margin);
        y = cameraView.bottom + margin;
        break;
      default:
        x = cameraView.left - margin;
        y = Phaser.Math.Between(cameraView.top - margin, cameraView.bottom + margin);
        break;
    }

    return {
      x: Phaser.Math.Clamp(x, 0, world.width),
      y: Phaser.Math.Clamp(y, 0, world.height),
    };
  }

  private getFarthestBoundaryPosition(
    world: { width: number; height: number },
    player: { x: number; y: number },
  ): { x: number; y: number } {
    const candidates = [
      { x: 0, y: 0 },
      { x: world.width, y: 0 },
      { x: world.width, y: world.height },
      { x: 0, y: world.height },
      { x: world.width / 2, y: 0 },
      { x: world.width / 2, y: world.height },
      { x: 0, y: world.height / 2 },
      { x: world.width, y: world.height / 2 },
    ];

    return candidates.reduce((best, candidate) => {
      const bestDistance = Phaser.Math.Distance.Between(best.x, best.y, player.x, player.y);
      const candidateDistance = Phaser.Math.Distance.Between(
        candidate.x,
        candidate.y,
        player.x,
        player.y,
      );

      return candidateDistance > bestDistance ? candidate : best;
    }, candidates[0]);
  }

  private getAliveEnemyCount(): number {
    return this.config.enemies.filter((enemy) => !enemy.isDead).length;
  }
}
