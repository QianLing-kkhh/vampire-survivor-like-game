import type { WeaponConfig } from '../../core/domain/WeaponTypes';
import { WeaponTag } from './WeaponTag';

export class WeaponTagQuery {
  static hasTag(tags: readonly WeaponTag[] | undefined, tag: WeaponTag): boolean {
    return (tags ?? []).includes(tag);
  }

  static hasAnyTag(tags: readonly WeaponTag[] | undefined, candidates: readonly WeaponTag[]): boolean {
    return candidates.some((tag) => this.hasTag(tags, tag));
  }

  static hasAllTags(tags: readonly WeaponTag[] | undefined, candidates: readonly WeaponTag[]): boolean {
    return candidates.every((tag) => this.hasTag(tags, tag));
  }

  static getWeaponsWithTag(
    weapons: Record<string, WeaponConfig>,
    tag: WeaponTag,
  ): string[] {
    return Object.entries(weapons)
      .filter(([, config]) => this.hasTag(config.tags, tag))
      .map(([weaponId]) => weaponId);
  }

  static getWeaponsMatchingTags(
    weapons: Record<string, WeaponConfig>,
    includeTags: readonly WeaponTag[] = [],
    excludeTags: readonly WeaponTag[] = [],
  ): string[] {
    return Object.entries(weapons)
      .filter(([, config]) => (
        this.hasAllTags(config.tags, includeTags)
        && !this.hasAnyTag(config.tags, excludeTags)
      ))
      .map(([weaponId]) => weaponId);
  }
}
