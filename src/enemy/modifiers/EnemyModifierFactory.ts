import { ExplosiveModifier } from './ExplosiveModifier';
import { FastModifier } from './FastModifier';
import { ShieldedModifier } from './ShieldedModifier';
import { SplitOnDeathModifier } from './SplitOnDeathModifier';
import { EnemyModifier } from './EnemyModifier';
import {
  EnemyModifierConfig,
  ExplosiveModifierConfig,
  FastModifierConfig,
  ShieldedModifierConfig,
  SplitOnDeathModifierConfig,
} from './EnemyModifierConfig';
import { EnemyModifierRegistry } from './EnemyModifierRegistry';

let builtinRegistered = false;

function registerBuiltinModifiers(): void {
  if (builtinRegistered) {
    return;
  }

  builtinRegistered = true;
  EnemyModifierRegistry.register('fast', (config) => new FastModifier(config as FastModifierConfig));
  EnemyModifierRegistry.register('shielded', (config) => new ShieldedModifier(config as ShieldedModifierConfig));
  EnemyModifierRegistry.register('explosive', (config) => new ExplosiveModifier(config as ExplosiveModifierConfig));
  EnemyModifierRegistry.register(
    'splitOnDeath',
    (config) => new SplitOnDeathModifier(config as SplitOnDeathModifierConfig),
  );
}

export class EnemyModifierFactory {
  static create(config: EnemyModifierConfig): EnemyModifier | null {
    registerBuiltinModifiers();
    const creator = EnemyModifierRegistry.get(config.type);

    if (!creator) {
      console.warn(`Unknown enemy modifier type skipped: ${config.type}`);
      return null;
    }

    return creator(config);
  }

  static createMany(configs: readonly EnemyModifierConfig[] = []): EnemyModifier[] {
    return configs
      .map((config) => EnemyModifierFactory.create(config))
      .filter((modifier): modifier is EnemyModifier => modifier !== null);
  }

  static isKnownType(type: string): boolean {
    registerBuiltinModifiers();
    return EnemyModifierRegistry.has(type);
  }
}
