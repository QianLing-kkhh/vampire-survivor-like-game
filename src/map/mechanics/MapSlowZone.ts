import Phaser from 'phaser';

import { Enemy } from '../../enemy/Enemy';

import { MapMechanicContext } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapSlowZoneDefinition } from './MapMechanicDefinition';

export class MapSlowZone implements MapInteractable {
  readonly id: string;
  private readonly shape: 'circle' | 'rect';
  private readonly width: number;
  private readonly height: number;
  private readonly radius: number;
  private readonly visual: Phaser.GameObjects.Shape;

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapSlowZoneDefinition,
  ) {
    this.id = definition.id;
    this.shape = definition.shape ?? (definition.radius ? 'circle' : 'rect');
    this.radius = Math.max(1, definition.radius ?? Math.max(definition.width ?? 1, definition.height ?? 1) / 2);
    this.width = Math.max(1, definition.width ?? this.radius * 2);
    this.height = Math.max(1, definition.height ?? this.radius * 2);
    this.visual = this.render();
  }

  update(): void {}

  destroy(): void {
    this.visual.destroy();
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

  private render(): Phaser.GameObjects.Shape {
    const { fill, stroke } = this.getColors();
    const visual = this.shape === 'circle'
      ? this.context.scene.add.circle(this.definition.x, this.definition.y, this.radius, fill, 0.24)
      : this.context.scene.add.rectangle(this.definition.x, this.definition.y, this.width, this.height, fill, 0.24);

    visual.setStrokeStyle(2, stroke, 0.34);
    visual.setDepth(-86);
    return visual;
  }

  private getColors(): { fill: number; stroke: number } {
    switch (this.definition.visualType) {
      case 'river':
        return { fill: 0x2563eb, stroke: 0x93c5fd };
      case 'mud':
        return { fill: 0x713f12, stroke: 0xd97706 };
      case 'swamp':
      default:
        return { fill: 0x166534, stroke: 0x86efac };
    }
  }
}
