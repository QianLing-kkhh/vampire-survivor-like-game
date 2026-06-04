import { ArcingBehavior } from './ArcingBehavior';
import { AuraBehavior } from './AuraBehavior';
import { HomingBehavior } from './HomingBehavior';
import { OrbitBehavior } from './OrbitBehavior';
import { ProjectileBehavior } from './ProjectileBehavior';
import { WeaponBehavior } from './WeaponBehavior';
import {
  ArcingBehaviorConfig,
  AuraBehaviorConfig,
  HomingBehaviorConfig,
  OrbitBehaviorConfig,
  ProjectileBehaviorConfig,
  WeaponBehaviorConfig,
  WeaponBehaviorType,
} from './WeaponBehaviorConfig';

type WeaponBehaviorCreator = (config: WeaponBehaviorConfig) => WeaponBehavior;

export class WeaponBehaviorRegistry {
  private static readonly creators = new Map<WeaponBehaviorType, WeaponBehaviorCreator>();
  private static builtInRegistered = false;

  static register(type: WeaponBehaviorType, creator: WeaponBehaviorCreator): void {
    this.creators.set(type, creator);
  }

  static get(type: WeaponBehaviorType): WeaponBehaviorCreator | undefined {
    this.ensureBuiltIns();
    return this.creators.get(type);
  }

  static isKnownType(type: string): type is WeaponBehaviorType {
    this.ensureBuiltIns();
    return this.creators.has(type as WeaponBehaviorType);
  }

  private static ensureBuiltIns(): void {
    if (this.builtInRegistered) {
      return;
    }

    this.builtInRegistered = true;
    this.register('projectile', (config) => new ProjectileBehavior(config as ProjectileBehaviorConfig));
    this.register('aura', (config) => new AuraBehavior(config as AuraBehaviorConfig));
    this.register('orbit', (config) => new OrbitBehavior(config as OrbitBehaviorConfig));
    this.register('arcing', (config) => new ArcingBehavior(config as ArcingBehaviorConfig));
    this.register('homing', (config) => new HomingBehavior(config as HomingBehaviorConfig));
  }
}
