import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';
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
    this.objects.push(
      ...MapMechanicVisualRenderer.renderLightSource(this.context, this.definition),
    );
  }
}
