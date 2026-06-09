import { createSimulationConfig, type SimulationConfig, type SimulationConfigInput } from './SimulationConfig';
import type { SimulationResult } from './SimulationResult';
import type { SimEnemyState, SimPickupState, SimVector2, SimulationState } from './SimulationState';

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

  constructor(input: SimulationConfigInput = {}) {
    this.config = createSimulationConfig(input);
    this.random = new SimRandom(this.config.seed);
    this.state = this.createInitialState();
  }

  tick(deltaMs = this.config.deltaMs): SimulationState {
    if (this.state.result) {
      return this.state;
    }

    const stepMs = Math.max(16, Math.min(1000, deltaMs));

    this.state.timeMs += stepMs;
    this.spawnEnemies(stepMs);
    this.movePlayer(stepMs);
    this.moveEnemies(stepMs);
    this.applyWeapon(stepMs);
    this.applyContactDamage(stepMs);
    this.collectPickups();

    if (this.state.player.currentHp <= 0) {
      this.state.player.currentHp = 0;
      this.state.result = 'gameOver';
    } else if (this.state.timeMs >= this.config.durationMs) {
      this.state.result = 'completed';
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

    return {
      seed: this.config.seed,
      characterId: this.config.characterId,
      stageId: this.config.stageId,
      mapId: this.config.mapId,
      difficultyId: this.config.difficultyId,
      strategyProfileId: this.config.strategyProfileId,
      strategyProfileHash: this.config.strategyProfileHash ?? stableProfileHash(this.config.strategyProfile),
      durationSeconds: this.config.durationMs / 1000,
      tickMs: this.config.deltaMs,
      result,
      survivalTimeSeconds: Number((survivalMs / 1000).toFixed(2)),
      level: this.state.player.level,
      kills: this.state.runStats.kills,
      exp: this.state.runStats.expCollected,
      score: this.calculatePrototypeScore(survivalMs),
      damageDealt: Math.round(this.state.runStats.damageDealt),
      damageTaken: Math.round(this.state.runStats.damageTaken),
      pickupsCollected: this.state.runStats.pickupsCollected,
      enemiesSpawned: this.state.runStats.enemiesSpawned,
    };
  }

  private calculatePrototypeScore(survivalMs: number): number {
    return Math.max(0, Math.round(
      survivalMs / 1000 * 2
      + this.state.runStats.kills * 12
      + this.state.player.level * 85
      + this.state.runStats.expCollected * 1.5
      - this.state.runStats.damageTaken * 1.2,
    ));
  }

  private createInitialState(): SimulationState {
    return {
      timeMs: 0,
      spawnAccumulatorMs: 0,
      nextEnemyId: 1,
      nextPickupId: 1,
      player: {
        x: this.config.worldBounds.width / 2,
        y: this.config.worldBounds.height / 2,
        currentHp: this.config.characterId === 'priest' ? 92 : 100,
        maxHp: this.config.characterId === 'priest' ? 92 : 100,
        level: 1,
        exp: 0,
        expToNextLevel: 8,
        radius: 16,
        moveSpeed: this.config.characterId === 'priest' ? 148 : 155,
        pickupRange: 58,
      },
      enemies: [],
      pickups: [],
      weapon: {
        weaponId: 'prototype_bolt',
        cooldownMs: this.config.characterId === 'priest' ? 760 : 700,
        cooldownRemainingMs: 0,
        damage: this.config.characterId === 'priest' ? 23 : 25,
        range: 235,
        hitsPerAttack: 1,
      },
      runStats: {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        expCollected: 0,
        levelsGained: 0,
        pickupsCollected: 0,
        enemiesSpawned: 0,
      },
    };
  }

  private spawnEnemies(deltaMs: number): void {
    const elapsedSeconds = this.state.timeMs / 1000;
    const difficulty = this.getDifficultyMultiplier();
    const spawnInterval = Math.max(180, (950 - elapsedSeconds * 1.55) / difficulty);

    this.state.spawnAccumulatorMs += deltaMs;

    while (this.state.spawnAccumulatorMs >= spawnInterval) {
      this.state.spawnAccumulatorMs -= spawnInterval;
      this.state.enemies.push(this.createEnemy(elapsedSeconds));
      this.state.runStats.enemiesSpawned += 1;
    }
  }

  private createEnemy(elapsedSeconds: number): SimEnemyState {
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

    const difficulty = this.getDifficultyMultiplier();

    return {
      id: this.state.nextEnemyId++,
      x,
      y,
      currentHp: (34 + elapsedSeconds * 0.045) * difficulty,
      maxHp: (34 + elapsedSeconds * 0.045) * difficulty,
      radius: 14,
      moveSpeed: (55 + Math.min(30, elapsedSeconds * 0.045)) * Math.sqrt(difficulty),
      damagePerSecond: 11 * difficulty,
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
    const profile = this.config.strategyProfile.movement;
    const nearest = this.getNearestEnemy();
    const enemyCenter = this.getEnemyCenter();
    const pickupTarget = this.getBestPickupTarget();
    const direction = { x: 0, y: 0 };

    if (nearest) {
      const toPlayer = normalize({ x: player.x - nearest.x, y: player.y - nearest.y });
      const distance = distanceBetween(player, nearest);
      const dangerRatio = clamp01((170 - distance) / 170);
      const survivalWeight = profile.survivalBias / 50;

      direction.x += toPlayer.x * dangerRatio * survivalWeight;
      direction.y += toPlayer.y * dangerRatio * survivalWeight;
    }

    if (enemyCenter.count > 0) {
      const fromCenter = normalize({ x: player.x - enemyCenter.x, y: player.y - enemyCenter.y });
      const tangent = { x: -fromCenter.y, y: fromCenter.x };
      const centerDistance = distanceBetween(player, enemyCenter);
      const desiredDistance = 230;
      const combatWeight = profile.combatBias / 70;
      const loopWeight = profile.loopBias / 70;
      const overKiteWeight = profile.overKitePenalty / 70;

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
      const farmWeight = profile.farmBias / 85;

      direction.x += toPickup.x * farmWeight;
      direction.y += toPickup.y * farmWeight;
    }

    const inward = this.getBoundaryInwardDirection();
    direction.x += inward.x * 0.9;
    direction.y += inward.y * 0.9;

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
      this.state.pickups.push({
        id: this.state.nextPickupId++,
        x: enemy.x,
        y: enemy.y,
        exp: 1 + Math.floor(this.state.timeMs / 90000),
        radius: 8,
      });
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
      this.state.weapon.damage += 3.4;
      this.state.weapon.range += 2.2;
      this.state.weapon.cooldownMs = Math.max(360, this.state.weapon.cooldownMs - 12);

      if (player.level === 4 || player.level === 8 || player.level === 12) {
        this.state.weapon.hitsPerAttack += 1;
      }

      this.state.runStats.levelsGained += 1;
    }
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

      if (distanceToPickup < 120) {
        return false;
      }
    }

    return true;
  }

  private getBoundaryInwardDirection(): SimVector2 {
    const margin = 120;
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

  private getDifficultyMultiplier(): number {
    if (this.config.difficultyId === 'hard') {
      return 1.25;
    }

    if (this.config.difficultyId === 'easy') {
      return 0.82;
    }

    return 1;
  }
}

export function stableProfileHash(profile: unknown): string {
  const text = stableStringify(profile);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
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
