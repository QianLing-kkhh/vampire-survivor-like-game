import { WeaponBehavior } from './WeaponBehavior';
import { AuraBehaviorConfig } from './WeaponBehaviorConfig';

export class AuraBehavior implements WeaponBehavior {
  readonly type = 'aura' as const;

  constructor(readonly config: AuraBehaviorConfig) {}
}
