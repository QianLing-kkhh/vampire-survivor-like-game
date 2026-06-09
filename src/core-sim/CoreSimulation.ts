import { LeaderboardKeyFactory } from '../leaderboard/LeaderboardKeyFactory';
import { createRunModeMetadataFromConfig } from '../run/RunModeMetadata';
import type { RunMetadata } from '../run/RunMetadata';
import { createAutoStrategyRunModeConfig } from '../runtime/RunModeConfig';

import { createSimulationConfig, type SimulationConfig, type SimulationConfigInput } from './SimulationConfig';
import {
  createDefaultSimulationVersionInfo,
  createFallbackSimulationContent,
  type SimulationContentBundle,
  type SimulationDifficultyDefinition,
  type SimulationStageDefinition,
  type SimulationVersionInfo,
  type SimulationWaveEntry,
} from './SimulationContent';
import type { SimulationResult } from './SimulationResult';
import type {
  SimEnemyState,
  SimPickupState,
  SimTracePoint,
  SimVector2,
  SimulationState,
} from './SimulationState';
import { hashStableValue } from './StableJson';

class SimRandom {
  private state: number;

  constructor(seed: string) {
    this.state = SimRandom.hashSeed(seed);
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;

    return this.state / 0x100000000;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))];
  }

  private static hashSeed(seed: string): number {
    let hash = 2166136261;

    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0 || 1;
  }
}

export class CoreSimulation {
  readonly config: SimulationConfig;
  readonly state: SimulationState;
  private readonly random: SimRandom;
  private readonly content: SimulationContentBundle;
  private readonly versionInfo: SimulationVersionInfo;
  private readonly stage: SimulationStageDefinition;
  private readonly difficulty: SimulationDifficultyDefinition;
  private readonly waveSet: readonly SimulationWaveEntry[];

  constructor(input: SimulationConfigInput = {}) {
    this.config = createSimulationConfig(input);
    this.random = new SimRandom(this.config.seed);
    this.content = this.config.content ?? createFallbackSimulationContent();
    this.versionInfo = this.config.versionInfo ?? createDefaultSimulationVersionInfo();
    this.stage = this.content.stages[this.config.stageId]
      ?? this.content.stages.stage_001
      ?? createFallbackSimulationContent().stages.stage_001;
    this.difficulty = this.content.difficulties[this.config.difficultyId]
      ?? this.content.difficulties.normal
      ?? createFallbackSimulationContent().difficulties.normal;
    this.waveSet = this.content.waves[this.stage.waveSetId ?? 'default']
      ?? this.content.waves.default
      ?? createFallbackSimulationContent().waves.default;
    this.state = this.createInitialState();
  }

  tick(deltaMs = this.config.deltaMs): SimulationState {
    if (this.state.result) {
      return this.state;
    }

    const stepMs = Math.max(16, Math.min(1000, deltaMs));

    this.state.tick += 1;
    this.state.timeMs += stepMs;
    this.spawnWaveEnemies(stepMs);
    this.spawnFinalBoss();
    this.movePlayer(stepMs);
    this.moveEnemies(stepMs);
    this.applyWeapon(stepMs);
    this.applyContactDamage(stepMs);
    this.collectPickups();
    this.updateEndless(stepMs);
    this.updateResult();

    if (this.state.tick === 1 || this.state.tick % 10 === 0 || this.state.result) {
      this.state.trace.push(this.createTracePoint());
    }

    return this.state;
  }

  run(): SimulationResult {
    while (!this.state.result) {
      this.tick(this.config.deltaMs);
    }

    return this.getResult();
  }

