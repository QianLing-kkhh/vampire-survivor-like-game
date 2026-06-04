import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { BossSkillContext } from '../boss/skills/BossSkillContext';
import { BossSkillFactory } from '../boss/skills/BossSkillFactory';
import { BossSkillRuntime } from '../boss/skills/BossSkillRuntime';
import { Enemy } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyFlow } from '../enemy/EnemyFlow';
import { RunState } from '../run/RunState';

import { EndlessManager } from './EndlessManager';
import { ENDLESS_BOSS_CONFIGS, EndlessBossConfig, EndlessBossId } from './EndlessBossConfig';

interface EndlessBossManagerConfig {
  scene: Phaser.Scene;
  enemyFactory: EnemyFactory;
  enemies: Enemy[];
  enemyFlow: EnemyFlow;
  runState: RunState;
  getPlayerPosition: () => Phaser.Math.Vector2;
  getWorldSize: () => { width: number; height: number };
  onEnemySpawned: (enemy: Enemy) => void;
}

interface ActiveZone {
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
  playerSpeedMultiplier: number;
  visual: Phaser.GameObjects.Arc;
}

export class EndlessBossManager {
  private static readonly FIRST_SPAWN_DELAY_SECONDS = 60;
  private static readonly WARNING_SECONDS = 5;
  private static readonly MAX_ENEMIES = 250;

  private readonly scene: Phaser.Scene;
  private readonly enemyFactory: EnemyFactory;
  private readonly enemies: Enemy[];
  private readonly enemyFlow: EnemyFlow;
  private readonly runState: RunState;
  private readonly getPlayerPosition: () => Phaser.Math.Vector2;
  private readonly getWorldSize: () => { width: number; height: number };
  private readonly onEnemySpawned: (enemy: Enemy) => void;

  private active = false;
  private endlessStartTime = 0;
  private nextSpawnTime = 0;
  private activeBoss: Enemy | null = null;
  private activeBossConfig: EndlessBossConfig | null = null;
  private activeBossSkillRuntime: BossSkillRuntime | null = null;
  private lastBossId: EndlessBossId | null = null;
  private currentGameTimeSeconds = 0;
  private readonly activeZones: ActiveZone[] = [];

  constructor(config: EndlessBossManagerConfig) {
    this.scene = config.scene;
    this.enemyFactory = config.enemyFactory;
    this.enemies = config.enemies;
    this.enemyFlow = config.enemyFlow;
    this.runState = config.runState;
    this.getPlayerPosition = config.getPlayerPosition;
    this.getWorldSize = config.getWorldSize;
    this.onEnemySpawned = config.onEnemySpawned;
  }

  start(endlessStartTime: number): void {
    if (this.active) {
      return;
    }

    this.active = true;
    this.endlessStartTime = endlessStartTime;
    this.nextSpawnTime = endlessStartTime + EndlessBossManager.FIRST_SPAWN_DELAY_SECONDS;
  }

  stop(): void {
    this.active = false;
    this.activeBoss = null;
    this.activeBossConfig = null;
    this.activeBossSkillRuntime?.clear();
    this.activeBossSkillRuntime = null;
    this.clearZones();
  }

  clear(): void {
    this.stop();
    this.nextSpawnTime = 0;
    this.lastBossId = null;
  }

  update(gameTimeSeconds: number, deltaMs: number): void {
    if (!this.active) {
      return;
    }

    this.currentGameTimeSeconds = gameTimeSeconds;
    this.updateZones(deltaMs);

    if (this.activeBoss?.isDead) {
      this.handleBossKilled(gameTimeSeconds);
      return;
    }

    if (!this.activeBoss) {
      if (gameTimeSeconds >= this.nextSpawnTime) {
        this.spawnBoss(gameTimeSeconds);
      }
      return;
    }

    this.activeBossSkillRuntime?.update(deltaMs);
  }

  hasActiveBoss(): boolean {
    return this.activeBoss !== null && !this.activeBoss.isDead;
  }

  getActiveBossId(): string | null {
    return this.hasActiveBoss() ? this.activeBossConfig?.id ?? null : null;
  }

  getNextBossSpawnInSeconds(gameTimeSeconds: number): number {
    if (!this.active || this.hasActiveBoss()) {
      return 0;
    }

    return Math.max(0, this.nextSpawnTime - gameTimeSeconds);
  }

