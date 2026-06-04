import Phaser from 'phaser';

import { ContentBootstrap } from '../content/ContentBootstrap';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';
import { ContentRegistry } from '../content/ContentRegistry';
import { Enemy } from '../enemy/Enemy';
import { EnemyFactory } from '../enemy/EnemyFactory';
import { Position } from '../enemy/EnemyMovement';
import { EnemyModifierConfig } from '../enemy/modifiers/EnemyModifierConfig';
import { SpawnWave } from './SpawnWave';

interface ActiveWave {
  wave: SpawnWave;
  spawnedCount: number;
  elapsedSinceSpawn: number;
}

export class SpawnDirector {
  private static readonly SAFE_SPAWN_RADIUS = 500;
  private static readonly SPAWN_MARGIN = 100;
  private static readonly MAX_SPAWN_ATTEMPTS = 20;

  private readonly pendingWaves: SpawnWave[];
  private readonly activeWaves: ActiveWave[] = [];
  private spawnCount = 0;

  constructor(
    waves: readonly SpawnWave[],
    private readonly enemyFactory: EnemyFactory,
    private readonly getPlayerPosition: () => Position,
    private readonly getWorldSize: () => { width: number; height: number },
    private readonly onEnemySpawned: (enemy: Enemy) => void,
  ) {
    ContentBootstrap.ensureInitialized();
    this.pendingWaves = [...waves].sort((a, b) => a.time - b.time);
  }

  static createDefault(
    enemyFactory: EnemyFactory,
    getPlayerPosition: () => Position,
    getWorldSize: () => { width: number; height: number },
    onEnemySpawned: (enemy: Enemy) => void,
  ): SpawnDirector {
    ContentBootstrap.ensureInitialized();
    return new SpawnDirector(
      ContentRegistry.getWaveSet(DEFAULT_CONTENT_IDS.waveSet) ?? [],
      enemyFactory,
      getPlayerPosition,
      getWorldSize,
      onEnemySpawned,
    );
  }

  update(gameTimeSeconds: number, deltaMs: number): void {
    this.activateReadyWaves(gameTimeSeconds);
    this.updateActiveWaves(deltaMs);
  }

  private activateReadyWaves(gameTimeSeconds: number): void {
    while (this.pendingWaves.length > 0 && this.pendingWaves[0].time <= gameTimeSeconds) {
      const wave = this.pendingWaves.shift();

      if (!wave) {
        return;
      }

      this.activeWaves.push({
        wave,
        spawnedCount: 0,
        elapsedSinceSpawn: wave.interval * 1000,
      });
    }
  }

  private updateActiveWaves(deltaMs: number): void {
    for (const activeWave of this.activeWaves) {
      activeWave.elapsedSinceSpawn += deltaMs;

      while (
        activeWave.spawnedCount < activeWave.wave.count
        && activeWave.elapsedSinceSpawn >= activeWave.wave.interval * 1000
      ) {
        activeWave.elapsedSinceSpawn -= activeWave.wave.interval * 1000;
        activeWave.spawnedCount += 1;
        this.spawnEnemy(
          activeWave.wave.enemy,
          (activeWave.wave as SpawnWave & { modifiers?: EnemyModifierConfig[] }).modifiers,
        );
      }
    }

    for (let index = this.activeWaves.length - 1; index >= 0; index -= 1) {
      if (this.activeWaves[index].spawnedCount < this.activeWaves[index].wave.count) {
        continue;
      }

      this.activeWaves.splice(index, 1);
    }
  }

  private spawnEnemy(enemyId: string, modifiers?: EnemyModifierConfig[]): void {
    const position = this.getSpawnPosition();
    const enemy = this.enemyFactory.create(enemyId, position.x, position.y, { modifiers });

    this.onEnemySpawned(enemy);
  }

  private getSpawnPosition(): Position {
    const playerPosition = this.getPlayerPosition();
    const worldBounds = this.getWorldBounds();
    const cameraView = this.getCameraWorldView();

    this.spawnCount += 1;

    for (let attempt = 0; attempt < SpawnDirector.MAX_SPAWN_ATTEMPTS; attempt += 1) {
      const position = cameraView
        ? this.getCameraEdgeSpawnPosition(cameraView, worldBounds, attempt)
        : this.getBoundarySpawnPosition(worldBounds, attempt);

      if (this.isSafeSpawnPosition(position, playerPosition)) {
        return position;
      }
    }

    return this.getFarthestBoundaryPosition(worldBounds, playerPosition);
  }

