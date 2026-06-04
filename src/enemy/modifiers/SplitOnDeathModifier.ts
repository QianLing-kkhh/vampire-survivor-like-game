import { EnemyModifier, EnemyModifierDeathContext } from './EnemyModifier';
import { SplitOnDeathModifierConfig } from './EnemyModifierConfig';

export class SplitOnDeathModifier implements EnemyModifier {
  readonly type = 'splitOnDeath' as const;

  constructor(private readonly config: SplitOnDeathModifierConfig) {}

  onDeath(context: EnemyModifierDeathContext): void {
    if (!context.spawnEnemy) {
      return;
    }

    const count = Math.max(0, Math.floor(this.config.count));

    for (let index = 0; index < count; index += 1) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2;
      context.spawnEnemy(
        this.config.spawnEnemyId,
        context.enemy.body.x + Math.cos(angle) * 28,
        context.enemy.body.y + Math.sin(angle) * 28,
      );
    }
  }

  getDisplayTags(): string[] {
    return ['Split'];
  }
}
