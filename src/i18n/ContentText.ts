import type { UpgradeOption } from '../progression/UpgradeOption';

import { I18n } from './I18n';

export function translateOrFallback(key: string | undefined, fallback: string): string {
  if (!key) {
    return fallback;
  }

  const translated = I18n.t(key);
  return translated === key ? fallback : translated;
}

export function formatContentId(id: string | undefined): string {
  if (!id) {
    return '?';
  }

  return id
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function getWeaponDisplayName(weaponId: string | undefined, fallback?: string): string {
  return translateOrFallback(`weapon.${weaponId}.name`, fallback ?? formatContentId(weaponId));
}

export function getWeaponDescription(weaponId: string | undefined, fallback = ''): string {
  return translateOrFallback(`weapon.${weaponId}.description`, fallback);
}

export function getPassiveDisplayName(passiveId: string | undefined, fallback?: string): string {
  return translateOrFallback(`passive.${passiveId}.name`, fallback ?? formatContentId(passiveId));
}

export function getPassiveDescription(passiveId: string | undefined, fallback = ''): string {
  return translateOrFallback(`passive.${passiveId}.description`, fallback);
}

export function getUpgradeDisplayName(option: Pick<UpgradeOption, 'id' | 'name'>): string {
  return translateOrFallback(`upgrade.${option.id}.name`, option.name);
}

export function getUpgradeDescription(option: Pick<UpgradeOption, 'id' | 'description'>): string {
  return translateOrFallback(`upgrade.${option.id}.description`, option.description);
}

export function getStatDisplayName(stat: string, fallback?: string): string {
  const weaponStat = I18n.t(`statsBuild.weaponStat.${stat}`);
  if (weaponStat !== `statsBuild.weaponStat.${stat}`) {
    return weaponStat;
  }

  return translateOrFallback(`statsBuild.${stat}`, fallback ?? formatContentId(stat));
}