  getResult(): SimulationResult {
    const result = this.state.result ?? 'completed';
    const survivalMs = Math.min(this.state.timeMs, this.config.durationMs);
    const strategyProfileHash = this.config.strategyProfileHash ?? stableProfileHash(this.config.strategyProfile);
    const metadata = this.createRunMetadata(strategyProfileHash);

    return {
      seed: this.config.seed,
      presetId: this.config.presetId,
      runIndex: this.config.runIndex,
      matrixKey: this.config.matrixKey,
      characterId: this.config.characterId,
      stageId: this.config.stageId,
      mapId: this.config.mapId,
      difficultyId: this.config.difficultyId,
      strategyProfileId: this.config.strategyProfileId,
      strategyProfileHash,
      leaderboardKey: metadata.leaderboardKey ?? '',
      metadata,
      schemaVersions: {
        csv: this.versionInfo.csvSchemaVersion,
        save: this.versionInfo.saveSchemaVersion,
        replay: this.versionInfo.replaySchemaVersion,
        customStage: this.versionInfo.customStageSchemaVersion,
      },
      durationSeconds: this.config.durationMs / 1000,
      tickMs: this.config.deltaMs,
      result,
      survivalTimeSeconds: Number((survivalMs / 1000).toFixed(2)),
      level: this.state.player.level,
      kills: this.state.runStats.kills,
      exp: this.state.runStats.expCollected,
      score: this.calculateScore(survivalMs),
      damageDealt: Math.round(this.state.runStats.damageDealt),
      damageTaken: Math.round(this.state.runStats.damageTaken),
      pickupsCollected: this.state.runStats.pickupsCollected,
      enemiesSpawned: this.state.runStats.enemiesSpawned,
      bossKilled: this.state.boss.killed,
      endlessStarted: this.state.endless.started,
      endlessScalingLevel: this.state.endless.scalingLevel,
      trace: this.state.trace.map((point) => ({ ...point })),
    };
  }

  private createRunMetadata(strategyProfileHash: string): RunMetadata {
    const runModeConfig = createAutoStrategyRunModeConfig({
      strategyProfileId: this.config.strategyProfileId,
      strategyProfileHash,
      strategyProfile: this.config.strategyProfile,
      strategyControlType: 'fixed',
      allowRuntimeStrategyEdit: false,
      autoChallengeType: 'normal',
      simulationSpeedMultiplier: 1,
      viewPlaybackSpeedMultiplier: 1,
    });
    const metadata: RunMetadata = {
      runId: `${this.config.seed}:${this.config.matrixKey}`,
      runSeed: this.config.seed,
      gameVersion: this.versionInfo.gameVersion,
      contentHash: this.versionInfo.contentHash,
      saveSchemaVersion: this.versionInfo.saveSchemaVersion,
      csvSchemaVersion: this.versionInfo.csvSchemaVersion,
      replaySchemaVersion: this.versionInfo.replaySchemaVersion,
      customStageSchemaVersion: this.versionInfo.customStageSchemaVersion,
      selectedCharacterId: this.config.characterId,
      characterSelectionMode: 'fixed',
      characterId: this.config.characterId,
      selectedStageId: this.config.stageId,
      stageSelectionMode: 'fixed',
      stageId: this.config.stageId,
      mapId: this.config.mapId,
      difficultyId: this.config.difficultyId,
      rulesetId: this.config.difficultyId,
      seed: this.config.seed,
      ...createRunModeMetadataFromConfig(runModeConfig),
    };

    return {
      ...metadata,
      leaderboardKey: LeaderboardKeyFactory.serializeFromMetadata(metadata),
    };
  }

  private calculateScore(survivalMs: number): number {
    const scoreMultiplier = this.difficulty.scoreMultiplier ?? 1;

    return Math.max(0, Math.round((
      survivalMs / 1000 * 2
      + this.state.runStats.kills * 12
      + this.state.runStats.bossKills * 500
      + this.state.player.level * 85
      + this.state.runStats.expCollected * 1.5
      - this.state.runStats.damageTaken * 1.2
    ) * scoreMultiplier));
  }

  private createInitialState(): SimulationState {
    const character = this.content.characters[this.config.characterId]
      ?? this.content.characters.default
      ?? this.content.characters.priest;
    const startingWeaponId = character?.startingWeaponId ?? 'magic_wand';
    const weaponConfig = this.content.weapons[startingWeaponId] ?? this.content.weapons.magic_wand;
    const initialStats = character?.initialStats ?? {};
    const maxHp = initialStats.maxHp ?? 100;
    const pickupRange = normalizePickupRange(initialStats.pickupRange ?? 2);

    return {
      tick: 0,
      timeMs: 0,
      spawnAccumulatorMs: 0,
      waveAccumulatorsMs: {},
      waveSpawnedCounts: {},
      nextEnemyId: 1,
      nextPickupId: 1,
      player: {
        x: this.config.worldBounds.width / 2,
        y: this.config.worldBounds.height / 2,
        currentHp: maxHp,
        maxHp,
        level: 1,
        exp: 0,
        expToNextLevel: 8,
        radius: 16,
        moveSpeed: initialStats.moveSpeed ?? 155,
        pickupRange,
      },
      enemies: [],
      pickups: [],
      weapon: {
        weaponId: startingWeaponId,
        cooldownMs: Math.max(120, (weaponConfig?.cooldown ?? 0.9) * 1000),
        cooldownRemainingMs: 0,
        damage: (weaponConfig?.damage ?? 12) * (initialStats.damageMultiplier ?? 1),
        range: normalizeWeaponRange(weaponConfig?.radius),
        hitsPerAttack: Math.max(1, weaponConfig?.projectileCount ?? weaponConfig?.pierce ?? 1),
      },
      boss: {
        spawned: false,
        killed: false,
      },
      endless: {
        started: false,
        scalingLevel: 0,
        bossSpawnCount: 0,
      },
      runStats: {
        kills: 0,
        bossKills: 0,
        damageDealt: 0,
        damageTaken: 0,
        expCollected: 0,
        levelsGained: 0,
        pickupsCollected: 0,
        enemiesSpawned: 0,
      },
      trace: [],
    };
  }