  getEndlessBossWarningText(gameTimeSeconds: number): string | null {
    if (!this.active || this.hasActiveBoss()) {
      return null;
    }

    const spawnIn = this.getNextBossSpawnInSeconds(gameTimeSeconds);
    if (spawnIn <= 0 || spawnIn > EndlessBossManager.WARNING_SECONDS) {
      return null;
    }

    return `Endless Boss Incoming ${Math.ceil(spawnIn)}s`;
  }

  getHudMessage(gameTimeSeconds: number): string | null {
    const warningText = this.getEndlessBossWarningText(gameTimeSeconds);
    if (warningText) {
      return warningText;
    }

    if (!this.hasActiveBoss() || !this.activeBossConfig || !this.activeBoss) {
      return null;
    }

    const hpRatio = Math.max(0, this.activeBoss.currentHp / Math.max(1, this.activeBoss.maxHp));
    return `Endless Boss: ${this.formatBossName(this.activeBossConfig.id)} ${Math.ceil(hpRatio * 100)}%`;
  }

  getPlayerMoveSpeedMultiplier(): number {
    const playerPosition = this.getPlayerPosition();
    const matchingZones = this.activeZones.filter((zone) => (
      Phaser.Math.Distance.Between(playerPosition.x, playerPosition.y, zone.x, zone.y) <= zone.radius
    ));

    if (matchingZones.length === 0) {
      return 1;
    }

    return matchingZones.reduce(
      (lowestMultiplier, zone) => Math.min(lowestMultiplier, zone.playerSpeedMultiplier),
      1,
    );
  }

  private spawnBoss(gameTimeSeconds: number): void {
    const config = this.chooseBossConfig();
    const position = this.getBossSpawnPosition();
    const stats = this.getScaledBossStats(config, gameTimeSeconds);
    const boss = this.enemyFactory.create(config.enemyId, position.x, position.y, stats);

    this.activeBoss = boss;
    this.activeBossConfig = config;
    this.activeBossSkillRuntime = new BossSkillRuntime(
      BossSkillFactory.createSkills(config.skills),
      () => this.createSkillContext(boss),
    );
    this.onEnemySpawned(boss);
    this.runState.recordEndlessBossSpawn(config.id);
  }

  private handleBossKilled(gameTimeSeconds: number): void {
    if (this.activeBossConfig) {
      this.runState.recordEndlessBossKill(this.activeBossConfig.id);
      this.lastBossId = this.activeBossConfig.id;
    }

    this.activeBossSkillRuntime?.clear();
    this.activeBossSkillRuntime = null;
    this.activeBoss = null;
    this.activeBossConfig = null;
    this.nextSpawnTime = gameTimeSeconds + this.getSpawnInterval(gameTimeSeconds - this.endlessStartTime);
  }

  private createSkillContext(boss: Enemy): BossSkillContext {
    return {
      scene: this.scene,
      boss,
      enemies: this.enemies,
      enemyFactory: this.enemyFactory,
      enemyFlow: this.enemyFlow,
      runState: this.runState,
      getPlayerPosition: () => this.getPlayerPosition(),
      getPlayerBody: () => this.getPlayerPosition(),
      getGameTimeSeconds: () => this.endlessStartTime + this.getEndlessTimeSeconds(),
      getWorldSize: () => this.getWorldSize(),
      getEndlessTimeSeconds: () => this.getEndlessTimeSeconds(),
      applyPlayerDamage: (_source, damage, options) => this.enemyFlow.applyPlayerDamage(damage, {
        knockbackDirection: options?.knockbackDirection,
        knockbackDistance: options?.knockbackDistance,
        triggerReaction: true,
      }),
      spawnEnemy: (enemyId, x, y, options) => this.spawnSkillEnemy(enemyId, x, y, options),
      addPlayerSlowZone: (zone) => {
        this.activeZones.push({
          x: zone.x,
          y: zone.y,
          radius: zone.radius,
          remainingMs: zone.durationMs,
          playerSpeedMultiplier: zone.playerSpeedMultiplier,
          visual: zone.visual,
        });
      },
      playSfx: (key) => {
        AudioManager.playSfx(this.scene, key);
      },
    };
  }

