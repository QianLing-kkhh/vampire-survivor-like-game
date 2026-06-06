import Phaser from 'phaser';

import { ShadowFactory } from '../../visual/ShadowFactory';
import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';

import { MapMechanicContext, MapMechanicEntity } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapObstacleDefinition } from './MapMechanicDefinition';

export class MapObstacle implements MapInteractable {
  readonly id: string;
  private readonly blocksPlayer: boolean;
  private readonly blocksEnemies: boolean;
  private readonly shape: 'circle' | 'rect';
  private readonly width: number;
  private readonly height: number;
  private readonly gameObjects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapObstacleDefinition,
  ) {
    this.id = definition.id;
    this.blocksPlayer = definition.blocksPlayer ?? true;
    this.blocksEnemies = definition.blocksEnemies ?? true;
    this.shape = definition.shape ?? 'rect';
    this.width = Math.max(1, definition.width);
    this.height = Math.max(1, definition.height);
    this.render();
  }

  update(): void {}

  destroy(): void {
    for (const object of this.gameObjects) {
      object.destroy();
    }

    this.gameObjects.length = 0;
  }

  resolvePlayerCollision(entity: MapMechanicEntity): boolean {
    return this.blocksPlayer && this.resolveCollision(entity);
  }

  resolveEnemyCollision(entity: MapMechanicEntity): boolean {
    if (!this.blocksEnemies || entity.bossLike === true || entity.id === 'boss') {
      return false;
    }

    return this.resolveCollision(entity);
  }

  private resolveCollision(entity: MapMechanicEntity): boolean {
    return this.shape === 'circle'
      ? this.resolveCircleCollision(entity)
      : this.resolveRectCollision(entity);
  }

  private resolveCircleCollision(entity: MapMechanicEntity): boolean {
    const obstacleRadius = Math.max(this.width, this.height) / 2;
    const entityRadius = this.getEntityRadius(entity);
    const offset = new Phaser.Math.Vector2(
      entity.body.x - this.definition.x,
      entity.body.y - this.definition.y,
    );
    const minDistance = obstacleRadius + entityRadius;
    const distance = offset.length();

    if (distance >= minDistance) {
      return false;
    }

    if (distance === 0) {
      offset.set(1, 0);
    } else {
      offset.normalize();
    }

    entity.body.x = this.definition.x + offset.x * minDistance;
    entity.body.y = this.definition.y + offset.y * minDistance;
    this.clampEntity(entity);
    return true;
  }

  private resolveRectCollision(entity: MapMechanicEntity): boolean {
    const entityRadius = this.getEntityRadius(entity);
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    const left = this.definition.x - halfWidth;
    const right = this.definition.x + halfWidth;
    const top = this.definition.y - halfHeight;
    const bottom = this.definition.y + halfHeight;
    const closestX = Phaser.Math.Clamp(entity.body.x, left, right);
    const closestY = Phaser.Math.Clamp(entity.body.y, top, bottom);
    const offset = new Phaser.Math.Vector2(
      entity.body.x - closestX,
      entity.body.y - closestY,
    );
    const distance = offset.length();

    if (distance >= entityRadius) {
      return false;
    }

    if (distance > 0) {
      offset.normalize().scale(entityRadius - distance);
      entity.body.x += offset.x;
      entity.body.y += offset.y;
    } else {
      this.pushOutFromRectInterior(entity, left, right, top, bottom, entityRadius);
    }

    this.clampEntity(entity);
    return true;
  }

  private pushOutFromRectInterior(
    entity: MapMechanicEntity,
    left: number,
    right: number,
    top: number,
    bottom: number,
    entityRadius: number,
  ): void {
    const distances = [
      { axis: 'x' as const, value: entity.body.x - left, target: left - entityRadius },
      { axis: 'x' as const, value: right - entity.body.x, target: right + entityRadius },
      { axis: 'y' as const, value: entity.body.y - top, target: top - entityRadius },
      { axis: 'y' as const, value: bottom - entity.body.y, target: bottom + entityRadius },
    ].sort((a, b) => a.value - b.value);
    const nearest = distances[0];

    if (nearest.axis === 'x') {
      entity.body.x = nearest.target;
    } else {
      entity.body.y = nearest.target;
    }
  }

  private render(): void {
    const visuals = MapMechanicVisualRenderer.renderObstacle(
      this.context,
      this.definition,
      this.shape,
      this.width,
      this.height,
    );

    this.gameObjects.push(...visuals);

    const primaryVisual = visuals[0];
    const shadow = primaryVisual instanceof Phaser.GameObjects.Image
      ? ShadowFactory.createShadow(this.context.scene, primaryVisual, 'landmark')
      : undefined;

    if (shadow) {
      this.gameObjects.push(shadow);
    }
  }

  private getEntityRadius(entity: MapMechanicEntity): number {
    return entity.body.radius ?? 12;
  }

  private clampEntity(entity: MapMechanicEntity): void {
    const radius = this.getEntityRadius(entity);

    entity.body.x = Phaser.Math.Clamp(entity.body.x, radius, this.context.worldWidth - radius);
    entity.body.y = Phaser.Math.Clamp(entity.body.y, radius, this.context.worldHeight - radius);
  }
}
