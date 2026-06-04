import Phaser from 'phaser';

import { Enemy } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { EnemyFlow, PlayerDamageResult } from '../enemy/EnemyFlow';
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

interface PendingSkill {
  config: EndlessBossConfig;
  remainingMs: number;
  data: Record<string, unknown>;
  visual?: Phaser.GameObjects.GameObject;
}

interface ActiveZone {
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
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
  private lastBossId: EndlessBossId | null = null;
  private skillCooldownRemainingMs = 0;
  private pendingSkill: PendingSkill | null = null;
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
    this.clearSkillVisuals();
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

    this.updateBossSkill(gameTimeSeconds, deltaMs);
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
    return this.activeZones.some((zone) => (
      Phaser.Math.Distance.Between(playerPosition.x, playerPosition.y, zone.x, zone.y) <= zone.radius
    ))
      ? 0.6
      : 1;
  }

  private spawnBoss(gameTimeSeconds: number): void {
    const config = this.chooseBossConfig();
    const position = this.getBossSpawnPosition();
    const stats = this.getScaledBossStats(config, gameTimeSeconds);
    const boss = this.enemyFactory.create(config.enemyId, position.x, position.y, stats);

    this.activeBoss = boss;
    this.activeBossConfig = config;
    this.skillCooldownRemainingMs = config.skillCooldown * 1000;
    this.pendingSkill = null;
    this.onEnemySpawned(boss);
    this.runState.recordEndlessBossSpawn(config.id);
  }

  private handleBossKilled(gameTimeSeconds: number): void {
    if (this.activeBossConfig) {
      this.runState.recordEndlessBossKill(this.activeBossConfig.id);
      this.lastBossId = this.activeBossConfig.id;
    }

    this.activeBoss = null;
    this.activeBossConfig = null;
    this.pendingSkill = null;
    this.skillCooldownRemainingMs = 0;
    this.nextSpawnTime = gameTimeSeconds + this.getSpawnInterval(gameTimeSeconds - this.endlessStartTime);
    this.clearSkillVisuals();
  }

  private updateBossSkill(gameTimeSeconds: number, deltaMs: number): void {
    if (!this.activeBoss || !this.activeBossConfig) {
      return;
    }

    if (this.pendingSkill) {
      this.pendingSkill.remainingMs -= deltaMs;
      if (this.pendingSkill.remainingMs <= 0) {
        const pendingSkill = this.pendingSkill;
        this.pendingSkill = null;
        pendingSkill.visual?.destroy();
        this.executeSkill(pendingSkill, gameTimeSeconds);
        this.skillCooldownRemainingMs = this.activeBossConfig.skillCooldown * 1000;
      }
      return;
    }

    this.skillCooldownRemainingMs -= deltaMs;
    if (this.skillCooldownRemainingMs > 0) {
      return;
    }

    this.startSkillWarning(this.activeBossConfig, gameTimeSeconds);
  }

  private startSkillWarning(config: EndlessBossConfig, gameTimeSeconds: number): void {
    if (!this.activeBoss) {
      return;
    }

    if (config.warningDuration <= 0) {
      this.executeSkill({ config, remainingMs: 0, data: {} }, gameTimeSeconds);
      this.skillCooldownRemainingMs = config.skillCooldown * 1000;
      return;
    }

    const bossPosition = new Phaser.Math.Vector2(this.activeBoss.body.x, this.activeBoss.body.y);
    const playerPosition = this.getPlayerPosition();
    const data: Record<string, unknown> = {};
    let visual: Phaser.GameObjects.GameObject | undefined;

    if (config.skillType === 'berserker_dash' || config.skillType === 'sniper_beam') {
      const direction = playerPosition.clone().subtract(bossPosition).normalize();
      const length = config.skillType === 'sniper_beam' ? 1200 : 520;
      data.direction = direction;
      data.start = bossPosition.clone();
      data.end = bossPosition.clone().add(direction.clone().scale(length));
      visual = this.scene.add.line(
        bossPosition.x,
        bossPosition.y,
        0,
        0,
        direction.x * length,
        direction.y * length,
        0xff3333,
        0.65,
      ).setOrigin(0, 0).setDepth(34);
    } else if (config.skillType === 'freezer_zone') {
      data.x = playerPosition.x;
      data.y = playerPosition.y;
      data.radius = 120;
      visual = this.scene.add.circle(playerPosition.x, playerPosition.y, 120, 0x66ccff, 0.18)
        .setStrokeStyle(3, 0x99ddff, 0.7)
        .setDepth(9);
    } else if (config.skillType === 'tanker_shockwave') {
      data.x = bossPosition.x;
      data.y = bossPosition.y;
      data.radius = 180;
      visual = this.scene.add.circle(bossPosition.x, bossPosition.y, 180, 0xff7733, 0.14)
        .setStrokeStyle(4, 0xffaa33, 0.8)
        .setDepth(34);
    }

    this.pendingSkill = {
      config,
      remainingMs: config.warningDuration * 1000,
      data,
      visual,
    };
  }

  private executeSkill(skill: PendingSkill, gameTimeSeconds: number): void {
    this.runState.recordEndlessBossSkillUse();

    if (!this.activeBoss) {
      return;
    }

    if (skill.config.skillType === 'berserker_dash') {
      this.executeBerserkerDash(skill);
    } else if (skill.config.skillType === 'summoner_call') {
      this.executeSummonerCall(gameTimeSeconds);
    } else if (skill.config.skillType === 'freezer_zone') {
      this.executeFreezerZone(skill);
    } else if (skill.config.skillType === 'sniper_beam') {
      this.executeSniperBeam(skill);
    } else if (skill.config.skillType === 'tanker_shockwave') {
      this.executeTankerShockwave(skill);
    }
  }

  private executeBerserkerDash(skill: PendingSkill): void {
    if (!this.activeBoss) {
      return;
    }

    const start = skill.data.start as Phaser.Math.Vector2;
    const direction = skill.data.direction as Phaser.Math.Vector2;
    const end = start.clone().add(direction.clone().scale(520 * 0.35));
    const clampedEnd = this.clampToWorld(end);
    this.activeBoss.body.setPosition(clampedEnd.x, clampedEnd.y);
    this.hitPlayerAlongSegment(start, clampedEnd, 80, this.activeBoss.damage * 1.2, direction, 120);
    this.createImpactCircle(clampedEnd.x, clampedEnd.y, 90, 0xff5522);
  }

  private executeSummonerCall(gameTimeSeconds: number): void {
    if (!this.activeBoss || this.enemies.length >= EndlessBossManager.MAX_ENEMIES) {
      return;
    }

    const summons = [
      ...Array<string>(8).fill('bat'),
      ...Array<string>(8).fill('slime'),
      ...Array<string>(2).fill('golem'),
    ];
    const availableSlots = Math.max(0, EndlessBossManager.MAX_ENEMIES - this.enemies.length);
    const selectedSummons = summons.slice(0, Math.min(summons.length, availableSlots));
    const bossX = this.activeBoss.body.x;
    const bossY = this.activeBoss.body.y;
    const scaling = EndlessManager.getEnemyScale(Math.max(0, gameTimeSeconds - this.endlessStartTime));

    selectedSummons.forEach((enemyId, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, selectedSummons.length);
      const x = bossX + Math.cos(angle) * 180;
      const y = bossY + Math.sin(angle) * 180;
      const baseStats = this.enemyFactory.getEnemyStats(enemyId);
      const enemy = this.enemyFactory.create(enemyId, x, y, {
        ...baseStats,
        hp: Math.round(baseStats.hp * scaling.hpMultiplier),
        damage: Math.round(baseStats.damage * scaling.damageMultiplier),
        moveSpeed: baseStats.moveSpeed * scaling.speedMultiplier,
        exp: Math.round(baseStats.exp * scaling.expMultiplier),
      });
      this.onEnemySpawned(enemy);
    });

    this.createImpactCircle(bossX, bossY, 210, 0xaa44ff);
  }

  private executeFreezerZone(skill: PendingSkill): void {
    const x = Number(skill.data.x);
    const y = Number(skill.data.y);
    const radius = Number(skill.data.radius);
    const visual = this.scene.add.circle(x, y, radius, 0x66ccff, 0.16)
      .setStrokeStyle(3, 0x99ddff, 0.55)
      .setDepth(8);

    this.activeZones.push({ x, y, radius, remainingMs: 4000, visual });
  }

  private executeSniperBeam(skill: PendingSkill): void {
    if (!this.activeBoss) {
      return;
    }

    const start = skill.data.start as Phaser.Math.Vector2;
    const end = skill.data.end as Phaser.Math.Vector2;
    const direction = skill.data.direction as Phaser.Math.Vector2;
    this.hitPlayerAlongSegment(start, end, 35, this.activeBoss.damage * 1.5, direction, 110);
    const line = this.scene.add.line(
      start.x,
      start.y,
      0,
      0,
      end.x - start.x,
      end.y - start.y,
      0xff6633,
      0.8,
    ).setOrigin(0, 0).setDepth(35);
    this.scene.time.delayedCall(140, () => line.destroy());
  }

  private executeTankerShockwave(skill: PendingSkill): void {
    if (!this.activeBoss) {
      return;
    }

    const center = new Phaser.Math.Vector2(Number(skill.data.x), Number(skill.data.y));
    const radius = Number(skill.data.radius);
    const playerPosition = this.getPlayerPosition();

    if (Phaser.Math.Distance.Between(center.x, center.y, playerPosition.x, playerPosition.y) <= radius) {
      const direction = playerPosition.clone().subtract(center).normalize();
      const result = this.enemyFlow.applyPlayerDamage(this.activeBoss.damage, {
        knockbackDirection: direction,
        knockbackDistance: 140,
      });
      this.recordSkillDamage(result, this.activeBoss.damage);
    }

    this.createImpactCircle(center.x, center.y, radius, 0xffaa33);
  }

  private hitPlayerAlongSegment(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    radius: number,
    damage: number,
    knockbackDirection: Phaser.Math.Vector2,
    knockbackDistance: number,
  ): void {
    const playerPosition = this.getPlayerPosition();
    const distance = this.distanceSegmentToPoint(start, end, playerPosition);

    if (distance > radius) {
      return;
    }

    const result = this.enemyFlow.applyPlayerDamage(damage, {
      knockbackDirection,
      knockbackDistance,
    });
    this.recordSkillDamage(result, damage);
  }

  private recordSkillDamage(result: PlayerDamageResult, incomingDamage: number): void {
    if (!result.hit) {
      return;
    }

    this.runState.recordEndlessBossSkillHit(result.actualDamage, incomingDamage);
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

  private createImpactCircle(x: number, y: number, radius: number, color: number): void {
    const circle = this.scene.add.circle(x, y, radius, color, 0.22)
      .setStrokeStyle(4, color, 0.75)
      .setDepth(35);
    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.25,
      duration: 220,
      onComplete: () => circle.destroy(),
    });
  }

  private clearSkillVisuals(): void {
    this.pendingSkill?.visual?.destroy();
    this.pendingSkill = null;
    this.activeZones.forEach((zone) => zone.visual.destroy());
    this.activeZones.length = 0;
  }

  private distanceSegmentToPoint(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    point: Phaser.Math.Vector2,
  ): number {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSq = segmentX * segmentX + segmentY * segmentY;

    if (lengthSq <= 0) {
      return Phaser.Math.Distance.Between(start.x, start.y, point.x, point.y);
    }

    const t = Phaser.Math.Clamp(
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSq,
      0,
      1,
    );
    const projectionX = start.x + segmentX * t;
    const projectionY = start.y + segmentY * t;

    return Phaser.Math.Distance.Between(point.x, point.y, projectionX, projectionY);
  }

  private formatBossName(id: EndlessBossId): string {
    return id
      .replace(/^endless_/, '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}