  private getCameraEdgeSpawnPosition(
    cameraView: Phaser.Geom.Rectangle,
    worldBounds: Phaser.Geom.Rectangle,
    attempt: number,
  ): Position {
    const side = (this.spawnCount + attempt) % 4;
    const margin = SpawnDirector.SPAWN_MARGIN;
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

    return this.clampToWorldBounds({ x, y }, worldBounds);
  }

  private getBoundarySpawnPosition(
    worldBounds: Phaser.Geom.Rectangle,
    attempt: number,
  ): Position {
    const side = (this.spawnCount + attempt) % 4;
    let x = worldBounds.centerX;
    let y = worldBounds.centerY;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(worldBounds.left, worldBounds.right);
        y = worldBounds.top;
        break;
      case 1:
        x = worldBounds.right;
        y = Phaser.Math.Between(worldBounds.top, worldBounds.bottom);
        break;
      case 2:
        x = Phaser.Math.Between(worldBounds.left, worldBounds.right);
        y = worldBounds.bottom;
        break;
      default:
        x = worldBounds.left;
        y = Phaser.Math.Between(worldBounds.top, worldBounds.bottom);
        break;
    }

    return { x, y };
  }

  private isSafeSpawnPosition(position: Position, playerPosition: Position): boolean {
    return Phaser.Math.Distance.Between(
      position.x,
      position.y,
      playerPosition.x,
      playerPosition.y,
    ) >= SpawnDirector.SAFE_SPAWN_RADIUS;
  }

  private getFarthestBoundaryPosition(
    worldBounds: Phaser.Geom.Rectangle,
    playerPosition: Position,
  ): Position {
    const candidates: Position[] = [
      { x: worldBounds.left, y: worldBounds.top },
      { x: worldBounds.centerX, y: worldBounds.top },
      { x: worldBounds.right, y: worldBounds.top },
      { x: worldBounds.right, y: worldBounds.centerY },
      { x: worldBounds.right, y: worldBounds.bottom },
      { x: worldBounds.centerX, y: worldBounds.bottom },
      { x: worldBounds.left, y: worldBounds.bottom },
      { x: worldBounds.left, y: worldBounds.centerY },
    ];
    let farthestPosition = candidates[0];
    let farthestDistance = -1;

    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        candidate.x,
        candidate.y,
        playerPosition.x,
        playerPosition.y,
      );

      if (distance <= farthestDistance) {
        continue;
      }

      farthestPosition = candidate;
      farthestDistance = distance;
    }

    return farthestPosition;
  }

  private clampToWorldBounds(
    position: Position,
    worldBounds: Phaser.Geom.Rectangle,
  ): Position {
    return {
      x: Phaser.Math.Clamp(position.x, worldBounds.left, worldBounds.right),
      y: Phaser.Math.Clamp(position.y, worldBounds.top, worldBounds.bottom),
    };
  }

  private getWorldBounds(): Phaser.Geom.Rectangle {
    const scene = this.getScene();
    const physicsBounds = scene?.physics.world.bounds;

    if (physicsBounds) {
      return new Phaser.Geom.Rectangle(
        physicsBounds.x,
        physicsBounds.y,
        physicsBounds.width,
        physicsBounds.height,
      );
    }

    const worldSize = this.getWorldSize();

    return new Phaser.Geom.Rectangle(0, 0, worldSize.width, worldSize.height);
  }

  private getCameraWorldView(): Phaser.Geom.Rectangle | undefined {
    const worldView = this.getScene()?.cameras.main.worldView;

    if (!worldView) {
      return undefined;
    }

    return new Phaser.Geom.Rectangle(
      worldView.x,
      worldView.y,
      worldView.width,
      worldView.height,
    );
  }

  private getScene(): Phaser.Scene | undefined {
    return (this.enemyFactory as unknown as { scene?: Phaser.Scene }).scene;
  }
}
