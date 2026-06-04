import { EnemyModifier } from './EnemyModifier';
import { EnemyModifierConfig, EnemyModifierType } from './EnemyModifierConfig';

type EnemyModifierCreator<TConfig extends EnemyModifierConfig = EnemyModifierConfig> = (
  config: TConfig,
) => EnemyModifier;

export class EnemyModifierRegistry {
  private static readonly creators = new Map<EnemyModifierType, EnemyModifierCreator>();

  static register<TConfig extends EnemyModifierConfig>(
    type: TConfig['type'],
    creator: EnemyModifierCreator<TConfig>,
  ): void {
    this.creators.set(type, creator as EnemyModifierCreator);
  }

  static get(type: EnemyModifierType): EnemyModifierCreator | undefined {
    return this.creators.get(type);
  }

  static has(type: string): type is EnemyModifierType {
    return this.creators.has(type as EnemyModifierType);
  }
}
