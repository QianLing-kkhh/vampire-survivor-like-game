import Phaser from 'phaser';

import { PlayerController } from '../../player/PlayerController';
import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';

import { MapMechanicContext } from './MapMechanicContext';
import { MapInteractable } from './MapInteractable';
import { MapPortalDefinition } from './MapMechanicDefinition';

export class MapPortal implements MapInteractable {
  readonly id: string;
  private target?: MapPortal;
  private disabled = false;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapPortalDefinition,
  ) {
    this.id = definition.id;
    this.render();
  }

  get x(): number {
    return this.definition.x;
  }

  get y(): number {
    return this.definition.y;
  }

  get radius(): number {
    return this.definition.radius;
  }

  get cooldownMs(): number {
    return this.definition.cooldownMs;
  }

  setTarget(target: MapPortal | undefined): void {
    this.target = target;

    if (!target) {
      this.disabled = true;
      console.warn(`Map portal ${this.id} target not found: ${this.definition.targetPortalId}`);
    }
  }

  update(deltaMs: number): void {
    const ring = this.objects[1] as (Phaser.GameObjects.Arc | Phaser.GameObjects.Image) | undefined;

    if (!ring?.active) {
      return;
    }

    ring.rotation += deltaMs * 0.002;
    ring.setAlpha?.(0.72 + Math.sin(this.context.scene.time.now * 0.006) * 0.18);
  }

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }

    this.objects.length = 0;
  }

  tryTeleportPlayer(player: PlayerController): boolean {
    if (this.disabled || !this.target) {
      return false;
    }

    const distance = Phaser.Math.Distance.Between(
      player.body.x,
      player.body.y,
      this.definition.x,
      this.definition.y,
    );

    if (distance > this.definition.radius) {
      return false;
    }

    player.setPosition(this.target.x, this.target.y);
    player.stopMovement();
    return true;
  }

  private render(): void {
    this.objects.push(
      ...MapMechanicVisualRenderer.renderPortal(this.context, this.definition),
    );
  }
}
