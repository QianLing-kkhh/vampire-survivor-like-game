import { WeaponBehavior } from './WeaponBehavior';
import { OrbitBehaviorConfig } from './WeaponBehaviorConfig';

export class OrbitBehavior implements WeaponBehavior {
  readonly type = 'orbit' as const;

  constructor(readonly config: OrbitBehaviorConfig) {}
}
