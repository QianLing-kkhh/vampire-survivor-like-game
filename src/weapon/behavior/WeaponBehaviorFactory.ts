import { WeaponBehavior } from './WeaponBehavior';
import { WeaponBehaviorConfig } from './WeaponBehaviorConfig';
import { WeaponBehaviorRegistry } from './WeaponBehaviorRegistry';

export class WeaponBehaviorFactory {
  static create(config: WeaponBehaviorConfig | undefined): WeaponBehavior | null {
    if (!config) {
      return null;
    }

    const creator = WeaponBehaviorRegistry.get(config.type);

    if (!creator) {
      console.warn(`Unknown weapon behavior type skipped: ${config.type}`);
      return null;
    }

    return creator(config);
  }
}
