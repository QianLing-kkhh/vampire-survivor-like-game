import Phaser from 'phaser';

import { ShadowFactory } from '../../visual/ShadowFactory';
import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';

import { MapMechanicContext, MapMechanicEntity } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapObstacleDefinition } from './MapMechanicDefinition';
import type { AutoObstacleSnapshot } from '../../auto/AutoPlayer';

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

  isProjectilePathBlocked(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius: number,
  ): boolean {
    if (!this.blocksPlayer && !this.blocksEnemies) {
      return false;
    }

    return this.shape === 'circle'
      ? this.isProjectilePathBlockedByCircle(startX, startY, endX, endY, projectileRadius)
      : this.isProjectilePathBlockedByRect(startX, startY, endX, endY, projectileRadius);
  }

  getAutoObstacleSnapshot(): AutoObstacleSnapshot {
    return {
      id: this.id,
      x: this.definition.x,
      y: this.definition.y,
      width: this.width,
      height: this.height,
      shape: this.shape,
      blocksPlayer: this.blocksPlayer,
    };
  }

  private resolveCollision(entity: MapMechanicEntity): boolean {
    return this.shape === 'circle'
      ? this.resolveCircleCollision(entity)
      : this.resolveRectCollision(entity);
  }

  private isProjectilePathBlockedByCircle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius: number,
  ): boolean {
    const obstacleRadius = Math.max(this.width, this.height) / 2;

    return this.getDistanceToSegment(
      this.definition.x,
      this.definition.y,
      startX,
      startY,
      endX,
      endY,
    ) <= obstacleRadius + projectileRadius;
  }

  private isProjectilePathBlockedByRect(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    projectileRadius: number,
  ): boolean {
    const halfWidth = this.width / 2 + projectileRadius;
    const halfHeight = this.height / 2 + projectileRadius;
    const left = this.definition.x - halfWidth;
    const right = this.definition.x + halfWidth;
    const top = this.definition.y - halfHeight;
    const bottom = this.definition.y + halfHeight;

    return this.isPointInRect(startX, startY, left, right, top, bottom)
      || this.isPointInRect(endX, endY, left, right, top, bottom)
      || this.doesSegmentIntersectRect(startX, startY, endX, endY, left, right, top, bottom);
  }

  private isPointInRect(
    x: number,
    y: number,
    left: number,
    right: number,
    top: number,
    bottom: number,
  ): boolean {
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  private doesSegmentIntersectRect(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    left: number,
    right: number,
    top: number,
    bottom: number,
  ): boolean {
    return this.doSegmentsIntersect(startX, startY, endX, endY, left, top, right, top)
      || this.doSegmentsIntersect(startX, startY, endX, endY, right, top, right, bottom)
      || this.doSegmentsIntersect(startX, startY, endX, endY, right, bottom, left, bottom)
      || this.doSegmentsIntersect(startX, startY, endX, endY, left, bottom, left, top);
  }

  private doSegmentsIntersect(
    aX: number,
    aY: number,
    bX: number,
    bY: number,
    cX: number,
    cY: number,
    dX: number,
    dY: number,
  ): boolean {
    const orientationA = this.getOrientation(aX, aY, bX, bY, cX, cY);
    const orientationB = this.getOrientation(aX, aY, bX, bY, dX, dY);
    const orientationC = this.getOrientation(cX, cY, dX, dY, aX, aY);
    const orientationD = this.getOrientation(cX, cY, dX, dY, bX, bY);

    if (orientationA === 0 && this.isPointOnSegment(cX, cY, aX, aY, bX, bY)) {
      return true;
    }

    if (orientationB === 0 && this.isPointOnSegment(dX, dY, aX, aY, bX, bY)) {
      return true;
    }

    if (orientationC === 0 && this.isPointOnSegment(aX, aY, cX, cY, dX, dY)) {
      return true;
    }

    if (orientationD === 0 && this.isPointOnSegment(bX, bY, cX, cY, dX, dY)) {
      return true;
    }

    return orientationA !== orientationB && orientationC !== orientationD;
  }

  private getOrientation(
    aX: number,
    aY: number,
    bX: number,
    bY: number,
    cX: number,
    cY: number,
  ): number {
    const value = (bY - aY) * (cX - bX) - (bX - aX) * (cY - bY);

    if (Math.abs(value) < 0.0001) {
      return 0;
    }

    return value > 0 ? 1 : 2;
  }

  private isPointOnSegment(
    pointX: number,
    pointY: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean {
    return pointX <= Math.max(startX, endX)
      && pointX >= Math.min(startX, endX)
      && pointY <= Math.max(startY, endY)
      && pointY >= Math.min(startY, endY);
  }

  private getDistanceToSegment(
    pointX: number,
    pointY: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): number {
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSq === 0) {
      return Phaser.Math.Distance.Between(pointX, pointY, startX, startY);
    }

    const projectedPosition = Phaser.Math.Clamp(
      ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSq,
      0,
      1,
    );
    const closestX = startX + segmentX * projectedPosition;
    const closestY = startY + segmentY * projectedPosition;

    return Phaser.Math.Distance.Between(pointX, pointY, closestX, closestY);
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
