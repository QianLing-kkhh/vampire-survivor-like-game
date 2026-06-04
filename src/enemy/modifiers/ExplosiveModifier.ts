import { EnemyModifier, EnemyModifierDeathContext } from './EnemyModifier';
import { ExplosiveModifierConfig } from './EnemyModifierConfig';

export class ExplosiveModifier implements EnemyModifier {
  readonly type = 'explosive' as const;

  private readonly explosionRadius: number;

  constructor(config: ExplosiveModifierConfig) {
    this.explosionRadius = Math.max(0, config.explosionRadius ?? 90);
  }

  onDeath(context: EnemyModifierDeathContext): void {
    if (this.explosionRadius <= 0) {
      return;
    }

    const visual = context.scene.add.circle(
      context.enemy.body.x,
      context.enemy.body.y,
      this.explosionRadius,
      0xf97316,
      0.16,
    );

    visual.setStrokeStyle(2, 0xfb923c, 0.65);
    visual.setDepth(28);
    context.scene.tweens.add({
      targets: visual,
      alpha: 0,
      scaleX: 1.16,
      scaleY: 1.16,
      duration: 180,
      onComplete: () => {
        if (visual.active) {
          visual.destroy();
        }
      },
    });
  }

  getDisplayTags(): string[] {
    return ['Explosive'];
  }
}
