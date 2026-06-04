import { WeaponBehavior } from './WeaponBehavior';
import { HomingBehaviorConfig } from './WeaponBehaviorConfig';

export class HomingBehavior implements WeaponBehavior {
  readonly type = 'homing' as const;

  constructor(readonly config: HomingBehaviorConfig) {}
}
