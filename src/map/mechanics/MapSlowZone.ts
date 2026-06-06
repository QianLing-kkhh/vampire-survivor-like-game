import Phaser from 'phaser';

import { Enemy } from '../../enemy/Enemy';
import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';

import { MapMechanicContext } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapSlowZoneDefinition } from './MapMechanicDefinition';
import type { AutoSlowZoneSnapshot } from '../../auto/AutoPlayer';

export class MapSlowZone implements MapInteractable {
  readonly id: string;
  private readonly shape: 'circle' | 'rect';
  private readonly width: number;
  private readonly height: number;
  private readonly radius: number;
  private readonly visuals: Phaser.GameObjects.GameObject[];

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapSlowZoneDefinition,
  ) {
    this.id = definition.id;
    this.shape = definition.shape ?? (definition.radius ? 'circle' : 'rect');
    this.radius = Math.max(1, definition.radius ?? Math.max(definition.width ?? 1, definition.height ?? 1) / 2);
    this.width = Math.max(1, definition.width ?? this.radius * 2);
    this.height = Math.max(1, definition.height ?? this.radius * 2);
    this.visuals = MapMechanicVisualRenderer.renderSlowZone(
      context,
      definition,
      this.shape,
      this.width,
      this.height,
      this.radius,
    );
  }

  update(): void {}

  destroy(): void {
    for (const visual of this.visuals) {
      visual.destroy();
    }
  }

  getPlayerSpeedMultiplierAt(x: number, y: number): number {
    return this.contains(x, y)
      ? Math.max(0, this.definition.playerSpeedMultiplier)
      : 1;
  }

  getEnemySpeedMultiplierAt(x: number, y: number, enemy: Enemy): number {
    if ((enemy.bossLike || enemy.id === 'boss' || enemy.id.startsWith('endless_'))
      && this.definition.affectsBossLike !== true) {
      return 1;
    }

    return this.contains(x, y)
      ? Math.max(0, this.definition.enemySpeedMultiplier)
      : 1;
  }

  getAutoSlowZoneSnapshot(): AutoSlowZoneSnapshot {
    return {
      id: this.id,
      x: this.definition.x,
      y: this.definition.y,
      width: this.width,
      height: this.height,
      radius: this.radius,
      shape: this.shape,
      playerSpeedMultiplier: Math.max(0, this.definition.playerSpeedMultiplier),
      enemySpeedMultiplier: Math.max(0, this.definition.enemySpeedMultiplier),
    };
  }

  private contains(x: number, y: number): boolean {
    if (this.shape === 'circle') {
      return Phaser.Math.Distance.Between(x, y, this.definition.x, this.definition.y) <= this.radius;
    }

    return (
      x >= this.definition.x - this.width / 2
      && x <= this.definition.x + this.width / 2
      && y >= this.definition.y - this.height / 2
      && y <= this.definition.y + this.height / 2
    );
  }

}
