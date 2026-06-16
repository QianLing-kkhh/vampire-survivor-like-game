import Phaser from 'phaser';

import { MapMechanicVisualRenderer } from '../../world/MapMechanicVisualRenderer';

import { MapInteractable } from './MapInteractable';
import { MapMechanicContext } from './MapMechanicContext';
import { MapAltarDefinition } from './MapMechanicDefinition';

export class MapAltar implements MapInteractable {
  readonly id: string;
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly range: Phaser.GameObjects.Arc;
  private readonly progress: Phaser.GameObjects.Arc;
  private readonly core?: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  private chargeMs = 0;
  private cooldownMs = 0;

  constructor(
    private readonly context: MapMechanicContext,
    private readonly definition: MapAltarDefinition,
  ) {
    this.id = definition.id;
    const visual = MapMechanicVisualRenderer.renderAltar(context, definition);

    this.objects.push(...visual.objects);
    this.range = visual.range;
    this.progress = visual.progress;
    this.core = visual.core;
    this.updateVisuals(false);
  }

  update(deltaMs: number): void {
    const effectiveDelta = Math.max(0, deltaMs);

    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - effectiveDelta);
      this.chargeMs = 0;
      this.updateVisuals(false);
      return;
    }

    const player = this.context.player;
    const inRange = Phaser.Math.Distance.Between(
      player.body.x,
      player.body.y,
      this.definition.x,
      this.definition.y,
    ) <= this.definition.radius;

    if (!inRange) {
      this.chargeMs = 0;
      this.updateVisuals(false);
      return;
    }

    this.chargeMs += effectiveDelta;
    this.updateVisuals(true);

    if (this.chargeMs < Math.max(1, this.definition.chargeMs)) {
      return;
    }

    this.triggerHeal();
    this.chargeMs = 0;
    this.cooldownMs = Math.max(0, this.definition.cooldownMs);
    this.updateVisuals(false);
  }

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }

    this.objects.length = 0;
  }

  private triggerHeal(): void {
    const health = this.context.playerHealth;

    if (!health) {
      return;
    }

    const healedAmount = health.healLostHpRatio(
      Phaser.Math.Clamp(this.definition.healLostHpRatio, 0, 1),
    );

    if (healedAmount <= 0) {
      return;
    }

    this.context.floatingTextManager?.showPlayerHeal(
      this.context.player.body.x,
      this.context.player.body.y,
      healedAmount,
    );
  }

  private updateVisuals(inRange: boolean): void {
    const chargeRatio = this.cooldownMs > 0
      ? 0
      : Phaser.Math.Clamp(this.chargeMs / Math.max(1, this.definition.chargeMs), 0, 1);
    const cooldownActive = this.cooldownMs > 0;

    this.range.setAlpha(cooldownActive ? 0.03 : inRange ? 0.16 : 0.08);
    this.progress.setAlpha(cooldownActive ? 0 : 0.2 + chargeRatio * 0.55);
    this.progress.setScale(0.88 + chargeRatio * 0.18);
    this.progress.setStrokeStyle(4, 0xfacc15, cooldownActive ? 0 : 0.18 + chargeRatio * 0.62);
    this.core?.setAlpha(cooldownActive ? 0.45 : 0.9 + Math.sin(this.context.scene.time.now * 0.006) * 0.08);
  }
}
