import { ContentBootstrap } from '../../content/ContentBootstrap';
import { ContentRegistry } from '../../content/ContentRegistry';
import {
  getPassiveDescription,
  getPassiveDisplayName,
  getWeaponDescription,
  getWeaponDisplayName,
} from '../../i18n/ContentText';
import { I18n } from '../../i18n/I18n';
import { RelicRegistry } from '../../relic/RelicRegistry';
import { IconTooltipData, ResolvedIconTooltip } from './IconTooltipTypes';

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
    ContentBootstrap.ensureInitialized();

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
    const descriptionKey = data.descriptionKey ?? `weapon.${data.id}.description`;

    return {
      title: data.title ?? getWeaponDisplayName(data.id),
      description: IconTooltipContentResolver.translateOrFallback(
        descriptionKey,
        data.description ?? getWeaponDescription(data.id, I18n.t('tooltip.weapon.default')),
      ),
    };
  }

  private static resolvePassive(data: IconTooltipData): ResolvedIconTooltip {
    const passive = ContentRegistry.getPassive(data.id) as PassiveRecord | undefined;
    const descriptionKey = data.descriptionKey ?? `tooltip.passive.${data.id}`;

    return {
      title: data.title ?? getPassiveDisplayName(data.id, passive?.name),
      description: IconTooltipContentResolver.translateOrFallback(
        descriptionKey,
        data.description ?? getPassiveDescription(data.id, I18n.t('tooltip.passive.default')),
      ),
    };
  }

  private static resolveRelic(data: IconTooltipData): ResolvedIconTooltip {
    const relic = RelicRegistry.get(data.id) as RelicRecord | undefined;
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
    const character = ContentRegistry.getCharacter(data.id) as CharacterRecord | undefined;

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
