import charactersData from '../../data/characters.json';
import passivesData from '../../data/passives.json';
import relicsData from '../../data/relics.json';
import weaponsData from '../../data/weapons.json';
import { I18n } from '../../i18n/I18n';
import { IconTooltipData, ResolvedIconTooltip } from './IconTooltipTypes';

type WeaponRecord = {
  type?: string;
  behavior?: {
    type?: string;
  };
};

type PassiveRecord = {
  id: string;
  name?: string;
};

type RelicRecord = {
  id: string;
  name?: string;
  description?: string;
  nameKey?: string;
  descriptionKey?: string;
};

type CharacterRecord = {
  id: string;
  nameKey?: string;
  descriptionKey?: string;
};

const WEAPON_BEHAVIOR_KEYS: Record<string, string> = {
  aura: 'help.weapon.behavior.aura',
  orbit: 'help.weapon.behavior.orbit',
  homing: 'help.weapon.behavior.homing',
  arcing: 'help.weapon.behavior.arcing',
  axe: 'help.weapon.behavior.axe',
  projectile: 'help.weapon.behavior.projectile',
};

const MAP_MECHANIC_DESCRIPTION_KEYS: Record<string, string> = {
  obstacle: 'help.map.mechanic.obstacle.description',
  slowZone: 'help.map.mechanic.slowZone.description',
  swamp: 'help.map.mechanic.slowZone.description',
  mud: 'help.map.mechanic.slowZone.description',
  river: 'help.map.mechanic.slowZone.description',
  portal: 'help.map.mechanic.portal.description',
  portalBlue: 'help.map.mechanic.portal.description',
  portalOrange: 'help.map.mechanic.portal.description',
  light: 'help.map.mechanic.lightSource.description',
  lightSource: 'help.map.mechanic.lightSource.description',
  hazard: 'help.map.mechanic.hazard.description',
  altar: 'help.map.mechanic.altar.description',
  spawner: 'help.map.mechanic.spawner.description',
  destructible: 'help.map.mechanic.destructible.description',
};

export class IconTooltipContentResolver {
  static resolve(data: IconTooltipData): ResolvedIconTooltip {
    switch (data.kind) {
      case 'weapon':
        return IconTooltipContentResolver.resolveWeapon(data);
      case 'passive':
        return IconTooltipContentResolver.resolvePassive(data);
      case 'relic':
        return IconTooltipContentResolver.resolveRelic(data);
      case 'character':
        return IconTooltipContentResolver.resolveCharacter(data);
      case 'mapMechanic':
        return IconTooltipContentResolver.resolveMapMechanic(data);
      case 'status':
        return {
          title: data.title ?? IconTooltipContentResolver.labelFromId(data.id),
          description: IconTooltipContentResolver.translateOrFallback(
            data.descriptionKey ?? `tooltip.status.${IconTooltipContentResolver.normalizeStatusId(data.id)}`,
            data.description ?? I18n.t('tooltip.mapMechanic.default'),
          ),
        };
      case 'generic':
      default:
        return {
          title: data.title ?? IconTooltipContentResolver.labelFromId(data.id),
          description: IconTooltipContentResolver.translateOrFallback(data.descriptionKey, data.description ?? ''),
        };
    }
  }

  private static resolveWeapon(data: IconTooltipData): ResolvedIconTooltip {
    const weapon = (weaponsData as Record<string, WeaponRecord>)[data.id];
    const behavior = weapon?.behavior?.type ?? weapon?.type;
    const descriptionKey = data.descriptionKey
      ?? (behavior ? WEAPON_BEHAVIOR_KEYS[behavior] : undefined)
      ?? 'help.weapon.behavior.default';

    return {
      title: data.title ?? IconTooltipContentResolver.labelFromId(data.id),
      description: IconTooltipContentResolver.translateOrFallback(descriptionKey, data.description ?? I18n.t('tooltip.weapon.default')),
    };
  }

  private static resolvePassive(data: IconTooltipData): ResolvedIconTooltip {
    const passive = (passivesData as PassiveRecord[]).find((entry) => entry.id === data.id);
    const descriptionKey = data.descriptionKey ?? `tooltip.passive.${data.id}`;

    return {
      title: data.title ?? passive?.name ?? IconTooltipContentResolver.labelFromId(data.id),
      description: IconTooltipContentResolver.translateOrFallback(descriptionKey, data.description ?? I18n.t('tooltip.passive.default')),
    };
  }

  private static resolveRelic(data: IconTooltipData): ResolvedIconTooltip {
    const relic = (relicsData as Record<string, RelicRecord>)[data.id];
    const titleKey = relic?.nameKey;
    const descriptionKey = data.descriptionKey ?? `tooltip.relic.${data.id}`;

    return {
      title: data.title ?? IconTooltipContentResolver.translateOrFallback(titleKey, relic?.name ?? IconTooltipContentResolver.labelFromId(data.id)),
      description: IconTooltipContentResolver.translateOrFallback(
        descriptionKey,
        data.description ?? relic?.description ?? I18n.t('tooltip.relic.default'),
      ),
    };
  }

  private static resolveCharacter(data: IconTooltipData): ResolvedIconTooltip {
    const character = IconTooltipContentResolver.findRecord<CharacterRecord>(charactersData, data.id);

    return {
      title: data.title ?? IconTooltipContentResolver.translateOrFallback(character?.nameKey, IconTooltipContentResolver.labelFromId(data.id)),
      description: IconTooltipContentResolver.translateOrFallback(
        data.descriptionKey ?? character?.descriptionKey,
        data.description ?? I18n.t('tooltip.character.default'),
      ),
    };
  }

  private static resolveMapMechanic(data: IconTooltipData): ResolvedIconTooltip {
    const titleKey = `help.map.mechanic.${data.id}`;
    const descriptionKey = data.descriptionKey
      ?? MAP_MECHANIC_DESCRIPTION_KEYS[data.id]
      ?? 'help.map.mechanic.fallback.description';

    return {
      title: data.title ?? IconTooltipContentResolver.translateOrFallback(titleKey, IconTooltipContentResolver.labelFromId(data.id)),
      description: IconTooltipContentResolver.translateOrFallback(descriptionKey, data.description ?? I18n.t('tooltip.mapMechanic.default')),
    };
  }

  private static translateOrFallback(key: string | undefined, fallback: string): string {
    if (!key) {
      return fallback;
    }

    const translated = I18n.t(key);
    return translated === key ? fallback : translated;
  }

  private static findRecord<T extends { id?: string }>(source: unknown, id: string): T | undefined {
    if (Array.isArray(source)) {
      return (source as T[]).find((entry) => entry.id === id);
    }

    if (source && typeof source === 'object') {
      const byKey = (source as Record<string, T>)[id];
      if (byKey) {
        return { ...byKey, id: byKey.id ?? id };
      }

      return Object.entries(source as Record<string, T>)
        .map(([entryId, entry]) => ({ ...entry, id: entry.id ?? entryId }))
        .find((entry) => entry.id === id);
    }

    return undefined;
  }

  private static normalizeStatusId(id: string): string {
    if (id.startsWith('damage-taken')) {
      return 'tempDamageTaken';
    }

    if (id.startsWith('overdrive')) {
      return 'overdrive';
    }

    if (id.startsWith('enemy-slow')) {
      return 'enemySlow';
    }

    if (id.startsWith('pickup-vacuum')) {
      return 'pickupVacuum';
    }

    return id;
  }

  private static labelFromId(id: string | undefined): string {
    if (!id) {
      return '?';
    }

    return id
      .split(/[_-]/)
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