  private spawnWaveEnemies(deltaMs: number): void {
    const elapsedSeconds = this.state.timeMs / 1000;

    for (const wave of this.waveSet) {
      if (elapsedSeconds < wave.time) {
        continue;
      }

      const waveKey = `${wave.time}:${wave.enemy}:${wave.interval}`;
      const spawned = this.state.waveSpawnedCounts[waveKey] ?? 0;

      if (spawned >= wave.count) {
        continue;
      }

      const intervalMs = Math.max(50, wave.interval * 1000 / this.difficulty.spawnRateMultiplier);
      const nextAccumulator = (this.state.waveAccumulatorsMs[waveKey] ?? 0) + deltaMs;
      let accumulator = nextAccumulator;

      while (accumulator >= intervalMs && (this.state.waveSpawnedCounts[waveKey] ?? 0) < wave.count) {
        accumulator -= intervalMs;
        this.state.enemies.push(this.createEnemy(wave.enemy, false));
        this.state.waveSpawnedCounts[waveKey] = (this.state.waveSpawnedCounts[waveKey] ?? 0) + 1;
        this.state.runStats.enemiesSpawned += 1;
      }

      this.state.waveAccumulatorsMs[waveKey] = accumulator;
    }
  }

  private spawnFinalBoss(): void {
    const spawnTimeMs = (this.stage.finalBossSpawnTimeSeconds ?? 300) * 1000;

    if (this.state.boss.spawned || this.state.timeMs < spawnTimeMs) {
      return;
    }

    this.state.boss.spawned = true;
    this.state.enemies.push(this.createEnemy(this.stage.finalBossId ?? 'boss', true));
    this.state.runStats.enemiesSpawned += 1;
  }

  private createEnemy(enemyId: string, bossLike: boolean): SimEnemyState {
    const enemy = this.content.enemies[enemyId]
      ?? this.content.enemies.slime
      ?? createFallbackSimulationContent().enemies.slime;
    const edge = Math.floor(this.random.range(0, 4));
    const margin = 32;
    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = this.random.range(0, this.config.worldBounds.width);
      y = -margin;
    } else if (edge === 1) {
      x = this.config.worldBounds.width + margin;
      y = this.random.range(0, this.config.worldBounds.height);
    } else if (edge === 2) {
      x = this.random.range(0, this.config.worldBounds.width);
      y = this.config.worldBounds.height + margin;
    } else {
      x = -margin;
      y = this.random.range(0, this.config.worldBounds.height);
    }

    const isBossLike = bossLike || enemy.bossLike === true;
    const hpMultiplier = isBossLike
      ? this.difficulty.bossHpMultiplier
      : this.difficulty.enemyHpMultiplier;
    const damageMultiplier = isBossLike
      ? this.difficulty.bossDamageMultiplier
      : this.difficulty.enemyDamageMultiplier;

