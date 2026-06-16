import { ContentRegistry } from '../../content/ContentRegistry';
import type { WeaponTag } from '../../core/domain/WeaponTypes';
import { WeaponTagQuery } from '../../weapon/tags/WeaponTagQuery';
import { Mutator } from '../Mutator';
import { WeaponPoolMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class WeaponPoolMutator implements Mutator {
  readonly id: string;
  readonly type = 'weaponPool';

  constructor(private readonly config: WeaponPoolMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  filterWeaponPool(weaponIds: string[], _context: MutatorContext): string[] {
    const allowed = new Set(this.config.allowedWeaponIds);
    const banned = new Set(this.config.bannedWeaponIds);
    const requiredTags = (this.config.requiredTags ?? []) as WeaponTag[];
    const bannedTags = (this.config.bannedTags ?? []) as WeaponTag[];
    const weapons = ContentRegistry.listWeapons();

    return weaponIds.filter((weaponId) => {
      if (allowed.size > 0 && !allowed.has(weaponId)) {
        return false;
      }

      if (banned.has(weaponId)) {
        return false;
      }

      const weapon = weapons[weaponId];

      if (!weapon) {
        return false;
      }

      return WeaponTagQuery.hasAllTags(weapon.tags, requiredTags)
        && !WeaponTagQuery.hasAnyTag(weapon.tags, bannedTags);
    });
  }
}
