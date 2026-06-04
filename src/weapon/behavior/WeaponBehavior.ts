import { WeaponBehaviorConfig, WeaponBehaviorType } from './WeaponBehaviorConfig';

export interface WeaponBehavior {
  readonly type: WeaponBehaviorType;
  readonly config: WeaponBehaviorConfig;
}
