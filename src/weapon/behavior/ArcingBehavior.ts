import { WeaponBehavior } from './WeaponBehavior';
import { ArcingBehaviorConfig } from './WeaponBehaviorConfig';

export class ArcingBehavior implements WeaponBehavior {
  readonly type = 'arcing' as const;

  constructor(readonly config: ArcingBehaviorConfig) {}
}