    return {
      id: this.state.nextEnemyId++,
      enemyId,
      x,
      y,
      currentHp: enemy.hp * hpMultiplier,
      maxHp: enemy.hp * hpMultiplier,
      radius: 14 * (enemy.scale ? Math.sqrt(enemy.scale) : 1),
      moveSpeed: enemy.moveSpeed * this.difficulty.enemySpeedMultiplier,
      damagePerSecond: enemy.damage * damageMultiplier,
      exp: enemy.exp * this.difficulty.expMultiplier,
      bossLike: isBossLike,
    };
  }

  private movePlayer(deltaMs: number): void {
    const direction = this.evaluateStrategyDirection();
    const distance = this.state.player.moveSpeed * deltaMs / 1000;

    this.state.player.x = clamp(this.state.player.x + direction.x * distance, 0, this.config.worldBounds.width);
    this.state.player.y = clamp(this.state.player.y + direction.y * distance, 0, this.config.worldBounds.height);
  }

  private evaluateStrategyDirection(): SimVector2 {
    const player = this.state.player;
    const profile = this.getActiveStrategyProfile().movement;
    const nearest = this.getNearestEnemy();
    const enemyCenter = this.getEnemyCenter();
    const pickupTarget = this.getBestPickupTarget();
    const direction = { x: 0, y: 0 };

    if (nearest) {
      const toPlayer = normalize({ x: player.x - nearest.x, y: player.y - nearest.y });
      const distance = distanceBetween(player, nearest);
      const dangerRatio = clamp01((220 - distance) / 220);
      const survivalWeight = profile.survivalBias / 45;

      direction.x += toPlayer.x * dangerRatio * survivalWeight * (nearest.bossLike ? 1.4 : 1);
      direction.y += toPlayer.y * dangerRatio * survivalWeight * (nearest.bossLike ? 1.4 : 1);
    }

    if (enemyCenter.count > 0) {
      const fromCenter = normalize({ x: player.x - enemyCenter.x, y: player.y - enemyCenter.y });
      const tangent = { x: -fromCenter.y, y: fromCenter.x };
      const centerDistance = distanceBetween(player, enemyCenter);
      const desiredDistance = 260;
      const combatWeight = profile.combatBias / 70;
      const loopWeight = profile.loopBias / 75;
      const overKiteWeight = profile.overKitePenalty / 80;

      direction.x += tangent.x * loopWeight;
      direction.y += tangent.y * loopWeight;

      if (centerDistance < desiredDistance * 0.72) {
        direction.x += fromCenter.x * combatWeight;
        direction.y += fromCenter.y * combatWeight;
      } else if (centerDistance > desiredDistance * 1.35) {
        direction.x -= fromCenter.x * overKiteWeight;
        direction.y -= fromCenter.y * overKiteWeight;
      }
    }

    if (pickupTarget && this.isPickupRouteSafe(pickupTarget)) {
      const toPickup = normalize({ x: pickupTarget.x - player.x, y: pickupTarget.y - player.y });
      const farmWeight = this.state.player.currentHp / this.state.player.maxHp < 0.35
        ? profile.farmBias / 180
        : profile.farmBias / 85;

      direction.x += toPickup.x * farmWeight;
      direction.y += toPickup.y * farmWeight;
    }

    const inward = this.getBoundaryInwardDirection();
    direction.x += inward.x * 1.1;
    direction.y += inward.y * 1.1;

    return normalizeOr(direction, { x: 1, y: 0 });
  }

  private moveEnemies(deltaMs: number): void {
    const player = this.state.player;

    for (const enemy of this.state.enemies) {
      const direction = normalize({ x: player.x - enemy.x, y: player.y - enemy.y });
      const distance = enemy.moveSpeed * deltaMs / 1000;

      enemy.x += direction.x * distance;
      enemy.y += direction.y * distance;
    }
  }

  private applyWeapon(deltaMs: number): void {
    const weapon = this.state.weapon;

    weapon.cooldownRemainingMs = Math.max(0, weapon.cooldownRemainingMs - deltaMs);

    if (weapon.cooldownRemainingMs > 0) {
      return;
    }

    const targets = this.state.enemies
      .filter((enemy) => distanceBetween(this.state.player, enemy) <= weapon.range)
      .sort((a, b) => distanceBetween(this.state.player, a) - distanceBetween(this.state.player, b))
      .slice(0, weapon.hitsPerAttack);

    if (targets.length === 0) {
      return;
    }

    weapon.cooldownRemainingMs = weapon.cooldownMs;

    for (const enemy of targets) {
      enemy.currentHp -= weapon.damage;
      this.state.runStats.damageDealt += weapon.damage;
    }

    this.killDeadEnemies();
  }

  private killDeadEnemies(): void {
    const survivors: SimEnemyState[] = [];

    for (const enemy of this.state.enemies) {
      if (enemy.currentHp > 0) {
        survivors.push(enemy);
        continue;
      }

      this.state.runStats.kills += 1;

      if (enemy.bossLike) {
        this.state.runStats.bossKills += 1;
        if (enemy.enemyId === (this.stage.finalBossId ?? 'boss')) {
          this.state.boss.killed = true;
        }
      }

      if (enemy.exp > 0) {
        this.state.pickups.push({
          id: this.state.nextPickupId++,
          x: enemy.x,
          y: enemy.y,
          exp: Math.max(1, Math.round(enemy.exp)),
          radius: 8,
        });
      }
    }

    this.state.enemies = survivors;
  }

  private applyContactDamage(deltaMs: number): void {
    const player = this.state.player;

    for (const enemy of this.state.enemies) {
      const contactDistance = player.radius + enemy.radius;

      if (distanceBetween(player, enemy) <= contactDistance) {
        const damage = enemy.damagePerSecond * deltaMs / 1000;

        player.currentHp -= damage;
        this.state.runStats.damageTaken += damage;
      }
    }
  }

  private collectPickups(): void {
    const remaining: SimPickupState[] = [];

    for (const pickup of this.state.pickups) {
      if (distanceBetween(this.state.player, pickup) <= this.state.player.pickupRange + pickup.radius) {
        this.state.player.exp += pickup.exp;
        this.state.runStats.expCollected += pickup.exp;
        this.state.runStats.pickupsCollected += 1;
        this.applyLevelUps();
      } else {
        remaining.push(pickup);
      }
    }

    this.state.pickups = remaining;
  }

  private applyLevelUps(): void {
    const player = this.state.player;

    while (player.exp >= player.expToNextLevel) {
      player.exp -= player.expToNextLevel;
      player.level += 1;
      player.expToNextLevel = Math.floor(7 + player.level * 4.4);
      player.maxHp += 2;
      player.currentHp = Math.min(player.maxHp, player.currentHp + 8);
      player.pickupRange += 1.8;
      this.applyAutoUpgrade();
      this.state.runStats.levelsGained += 1;
    }
  }

  private applyAutoUpgrade(): void {
    const upgrade = this.weightedUpgradePick();

    if (upgrade === 'damage') {
      this.state.weapon.damage *= 1.1;
    } else if (upgrade === 'cooldown') {
      this.state.weapon.cooldownMs = Math.max(180, this.state.weapon.cooldownMs * 0.92);
    } else if (upgrade === 'range') {
      this.state.weapon.range += 12;
      this.state.player.pickupRange += 1;
    } else {
      this.state.player.maxHp += 8;
      this.state.player.currentHp += 8;
    }

    if (this.state.player.level === 4 || this.state.player.level === 8 || this.state.player.level === 12) {
      this.state.weapon.hitsPerAttack += 1;
    }
  }

  private weightedUpgradePick(): 'damage' | 'cooldown' | 'range' | 'survival' {
    const upgrade = this.getActiveStrategyProfile().upgrade;
    const weighted = [
      { id: 'damage' as const, weight: upgrade.damagePriority + upgrade.mainWeaponPriority },
      { id: 'cooldown' as const, weight: upgrade.cooldownPriority },
      { id: 'range' as const, weight: upgrade.growthPriority + upgrade.passivePriority * 0.35 },
      { id: 'survival' as const, weight: upgrade.survivalPriority },
    ];
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.random.range(0, total);

    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.id;
      }
    }

    return weighted[0].id;
  }

  private updateEndless(deltaMs: number): void {
    if (!this.state.boss.killed || !this.stage.allowEndless) {
      return;
    }

    if (!this.state.endless.started && this.config.durationMs > (this.stage.finalBossSpawnTimeSeconds ?? 300) * 1000) {
      this.state.endless.started = true;
      this.state.endless.startedAtMs = this.state.timeMs;
    }

    if (!this.state.endless.started) {
      return;
    }

    const endlessMs = this.state.timeMs - (this.state.endless.startedAtMs ?? this.state.timeMs);
    this.state.endless.scalingLevel = Math.floor(endlessMs / 30000);
    this.state.spawnAccumulatorMs += deltaMs;

    const intervalMs = Math.max(180, 900 - this.state.endless.scalingLevel * 30);
    while (this.state.spawnAccumulatorMs >= intervalMs) {
      this.state.spawnAccumulatorMs -= intervalMs;
      const enemyId = this.random.pick(['slime', 'bat', 'golem']);
      const enemy = this.createEnemy(enemyId, false);
      const scale = 1 + this.state.endless.scalingLevel * 0.08;

      enemy.currentHp *= scale;
      enemy.maxHp *= scale;
      enemy.moveSpeed *= Math.sqrt(scale);
      enemy.damagePerSecond *= scale;
      this.state.enemies.push(enemy);
      this.state.runStats.enemiesSpawned += 1;
    }
  }

  private updateResult(): void {
    if (this.state.player.currentHp <= 0) {
      this.state.player.currentHp = 0;
      this.state.result = this.state.endless.started ? 'victory' : 'gameOver';
    } else if (this.state.boss.killed && !this.state.endless.started) {
      this.state.result = 'victory';
    } else if (this.state.timeMs >= this.config.durationMs) {
      this.state.result = 'completed';
    }
  }

  private createTracePoint(): SimTracePoint {
    return {
      tick: this.state.tick,
      timeMs: this.state.timeMs,
      score: this.calculateScore(this.state.timeMs),
      playerX: Number(this.state.player.x.toFixed(3)),
      playerY: Number(this.state.player.y.toFixed(3)),
      playerHp: Number(this.state.player.currentHp.toFixed(3)),
      level: this.state.player.level,
      enemyCount: this.state.enemies.length,
      pickupCount: this.state.pickups.length,
      kills: this.state.runStats.kills,
      exp: this.state.runStats.expCollected,
      damageDealt: Number(this.state.runStats.damageDealt.toFixed(3)),
      damageTaken: Number(this.state.runStats.damageTaken.toFixed(3)),
      pickupsCollected: this.state.runStats.pickupsCollected,
      enemiesSpawned: this.state.runStats.enemiesSpawned,
      bossSpawned: this.state.boss.spawned,
      bossKilled: this.state.boss.killed,
      endlessStarted: this.state.endless.started,
      result: this.state.result,
    };
  }

  private getActiveStrategyProfile() {
    const phases = this.config.phasedStrategy?.phases;

    if (!phases || phases.length === 0) {
      return this.config.strategyProfile;
    }

    const elapsedSeconds = this.state.timeMs / 1000;
    const active = phases.find((phase) => elapsedSeconds >= phase.startSeconds && elapsedSeconds < phase.endSeconds)
      ?? phases[phases.length - 1];

    return active.profile;
  }

  private getNearestEnemy(): SimEnemyState | undefined {
    let nearest: SimEnemyState | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of this.state.enemies) {
      const distance = distanceBetween(this.state.player, enemy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    }

    return nearest;
  }

  private getEnemyCenter(): SimVector2 & { count: number } {
    if (this.state.enemies.length === 0) {
      return { x: this.state.player.x, y: this.state.player.y, count: 0 };
    }

    let totalX = 0;
    let totalY = 0;

    for (const enemy of this.state.enemies) {
      totalX += enemy.x;
      totalY += enemy.y;
    }

    return {
      x: totalX / this.state.enemies.length,
      y: totalY / this.state.enemies.length,
      count: this.state.enemies.length,
    };
  }

  private getBestPickupTarget(): SimPickupState | undefined {
    let best: SimPickupState | undefined;
    let bestScore = 0;

    for (const pickup of this.state.pickups) {
      const distance = distanceBetween(this.state.player, pickup);
      const score = pickup.exp * 18 - distance * 0.045;

      if (score > bestScore) {
        bestScore = score;
        best = pickup;
      }
    }

    return best;
  }

  private isPickupRouteSafe(pickup: SimPickupState): boolean {
    for (const enemy of this.state.enemies) {
      const distanceToPickup = distanceBetween(enemy, pickup);

      if (distanceToPickup < 140) {
        return false;
      }
    }

    return true;
  }

  private getBoundaryInwardDirection(): SimVector2 {
    const margin = 160;
    const player = this.state.player;
    const direction = { x: 0, y: 0 };

    if (player.x < margin) {
      direction.x += (margin - player.x) / margin;
    } else if (player.x > this.config.worldBounds.width - margin) {
      direction.x -= (player.x - (this.config.worldBounds.width - margin)) / margin;
    }

    if (player.y < margin) {
      direction.y += (margin - player.y) / margin;
    } else if (player.y > this.config.worldBounds.height - margin) {
      direction.y -= (player.y - (this.config.worldBounds.height - margin)) / margin;
    }

    return direction;
  }
}

export function stableProfileHash(profile: unknown): string {
  return hashStableValue('fnv1a', profile);
}

function distanceBetween(a: SimVector2, b: SimVector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(vector: SimVector2): SimVector2 {
  return normalizeOr(vector, { x: 0, y: 0 });
}

function normalizeOr(vector: SimVector2, fallback: SimVector2): SimVector2 {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.00001) {
    return { ...fallback };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function normalizePickupRange(value: number): number {
  return value <= 12 ? value * 32 : value;
}

function normalizeWeaponRange(radius: number | undefined): number {
  if (radius === undefined) {
    return 260;
  }

  return radius <= 12 ? radius * 48 : radius;
}
