import { Mutator } from './Mutator';
import {
  BossTimingMutatorConfig,
  EnemyStatMutatorConfig,
  ExpRateMutatorConfig,
  MutatorConfig,
  SpawnRateMutatorConfig,
  TreasureRateMutatorConfig,
  WeaponPoolMutatorConfig,
} from './MutatorConfig';
import { BossTimingMutator } from './mutators/BossTimingMutator';
import { EnemyStatMutator } from './mutators/EnemyStatMutator';
import { ExpRateMutator } from './mutators/ExpRateMutator';
import { SpawnRateMutator } from './mutators/SpawnRateMutator';
import { TreasureRateMutator } from './mutators/TreasureRateMutator';
import { WeaponPoolMutator } from './mutators/WeaponPoolMutator';

type MutatorCreator = (config: MutatorConfig) => Mutator | null;

export class MutatorRegistry {
  private static readonly registry = new Map<string, MutatorCreator>();
  private static initialized = false;

  static register(type: string, factory: MutatorCreator): void {
    this.registry.set(type, factory);
  }

  static get(type: string): MutatorCreator | undefined {
    this.ensureBuiltInsRegistered();
    return this.registry.get(type);
  }

  static has(type: string): boolean {
    this.ensureBuiltInsRegistered();
    return this.registry.has(type);
  }

  static listTypes(): string[] {
    this.ensureBuiltInsRegistered();
    return Array.from(this.registry.keys());
  }

  private static ensureBuiltInsRegistered(): void {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    this.register('enemyStat', (config) => config.type === 'enemyStat'
      ? new EnemyStatMutator(config as EnemyStatMutatorConfig)
      : null);
    this.register('spawnRate', (config) => config.type === 'spawnRate'
      ? new SpawnRateMutator(config as SpawnRateMutatorConfig)
      : null);
    this.register('treasureRate', (config) => config.type === 'treasureRate'
      ? new TreasureRateMutator(config as TreasureRateMutatorConfig)
      : null);
    this.register('expRate', (config) => config.type === 'expRate'
      ? new ExpRateMutator(config as ExpRateMutatorConfig)
      : null);
    this.register('bossTiming', (config) => config.type === 'bossTiming'
      ? new BossTimingMutator(config as BossTimingMutatorConfig)
      : null);
    this.register('weaponPool', (config) => config.type === 'weaponPool'
      ? new WeaponPoolMutator(config as WeaponPoolMutatorConfig)
      : null);
  }
}
