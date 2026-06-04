import { WeaponBehavior } from './WeaponBehavior';
import { ProjectileBehaviorConfig } from './WeaponBehaviorConfig';

export class ProjectileBehavior implements WeaponBehavior {
  readonly type = 'projectile' as const;

  constructor(readonly config: ProjectileBehaviorConfig) {}
}
