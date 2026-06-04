import { Mutator } from './Mutator';
import { MutatorConfig } from './MutatorConfig';
import { MutatorRegistry } from './MutatorRegistry';

export class MutatorFactory {
  static create(config: MutatorConfig): Mutator | null {
    if (config.enabled === false) {
      return null;
    }

    const factory = MutatorRegistry.get(config.type);

    if (!factory) {
      console.warn(`Unknown mutator type skipped: ${config.type}`);
      return null;
    }

    return factory(config);
  }

  static createMany(configs: readonly MutatorConfig[] | undefined): Mutator[] {
    return (configs ?? [])
      .map((config) => this.create(config))
      .filter((mutator): mutator is Mutator => mutator !== null);
  }

  static isKnownType(type: string): boolean {
    return MutatorRegistry.has(type);
  }
}