  private spawnSkillEnemy(
    enemyId: string,
    x: number,
    y: number,
    options?: { useEndlessScaling?: boolean },
  ): Enemy | null {
    if (this.enemies.length >= EndlessBossManager.MAX_ENEMIES) {
      return null;
    }

    const baseStats = this.enemyFactory.getEnemyStats(enemyId);
    const stats = options?.useEndlessScaling === true
      ? this.getScaledSummonStats(enemyId)
      : baseStats;
    const worldSize = this.getWorldSize();
    const enemy = this.enemyFactory.create(
      enemyId,
      Phaser.Math.Clamp(x, 48, worldSize.width - 48),
      Phaser.Math.Clamp(y, 48, worldSize.height - 48),
      stats,
    );

    this.onEnemySpawned(enemy);
    return enemy;
  }

  private getScaledSummonStats(enemyId: string) {
    const baseStats = this.enemyFactory.getEnemyStats(enemyId);
    const scaling = EndlessManager.getEnemyScale(this.getEndlessTimeSeconds());

    return {
      ...baseStats,
      hp: Math.round(baseStats.hp * scaling.hpMultiplier),
      damage: Math.round(baseStats.damage * scaling.damageMultiplier),
      moveSpeed: baseStats.moveSpeed * scaling.speedMultiplier,
      exp: Math.round(baseStats.exp * scaling.expMultiplier),
    };
  }

  private getEndlessTimeSeconds(): number {
    return Math.max(0, this.currentGameTimeSeconds - this.endlessStartTime);
  }

  private updateZones(deltaMs: number): void {
    for (let index = this.activeZones.length - 1; index >= 0; index -= 1) {
      const zone = this.activeZones[index];
      zone.remainingMs -= deltaMs;
      if (zone.remainingMs <= 0) {
        zone.visual.destroy();
        this.activeZones.splice(index, 1);
      }
    }
  }

  private clearZones(): void {
    this.activeZones.forEach((zone) => zone.visual.destroy());
    this.activeZones.length = 0;
  }

  private getScaledBossStats(config: EndlessBossConfig, gameTimeSeconds: number) {
    const baseStats = this.enemyFactory.getEnemyStats(config.enemyId);
    const scaling = EndlessManager.getEnemyScale(Math.max(0, gameTimeSeconds - this.endlessStartTime));

    return {
      ...baseStats,
      hp: Math.round(baseStats.hp * scaling.hpMultiplier * 1.2 * config.baseHpMultiplier),
      damage: Math.round(baseStats.damage * scaling.damageMultiplier * config.baseDamageMultiplier),
      moveSpeed: baseStats.moveSpeed
        * Math.min(scaling.speedMultiplier, 1.35)
        * config.baseSpeedMultiplier,
      exp: Math.round(baseStats.exp * scaling.expMultiplier),
      bossLike: true,
    };
  }

  private chooseBossConfig(): EndlessBossConfig {
    const candidates = ENDLESS_BOSS_CONFIGS.filter((config) => (
      ENDLESS_BOSS_CONFIGS.length <= 1 || config.id !== this.lastBossId
    ));
    const totalWeight = candidates.reduce((sum, config) => sum + Math.max(0, config.weight), 0);
    let roll = Math.random() * totalWeight;

    for (const config of candidates) {
      roll -= Math.max(0, config.weight);
      if (roll <= 0) {
        return config;
      }
    }

    return candidates[0] ?? ENDLESS_BOSS_CONFIGS[0];
  }

  private getSpawnInterval(endlessTimeSeconds: number): number {
    if (endlessTimeSeconds >= 900) {
      return 35;
    }
    if (endlessTimeSeconds >= 600) {
      return 45;
    }
    if (endlessTimeSeconds >= 300) {
      return 60;
    }
    if (endlessTimeSeconds >= 120) {
      return 75;
    }
    return 90;
  }

  private getBossSpawnPosition(): Phaser.Math.Vector2 {
    const playerPosition = this.getPlayerPosition();
    const worldSize = this.getWorldSize();

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const candidate = this.clampToWorld(new Phaser.Math.Vector2(
        playerPosition.x + Math.cos(angle) * 720,
        playerPosition.y + Math.sin(angle) * 720,
      ));

      if (Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        candidate.x,
        candidate.y,
      ) >= 520) {
        return candidate;
      }
    }

    return new Phaser.Math.Vector2(worldSize.width * 0.5, worldSize.height * 0.5);
  }

  private clampToWorld(position: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const worldSize = this.getWorldSize();
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(position.x, 48, worldSize.width - 48),
      Phaser.Math.Clamp(position.y, 48, worldSize.height - 48),
    );
  }

  private formatBossName(id: EndlessBossId): string {
    return id
      .replace(/^endless_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
