import Phaser from 'phaser';

import { MapMechanicContext } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapLightSourceDefinition } from './MapMechanicDefinition';

export class MapLightSource implements MapInteractable {
  readonly id: string;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapLightSourceDefinition,
  ) {
    this.id = definition.id;
    this.render();
  }

  update(): void {}

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }

    this.objects.length = 0;
  }

  private render(): void {
    const color = this.getColor();
    const glow = this.context.scene.add.circle(
      this.definition.x,
      this.definition.y,
      this.definition.radius,
      color,
      0.08 * (this.definition.intensity ?? 1),
    );
    const core = this.context.scene.add.circle(this.definition.x, this.definition.y, 16, color, 0.8);
    const post = this.context.scene.add.rectangle(
      this.definition.x,
      this.definition.y + 24,
      8,
      48,
      0x292524,
      0.95,
    );

    glow.setDepth(-64);
    post.setDepth(-63);
    core.setDepth(-62);
    this.objects.push(glow, post, core);
  }

  private getColor(): number {
    switch (this.definition.visualType) {
      case 'crystal':
        return 0x93c5fd;
      case 'torch':
        return 0xf97316;
      case 'lamp':
      default:
        return 0xfacc15;
    }
  }
}
