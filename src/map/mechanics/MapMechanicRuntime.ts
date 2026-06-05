import { Enemy } from '../../enemy/Enemy';
import { PlayerController } from '../../player/PlayerController';

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
    this.playerPortalCooldownMs = Math.max(0, this.playerPortalCooldownMs - deltaMs);

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

  getPlayerSpeedMultiplierAt(x: number, y: number): number {
    return Math.max(
      MIN_SLOW_MULTIPLIER,
      this.slowZones.reduce(
        (multiplier, slowZone) => multiplier * slowZone.getPlayerSpeedMultiplierAt(x, y),
        1,
      ),
    );
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

  tryTeleportPlayer(player: PlayerController): boolean {
    if (this.playerPortalCooldownMs > 0) {
      return false;
    }

    const portal = this.portals.find((candidate) => candidate.tryTeleportPlayer(player));

    if (!portal) {
      return false;
    }

    this.playerPortalCooldownMs = Math.max(0, portal.cooldownMs);
    this.clampPlayer(player);
    return true;
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
