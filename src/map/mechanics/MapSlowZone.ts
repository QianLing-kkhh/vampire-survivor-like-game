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
  private readonly visual: Phaser.GameObjects.Graphics;

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

  private render(): Phaser.GameObjects.Graphics {
    const visual = this.context.scene.add.graphics();

    visual.setDepth(-86);

    switch (this.definition.visualType) {
      case 'river':
        this.renderRiverVisual(visual);
        break;
      case 'mud':
        this.renderMudVisual(visual);
        break;
      case 'swamp':
      default:
        this.renderSwampVisual(visual);
        break;
    }

    return visual;
  }

  private renderRiverVisual(graphics: Phaser.GameObjects.Graphics): void {
    if (this.shape === 'circle') {
      this.renderSwampVisual(graphics);
      return;
    }

    const x = this.definition.x;
    const y = this.definition.y;
    const width = this.getEdgeExtendedWidth();
    const height = this.height;
    const left = x - width / 2;
    const top = y - height / 2;
    const bankPad = 34;
    const bankRadius = Math.min(120, height / 2 + bankPad);
    const waterRadius = Math.min(96, height / 2);

    graphics.fillStyle(0x153525, 0.42);
    graphics.fillRoundedRect(
      left - bankPad,
      top - bankPad,
      width + bankPad * 2,
      height + bankPad * 2,
      bankRadius,
    );
    graphics.fillStyle(0x3b2f1f, 0.26);
    graphics.fillRoundedRect(
      left - bankPad / 2,
      top - bankPad / 2,
      width + bankPad,
      height + bankPad,
      bankRadius * 0.8,
    );
    graphics.fillStyle(0x1f6f78, 0.56);
    graphics.fillRoundedRect(left, top, width, height, waterRadius);
    graphics.fillStyle(0x2a8c91, 0.22);
    graphics.fillRoundedRect(left + 18, top + 22, width - 36, height - 44, waterRadius * 0.72);

    graphics.lineStyle(3, 0x9be7dc, 0.25);
    const rippleCount = Math.max(4, Math.min(8, Math.round(width / 360)));

    for (let index = 0; index < rippleCount; index += 1) {
      const progress = (index + 0.5) / rippleCount;
      const rippleX = left + width * progress;
      const rippleY = top + height * (0.28 + (index % 3) * 0.18);
      const rippleWidth = Math.min(190, width / 5);

      graphics.lineBetween(
        rippleX - rippleWidth / 2,
        rippleY + (index % 2) * 8,
        rippleX + rippleWidth / 2,
        rippleY - 18,
      );
    }
  }

  private renderSwampVisual(graphics: Phaser.GameObjects.Graphics): void {
    if (this.shape !== 'circle') {
      this.renderSoftRectTerrain(graphics, {
        bankColor: 0x102d21,
        fillColor: 0x1f5f46,
        accentColor: 0x78d59b,
      });
      return;
    }

    const x = this.definition.x;
    const y = this.definition.y;

    graphics.fillStyle(0x0f2f24, 0.44);
    graphics.fillCircle(x, y, this.radius + 26);
    graphics.fillStyle(0x1f5f46, 0.46);
    graphics.fillCircle(x, y, this.radius);
    graphics.fillStyle(0x2f7d5f, 0.2);
    graphics.fillCircle(x - this.radius * 0.18, y + this.radius * 0.08, this.radius * 0.72);
    graphics.lineStyle(2, 0x8fe7a5, 0.22);

    for (let index = 0; index < 5; index += 1) {
      const angle = (Math.PI * 2 * index) / 5;
      const rippleX = x + Math.cos(angle) * this.radius * 0.42;
      const rippleY = y + Math.sin(angle) * this.radius * 0.3;

      graphics.strokeCircle(rippleX, rippleY, 18 + index * 4);
    }
  }

  private renderMudVisual(graphics: Phaser.GameObjects.Graphics): void {
    this.renderSoftRectTerrain(graphics, {
      bankColor: 0x3b2614,
      fillColor: 0x6b4a24,
      accentColor: 0xc0843f,
    });
  }

  private renderSoftRectTerrain(
    graphics: Phaser.GameObjects.Graphics,
    colors: { bankColor: number; fillColor: number; accentColor: number },
  ): void {
    const x = this.definition.x;
    const y = this.definition.y;
    const width = this.width;
    const height = this.height;
    const left = x - width / 2;
    const top = y - height / 2;
    const radius = Math.min(80, height / 2);

    graphics.fillStyle(colors.bankColor, 0.34);
    graphics.fillRoundedRect(left - 20, top - 20, width + 40, height + 40, radius + 20);
    graphics.fillStyle(colors.fillColor, 0.34);
    graphics.fillRoundedRect(left, top, width, height, radius);
    graphics.fillStyle(colors.accentColor, 0.18);

    for (let index = 0; index < 8; index += 1) {
      const dotX = left + width * ((index + 1) / 9);
      const dotY = top + height * (0.28 + (index % 3) * 0.2);

      graphics.fillCircle(dotX, dotY, 8 + (index % 3) * 4);
    }
  }

  private getEdgeExtendedWidth(): number {
    const left = this.definition.x - this.width / 2;
    const right = this.definition.x + this.width / 2;
    let width = this.width;

    if (left <= 80) {
      width += 240;
    }

    if (right >= this.context.worldWidth - 80) {
      width += 240;
    }

    return width;
  }
}
