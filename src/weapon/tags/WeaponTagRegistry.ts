import { BUILT_IN_WEAPON_TAGS, BuiltInWeaponTag, WeaponTag } from './WeaponTag';

export class WeaponTagRegistry {
  private static readonly builtInTags = new Set<string>(BUILT_IN_WEAPON_TAGS);

  static listBuiltInTags(): readonly BuiltInWeaponTag[] {
    return BUILT_IN_WEAPON_TAGS;
  }

  static isBuiltInTag(tag: string): tag is BuiltInWeaponTag {
    return this.builtInTags.has(tag);
  }

  static normalizeTags(tags: readonly WeaponTag[] | undefined): WeaponTag[] {
    const normalized: WeaponTag[] = [];
    const seen = new Set<string>();

    for (const tag of tags ?? []) {
      const normalizedTag = tag.trim();

      if (!normalizedTag || seen.has(normalizedTag)) {
        continue;
      }

      if (!this.isBuiltInTag(normalizedTag)) {
        console.warn(`Unknown weapon tag accepted as custom tag: ${normalizedTag}`);
      }

      seen.add(normalizedTag);
      normalized.push(normalizedTag);
    }

    return normalized;
  }
}
