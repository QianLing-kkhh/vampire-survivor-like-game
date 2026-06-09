import { Enemy } from '../../enemy/Enemy';
import { PlayerController } from '../../player/PlayerController';
import type { AutoMapSnapshot } from '../../auto/AutoPlayerTypes';

import { MapInteractable } from './MapInteractable';
import { MapMechanicContext, MapMechanicEntity } from './MapMechanicContext';
import { MapMechanicDefinition } from './MapMechanicDefinition';
import { MapMechanicFactory } from './MapMechanicFactory';
import { MapObstacle } from './MapObstacle';
import { MapPortal } from './MapPortal';
import { MapSlowZone } from './MapSlowZone';

const MIN_SLOW_MULTIPLIER = 0.25;

export class MapMechanicRuntime {
  private readonly obstacles: MapObstacle[];
  private readonly slowZones: MapSlowZone[];
  private readonly portals: MapPortal[];
  private readonly interactables: MapInteractable[];
  private playerPortalCooldownMs = 0;
  private portalsVisible = true;
  private static readonly SLOW_EFFECT_THRESHOLD = 0.999;
  private static readonly PORTAL_GLOBAL_COOLDOWN_MS = 10000;

  constructor(
    definitions: readonly MapMechanicDefinition[] | undefined,
    private readonly context: MapMechanicContext,
  ) {
    const parts = MapMechanicFactory.createMany(definitions ?? [], context);

    this.interactables = parts.interactables;
    this.obstacles = parts.obstacles;
    this.slowZones = parts.slowZones;
    this.portals = parts.portals;
  }

  update(deltaMs: number): void {
    const wasCooldownActive = this.playerPortalCooldownMs > 0;
    this.playerPortalCooldownMs = Math.max(0, this.playerPortalCooldownMs - deltaMs);
    const isCooldownActive = this.playerPortalCooldownMs > 0;

    if (wasCooldownActive && !isCooldownActive) {
      this.setPortalsVisible(true);
    }

    for (const interactable of this.interactables) {
      interactable.update(deltaMs);
    }
  }

  destroy(): void {
    for (const interactable of this.interactables) {
      interactable.destroy();
    }
  }

  clear(): void {
    this.destroy();
  }

  getDebugStats(): {
    obstacleCount: number;
    slowZoneCount: number;
    portalCount: number;
    visualCount: number;
  } {
    return {
      obstacleCount: this.obstacles.length,
      slowZoneCount: this.slowZones.length,
      portalCount: this.portals.length,
      visualCount: this.interactables.length,
    };
  }

  getAutoMapSnapshot(): AutoMapSnapshot {
    const portalCooldownRemainingMs = Math.max(0, this.playerPortalCooldownMs);
    const arePortalsAvailable = this.portalsVisible && portalCooldownRemainingMs <= 0;

    return {
      obstacles: this.obstacles.map((obstacle) => obstacle.getAutoObstacleSnapshot()),
      slowZones: this.slowZones.map((slowZone) => slowZone.getAutoSlowZoneSnapshot()),
      portals: this.portals.map((portal) => ({
        ...portal.getAutoPortalSnapshot(),
        isAvailable: arePortalsAvailable,
        cooldownRemainingMs: portalCooldownRemainingMs,
      })),
    };
  }

  getPlayerSpeedMultiplierAt(x: number, y: number): number {
    return Math.max(
      MIN_SLOW_MULTIPLIER,
      this.slowZones.reduce(
        (multiplier, slowZone) => multiplier * slowZone.getPlayerSpeedMultiplierAt(x, y),
        1,
      ),
    );
  }

  getPlayerSlowState(x: number, y: number): {
    isSlowed: boolean;
    multiplier: number;
  } {
    const multiplier = this.getPlayerSpeedMultiplierAt(x, y);

    return {
      isSlowed: multiplier < MapMechanicRuntime.SLOW_EFFECT_THRESHOLD,
      multiplier,
    };
  }

  isPlayerInSlowZone(x: number, y: number): boolean {
    return this.getPlayerSlowState(x, y).isSlowed;
  }

  getPlayerSlowMultiplierAt(x: number, y: number): number {
    return this.getPlayerSlowState(x, y).multiplier;
  }

  getEnemySpeedMultiplierAt(x: number, y: number, enemy: Enemy): number {
    return Math.max(
      MIN_SLOW_MULTIPLIER,
      this.slowZones.reduce(
        (multiplier, slowZone) => multiplier * slowZone.getEnemySpeedMultiplierAt(x, y, enemy),
        1,
      ),
    );
  }

  getEnemySlowState(enemy: Enemy, x: number, y: number): {
    isSlowed: boolean;
    multiplier: number;
  } {
    const multiplier = this.getEnemySpeedMultiplierAt(x, y, enemy);

    return {
      isSlowed: multiplier < MapMechanicRuntime.SLOW_EFFECT_THRESHOLD,
      multiplier,
    };
  }

  isEnemyInSlowZone(enemy: Enemy, x: number, y: number): boolean {
    return this.getEnemySlowState(enemy, x, y).isSlowed;
  }

  getEnemySlowMultiplierAt(enemy: Enemy, x: number, y: number): number {
    return this.getEnemySlowState(enemy, x, y).multiplier;
  }

  resolveObstacleCollision(entity: MapMechanicEntity): boolean {
    return this.obstacles.some((obstacle) => obstacle.resolvePlayerCollision(entity));
  }

  resolvePlayerObstacleCollision(player: PlayerController): boolean {
    const resolved = this.obstacles.some((obstacle) => (
      obstacle.resolvePlayerCollision(player as unknown as MapMechanicEntity)
    ));

    if (resolved) {
      player.setPosition(player.body.x, player.body.y);
    }

    return resolved;
  }

  resolveEnemyObstacleCollision(enemy: Enemy): boolean {
    return this.obstacles.some((obstacle) => obstacle.resolveEnemyCollision(enemy));
  }

  isProjectilePathBlocked(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius = 8,
  ): boolean {
    return this.obstacles.some((obstacle) => obstacle.isProjectilePathBlocked(
      startX,
      startY,
      endX,
      endY,
      projectileRadius,
    ));
  }

  tryTeleportPlayer(player: PlayerController): boolean {
    if (this.playerPortalCooldownMs > 0) {
      return false;
    }

    const portal = this.portals.find((candidate) => candidate.tryTeleportPlayer(player));

    if (!portal) {
      return false;
    }

    this.playerPortalCooldownMs = MapMechanicRuntime.PORTAL_GLOBAL_COOLDOWN_MS;
    this.setPortalsVisible(false);
    this.clampPlayer(player);
    return true;
  }

  private setPortalsVisible(visible: boolean): void {
    if (this.portalsVisible === visible) {
      return;
    }

    this.portalsVisible = visible;
    for (const portal of this.portals) {
      portal.setVisible(visible);
    }
  }

  tryTeleportEnemy(): boolean {
    return false;
  }

  private clampPlayer(player: PlayerController): void {
    const radius = player.body.radius;

    player.setPosition(
      Math.min(Math.max(player.body.x, radius), this.context.worldWidth - radius),
      Math.min(Math.max(player.body.y, radius), this.context.worldHeight - radius),
    );
  }
}
