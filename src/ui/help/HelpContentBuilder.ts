import { CharacterDefinition } from '../../character/CharacterDefinition';
import { I18n } from '../../i18n/I18n';
import {
  getPassiveDescription,
  getPassiveDisplayName,
  getWeaponDescription,
  getWeaponDisplayName,
} from '../../i18n/ContentText';
import { EVOLUTION_RULES } from '../../evolution/EvolutionRule';
import { MapMechanicType } from '../../map/mechanics/MapMechanicDefinition';
import charactersData from '../../data/characters.json';
import mapsData from '../../data/maps.json';
import passivesData from '../../data/passives.json';
import stagesData from '../../data/stages.json';
import upgradesData from '../../data/upgrades.json';
import weaponsData from '../../data/weapons.json';
import {
  RANDOM_UNLOCKED_CHARACTER_ID,
  RANDOM_UNLOCKED_STAGE_ID,
} from '../../selection/SelectionState';
import { HelpFormatter } from './HelpFormatter';
import { HelpLine, HelpSection } from './HelpSection';
import { HelpTabDefinition } from './HelpTabDefinition';

type CharacterRecord = {
  id?: string;
  nameKey?: string;
  descriptionKey?: string;
  startingWeaponId?: string;
  initialStats?: Record<string, number>;
  growthPerLevel?: Record<string, number>;
  levelUpEffect?: { type?: string };
  damageReactionSkill?: { type?: string };
};

type WeaponRecord = {
  id?: string;
  type?: string;
  tags?: string[];
  behavior?: { type?: string };
  stats?: Record<string, number>;
  damage?: number;
  cooldown?: number;
  projectileSpeed?: number;
  pierce?: number;
  projectileCount?: number;
  radius?: number;
  orbitCount?: number;
  orbitSpeed?: number;
};

type PassiveRecord = {
  id: string;
  name?: string;
  description?: string;
};

type StageRecord = {
  id: string;
  name?: string;
  mapId?: string;
  finalBossId?: string;
};

type MapMechanicRecord = {
  type?: string;
};

type MapRecord = {
  id: string;
  name?: string;
  worldWidth?: number;
  worldHeight?: number;
  mechanics?: MapMechanicRecord[];
};

type HelpIconRef = {
  iconKey?: string;
  iconKind?: HelpLine['iconKind'];
  iconId?: string;
  fallback?: string;
};

const MAP_MECHANIC_ICON_KIND: Record<string, string> = {
  obstacle: 'obstacle',
  slowZone: 'swamp',
  portal: 'portalBlue',
  lightSource: 'light',
  hazard: 'hazard',
  altar: 'altar',
  spawner: 'spawner',
  destructible: 'obstacle',
};

const MECHANIC_LABEL_KEYS: Record<string, string> = {
  obstacle: 'help.map.mechanic.obstacle',
  slowZone: 'help.map.mechanic.slowZone',
  portal: 'help.map.mechanic.portal',
  lightSource: 'help.map.mechanic.lightSource',
  hazard: 'help.map.mechanic.hazard',
  altar: 'help.map.mechanic.altar',
  spawner: 'help.map.mechanic.spawner',
  destructible: 'help.map.mechanic.destructible',
  unknown: 'help.map.mechanic.unknown',
};

const WEAPON_BEHAVIOR_TYPE: Record<string, string> = {
  aura: 'help.weapon.behavior.aura',
  orbit: 'help.weapon.behavior.orbit',
  homing: 'help.weapon.behavior.homing',
  arcing: 'help.weapon.behavior.arcing',
  axe: 'help.weapon.behavior.axe',
  projectile: 'help.weapon.behavior.projectile',
};

const TAG_LABEL_KEYS: Record<string, string> = {
  base: 'help.weapon.tag.base',
  evolved: 'help.weapon.tag.evolved',
  projectile: 'help.weapon.tag.projectile',
  physical: 'help.weapon.tag.physical',
  magic: 'help.weapon.tag.magic',
  explosive: 'help.weapon.tag.explosive',
  aura: 'help.weapon.tag.aura',
  area: 'help.weapon.tag.area',
  control: 'help.weapon.tag.control',
  spiral: 'help.weapon.tag.spiral',
  knockback: 'help.weapon.tag.knockback',
  homing: 'help.weapon.tag.homing',
  arcing: 'help.weapon.tag.arcing',
  defensive: 'help.weapon.tag.defensive',
};

const STAT_LABEL_KEYS: Record<string, string> = {
  maxHp: 'help.stat.maxHp',
  moveSpeed: 'help.stat.moveSpeed',
  pickupRange: 'help.stat.pickupRange',
  physicalDamageMultiplier: 'help.stat.physicalDamageMultiplier',
  projectileDamageMultiplier: 'help.stat.projectileDamageMultiplier',
  critChance: 'help.stat.critChance',
  magicDamageMultiplier: 'help.stat.magicDamageMultiplier',
  explosionDamageMultiplier: 'help.stat.explosionDamageMultiplier',
  damageMultiplier: 'help.stat.damageMultiplier',
  healingMultiplier: 'help.stat.healingMultiplier',
  shieldGainMultiplier: 'help.stat.shieldGainMultiplier',
  orbitDamageMultiplier: 'help.stat.orbitDamageMultiplier',
  areaDamageMultiplier: 'help.stat.areaDamageMultiplier',
  armorFlat: 'help.stat.armorFlat',
  damage: 'help.weapon.stat.damage',
  cooldown: 'help.weapon.stat.cooldown',
  projectileSpeed: 'help.weapon.stat.projectileSpeed',
  pierce: 'help.weapon.stat.pierce',
  projectileCount: 'help.weapon.stat.projectileCount',
  radius: 'help.weapon.stat.radius',
  orbitCount: 'help.weapon.stat.orbitCount',
  orbitSpeed: 'help.weapon.stat.orbitSpeed',
};

const MECHANIC_TYPE_ORDER: MapMechanicType[] = ['obstacle', 'slowZone', 'portal', 'lightSource', 'hazard', 'altar', 'spawner', 'destructible'];

export class HelpContentBuilder {
  buildTabs(): HelpTabDefinition[] {
    return [
      this.buildBasicsTab(),
      this.buildCharactersTab(),
      this.buildWeaponsTab(),
      this.buildEvolutionsTab(),
      this.buildPassivesTab(),
      this.buildMapsTab(),
      this.buildEndlessTab(),
      this.buildSettingsTab(),
      this.buildTestingTab(),
    ];
  }

  private buildBasicsTab(): HelpTabDefinition {
    return this.tab('basics', 'help.tab.basics', 'Basics', 'B', [
      {
        title: HelpFormatter.t('help.basics.title', 'Basics'),
        lines: [
          this.bullet('help.basics.keyboard'),
          this.bullet('help.basics.mouse'),
          this.bullet('help.basics.joystick'),
          this.bullet('help.basics.pause'),
          this.paragraph('help.basics.objective'),
          this.paragraph('help.basics.openTreasure'),
          this.paragraph('help.basics.autoTest'),
        ],
      },
    ]);
  }

  private buildCharactersTab(): HelpTabDefinition {
    const characters = Object.entries(charactersData as unknown as Record<string, CharacterRecord>)
      .map(([id, character]) => ({ ...character, id }));

    const sections: HelpSection[] = [
      {
        title: HelpFormatter.t('character.random.name', 'Random'),
        lines: [
          this.iconRow('help.characters.random', { fallback: 'R' }),
          this.stat('help.testing.randomSelection', RANDOM_UNLOCKED_CHARACTER_ID),
          this.paragraph('help.characters.randomSelectionDetail'),
        ],
      },
      ...characters.map((character) => this.characterSection(character)),
    ];

    return this.tab('characters', 'help.tab.characters', 'Characters', 'C', sections);
  }

  private characterSection(character: CharacterRecord): HelpSection {
    const characterId = character.id ?? 'default';
    const name = HelpFormatter.nameFromKey(character.nameKey, characterId);
    const growthLines = Object.entries(character.growthPerLevel ?? {})
      .map(([key, value]) => this.formatStatValue(key, value))
      .filter(Boolean);

    const reaction = this.formatCharacterReaction(character.damageReactionSkill?.type);

    return {
      title: name,
      lines: [
        this.iconRow('help.characters.descriptionLabel', { fallback: HelpFormatter.initials(name) }),
        this.iconRow(
          'help.characters.startingWeapon',
          this.weaponIcon(character.startingWeaponId, this.weaponName(character.startingWeaponId)),
        ),
        this.stat('help.characters.role', this.getCharacterRoleSummary(characterId)),
        this.stat('help.characters.damageReaction', reaction),
        this.stat('help.characters.levelUpEffect', this.characterLevelUpText(character.levelUpEffect?.type)),
        ...(growthLines.length > 0
          ? [this.stat('help.characters.growth', growthLines.join(' / '))]
          : []),
        this.paragraph(this.characterDescription(characterId)),
      ],
    };
  }

  private buildWeaponsTab(): HelpTabDefinition {
    const weapons = Object.entries(weaponsData as unknown as Record<string, WeaponRecord>)
      .map(([id, weapon]) => ({ ...weapon, id }));

    return this.tab('weapons', 'help.tab.weapons', 'Weapons', 'W', weapons.map((weapon) => {
      const weaponId = weapon.id ?? '';
      const weaponName = this.weaponName(weaponId);
      const weaponRows = this.formatWeaponSummaryRows(weapon);
      const stats = this.formatWeaponStats({ ...weapon.stats, ...weapon });

      return {
        title: weaponName,
        lines: [
          this.iconRow(
            `help.weapon.type.${weapon.type ?? 'default'}`,
            this.weaponIcon(weaponId, weaponName),
          ),
          this.stat('help.weapons.description', getWeaponDescription(weaponId, this.characterizeWeapons(weapon))),
          this.stat('help.weapons.tags', weaponRows.tags),
          this.stat('help.weapons.behavior', weaponRows.behavior),
          ...(weaponRows.coreStats ? [this.stat('help.weapons.coreStats', weaponRows.coreStats)] : []),
          ...(stats ? [this.stat('help.weapons.baseStats', stats)] : []),
        ],
      };
    }));
  }

  private buildEvolutionsTab(): HelpTabDefinition {
    return this.tab('evolutions', 'help.tab.evolutions', 'Evolutions', 'E', [
      {
        title: HelpFormatter.t('help.evolutions.title', 'Evolutions'),
        lines: [
          this.paragraph('help.evolutions.description'),
          ...EVOLUTION_RULES.flatMap((rule) => [
            this.evolutionRouteIconChain(rule),
            this.stat('help.evolution.requirements', `${this.formatEvolutionRequirement(rule)}`),
          ]),
        ],
      },
    ]);
  }

  private buildPassivesTab(): HelpTabDefinition {
    const passives = Object.values(passivesData as PassiveRecord[]);

    return this.tab('passives', 'help.tab.passives', 'Passives', 'P', passives.map((passive) => {
      const routeLines = EVOLUTION_RULES
        .filter((rule) => rule.requiredPassiveId === passive.id)
        .map((rule) => this.evolutionRouteIconChain(rule));

      return {
        title: getPassiveDisplayName(passive.id, passive.name),
        lines: [
          this.iconRow('help.passives.maxLevel', this.passiveIcon(passive.id, getPassiveDisplayName(passive.id, passive.name))),
          this.stat('help.passives.effect', getPassiveDescription(passive.id, passive.description ?? '')),
          ...routeLines,
          this.stat('help.passives.maxLevel', this.getPassiveMaxLevel(passive.id).toString()),
        ],
      };
    }));
  }

  private buildMapsTab(): HelpTabDefinition {
    const maps = mapsData as Record<string, MapRecord>;
    const stages = Object.values(stagesData as Record<string, StageRecord>);

    return this.tab('maps', 'help.tab.maps', 'Maps', 'M', [
      {
        title: HelpFormatter.t('help.maps.random.title', 'Random Stage'),
        lines: [
          this.iconRow('help.maps.random.description', { fallback: 'R' }),
          this.stat('help.testing.randomSelection', RANDOM_UNLOCKED_STAGE_ID),
          this.stat('help.maps.randomSelectionDetail', I18n.t('help.maps.randomDetail')),
        ],
      },
      ...stages.map((stage) => {
        const map = maps[stage.mapId ?? ''];

        return {
          title: stage.name ?? HelpFormatter.labelFromId(stage.id),
          lines: [
            this.stat('help.maps.name', map?.name ?? HelpFormatter.labelFromId(stage.mapId)),
            this.stat('help.maps.size', map ? `${map.worldWidth} x ${map.worldHeight}` : I18n.t('help.maps.unknown')),
            this.stat('help.maps.finalBoss', HelpFormatter.labelFromId(stage.finalBossId)),
            this.stat('help.maps.endless', this.tendlessMapHelp(stage.mapId)),
            this.stat('help.maps.mechanicSummary', this.formatMapMechanicsSummary(map)),
            ...this.formatMapMechanicRows(map),
          ],
        };
      }),
    ]);
  }

  private buildEndlessTab(): HelpTabDefinition {
    return this.tab('endless', 'help.tab.endless', 'Endless', 'EN', [
      {
        title: HelpFormatter.t('help.endless.title', 'Endless Mode'),
        lines: [
          this.bullet('help.endless.spawnRule'),
          this.bullet('help.endless.scaling'),
          this.bullet('help.endless.bosses'),
          this.bullet('help.endless.renewSpawn'),
          this.stat('help.endless.rewards', 'help.endless.rewardList'),
          this.stat('help.endless.shield', 'help.endless.shieldDescription'),
          this.stat('help.endless.modeScope', 'help.endless.scope'),
        ],
      },
    ]);
  }

  private buildSettingsTab(): HelpTabDefinition {
    return this.tab('settings', 'help.tab.settings', 'Settings', 'S', [
      {
        title: HelpFormatter.t('help.settings.title', 'Settings'),
        lines: [
          this.stat('help.settings.display', 'help.settings.displayList'),
          this.stat('help.settings.gameplay', 'help.settings.gameplayList'),
          this.stat('help.settings.audio', 'help.settings.audioList'),
          this.stat('help.settings.input', 'help.settings.inputList'),
          this.stat('help.settings.developer', 'help.settings.developerList'),
          this.stat('help.settings.restartNotice', 'help.settings.restartNoticeText'),
        ],
      },
    ]);
  }

  private buildTestingTab(): HelpTabDefinition {
    return this.tab('testing', 'help.tab.testing', 'Testing / Data', 'T', [
      {
        title: HelpFormatter.t('help.testing.title', 'Testing / Data'),
        lines: [
          this.stat('help.testing.randomCharacter', `selectedCharacterId=${RANDOM_UNLOCKED_CHARACTER_ID}, characterId=${I18n.t('help.testing.actualRunCharacter')}`),
          this.stat('help.testing.randomStage', `selectedStageId=${RANDOM_UNLOCKED_STAGE_ID}, stageId=${I18n.t('help.testing.actualRunStage')}`),
          this.stat('help.testing.csv', 'help.testing.csvFields'),
          this.stat('help.testing.autoTest', 'help.testing.autoModeText'),
          this.stat('help.testing.replay', 'help.testing.replayText'),
        ],
      },
    ]);
  }

  private tab(
    id: HelpTabDefinition['id'],
    titleKey: string,
    titleFallback: string,
    fallback: string,
    sections: HelpSection[],
  ): HelpTabDefinition {
    return {
      id,
      title: HelpFormatter.t(titleKey, titleFallback),
      fallback,
      sections,
    };
  }

  private iconRow(key: string, icon: HelpIconRef = {}): HelpLine {
    return {
      type: 'iconRow',
      text: this.translateMaybe(key),
      iconKey: icon.iconKey,
      iconKind: icon.iconKind,
      iconId: icon.iconId,
      fallback: icon.fallback,
    };
  }

  private iconChain(labelKey: string, icons: HelpIconRef[]): HelpLine {
    return {
      type: 'iconChain',
      text: this.translateMaybe(labelKey),
      icons,
    };
  }

  private paragraph(keyOrText: string): HelpLine {
    return { type: 'paragraph', text: this.translateMaybe(keyOrText) };
  }

  private bullet(keyOrText: string): HelpLine {
    return { type: 'bullet', text: this.translateMaybe(keyOrText) };
  }

  private stat(labelKey: string, valueKeyOrText: string): HelpLine {
    return {
      type: 'statRow',
      label: this.translateMaybe(labelKey),
      value: this.translateMaybe(valueKeyOrText),
    };
  }

  private translateMaybe(value: string): string {
    const translated = I18n.t(value);
    return translated === value ? value : translated;
  }

  private weaponName(weaponId: string | undefined): string {
    const weapon = weaponId
      ? (weaponsData as unknown as Record<string, WeaponRecord>)[weaponId]
      : undefined;

    return weapon?.id ? getWeaponDisplayName(weapon.id) : HelpFormatter.labelFromId(weaponId);
  }

  private passiveName(passiveId: string | undefined): string {
    const passive = (passivesData as PassiveRecord[])
      .find((entry) => entry.id === passiveId);

    return getPassiveDisplayName(passiveId, passive?.name ?? HelpFormatter.labelFromId(passiveId));
  }

  private weaponIcon(weaponId: string | undefined, fallbackSource: string | undefined): HelpIconRef {
    return {
      iconKind: weaponId ? 'weapon' : undefined,
      iconId: weaponId,
      fallback: HelpFormatter.initials(fallbackSource ?? weaponId ?? '?'),
    };
  }

  private passiveIcon(passiveId: string | undefined, fallbackSource: string | undefined): HelpIconRef {
    return {
      iconKind: passiveId ? 'passive' : undefined,
      iconId: passiveId,
      fallback: HelpFormatter.initials(fallbackSource ?? passiveId ?? '?'),
    };
  }

  private mapMechanicIcon(type: string, fallbackSource: string | undefined): HelpIconRef {
    const iconId = MAP_MECHANIC_ICON_KIND[type] ?? MAP_MECHANIC_ICON_KIND.obstacle;

    return {
      iconKind: 'mapMechanic',
      iconId,
      fallback: HelpFormatter.initials(fallbackSource ?? type),
    };
  }

  private evolutionRouteIconChain(rule: {
    baseWeaponId: string;
    requiredPassiveId: string;
    evolvedWeaponId: string;
  }): HelpLine {
    return this.iconChain('help.evolution.route', [
      this.weaponIcon(rule.baseWeaponId, this.weaponName(rule.baseWeaponId)),
      this.passiveIcon(rule.requiredPassiveId, this.passiveName(rule.requiredPassiveId)),
      this.weaponIcon(rule.evolvedWeaponId, this.weaponName(rule.evolvedWeaponId)),
    ]);
  }

  private characterizeWeapons(weapon: WeaponRecord): string {
    const behavior = weapon.behavior?.type;
    const behaviorKey = behavior && WEAPON_BEHAVIOR_TYPE[behavior]
      ? I18n.t(WEAPON_BEHAVIOR_TYPE[behavior])
      : I18n.t('help.weapon.behavior.default');

    return I18n.t('help.weapon.summary', { type: behaviorKey });
  }

  private formatWeaponSummaryRows(weapon: WeaponRecord): {
    tags: string;
    behavior: string;
    coreStats: string;
  } {
    const tags = (weapon.tags ?? [])
      .map((tag) => I18n.t(TAG_LABEL_KEYS[tag] ?? 'unknown')).join(' / ');

    const behavior = weapon.behavior?.type ? this.formatWeaponBehavior(weapon.behavior.type) : I18n.t('help.weapon.behavior.default');
    const coreStats = this.formatWeaponStats({ ...weapon.stats, ...weapon });

    return {
      tags: tags || HelpFormatter.labelFromId('basic'),
      behavior,
      coreStats,
    };
  }

  private formatWeaponBehavior(type: string | undefined): string {
    return I18n.t(WEAPON_BEHAVIOR_TYPE[type ?? ''] ?? 'help.weapon.behavior.default', {
      type: I18n.t('help.weapon.behavior.unknown'),
    });
  }

  private characterDescription(characterId: string): string {
    const key = `help.characters.description.${characterId}`;
    const translated = I18n.t(key);

    if (translated !== key) {
      return translated;
    }

    const fallback = I18n.t('help.characters.description.default');

    return fallback;
  }

  private formatCharacterReaction(reactionType: string | undefined): string {
    if (!reactionType) {
      return I18n.t('help.characters.reaction.none');
    }

    const key = `help.characters.reaction.${reactionType}`;
    const translated = I18n.t(key);

    if (translated !== key) {
      return translated;
    }

    return HelpFormatter.labelFromId(reactionType);
  }

  private characterLevelUpText(effectType?: string): string {
    if (!effectType) {
      return I18n.t('help.characters.levelUp.unknown');
    }

    const translated = I18n.t(`help.characters.levelUp.${effectType}`);

    if (translated !== `help.characters.levelUp.${effectType}`) {
      return translated;
    }

    return I18n.t('help.characters.levelUp.default');
  }

  private getCharacterRoleSummary(characterId: string): string {
    const keys = [
      `ui.role.${characterId}.summary`,
      `help.characters.role.${characterId}`,
    ];

    for (const key of keys) {
      const translated = I18n.t(key);
      if (translated !== key) {
        return translated;
      }
    }

    return I18n.t('ui.role.default');
  }

  private formatWeaponStats(stats: Record<string, unknown>): string {
    const order = ['damage', 'cooldown', 'projectileSpeed', 'pierce', 'projectileCount', 'radius', 'orbitCount', 'orbitSpeed'];

    return order
      .map((key) => {
        const value = HelpFormatter.number(stats[key]);
        if (!value) {
          return undefined;
        }

        return `${I18n.t(STAT_LABEL_KEYS[key] ?? `help.weapon.stat.${key}`)} ${value}`;
      })
      .filter((part): part is string => Boolean(part))
      .join(', ');
  }

  private formatStatValue(key: string, value: unknown): string | undefined {
    const statValue = HelpFormatter.number(value);
    if (!statValue) {
      return undefined;
    }

    return `${I18n.t(STAT_LABEL_KEYS[key] ?? `help.stat.${key}`)} +${statValue}`;
  }

  private formatMapMechanicsSummary(map: MapRecord | undefined): string {
    const mechanics = map?.mechanics ?? [];
    if (mechanics.length === 0) {
      return I18n.t('help.map.noMechanics');
    }

    const counts = this.countMechanicTypes(mechanics);
    return MECHANIC_TYPE_ORDER
      .map((type) => {
        const count = counts[type] ?? 0;
        if (!count) {
          return undefined;
        }

    const key = MECHANIC_LABEL_KEYS[type] ?? MECHANIC_LABEL_KEYS.unknown;
        return `${count}x ${I18n.t(key)}`;
      })
      .filter((part): part is string => Boolean(part))
      .join(' / ');
  }

  private formatMapMechanicRows(map: MapRecord | undefined): HelpLine[] {
    const mechanics = map?.mechanics ?? [];
    const grouped = this.groupMechanicsByType(mechanics);

    return MECHANIC_TYPE_ORDER
      .flatMap((type) => {
        const items = grouped[type] ?? [];
        if (items.length === 0) {
          return [];
        }

        const count = items.length;
        const mechanicText = this.formatMechanicTypeDescription(type, count, items);
        return [
          this.iconRow(mechanicText, this.mapMechanicIcon(type, I18n.t(MECHANIC_LABEL_KEYS[type] ?? MECHANIC_LABEL_KEYS.unknown))),
        ];
      });
  }

  private formatMechanicTypeDescription(type: string, count: number, items: MapMechanicRecord[]): string {
    const mechanicLabel = MECHANIC_LABEL_KEYS[type] ?? MECHANIC_LABEL_KEYS.unknown;
    const key = `help.map.mechanic.${type}.description`;
    const fallback = `${count} ${I18n.t('help.map.mechanic.item')} ${I18n.t(mechanicLabel)}`;

    const translated = I18n.t(key, {
      count,
      mechanic: I18n.t(mechanicLabel),
    });

    if (translated !== key) {
      return translated;
    }

    const visualType = this.formatVisualTypes(items);

    return `${count} ${I18n.t(mechanicLabel)} ${visualType}`;
  }

  private formatVisualTypes(items: MapMechanicRecord[]): string {
    const types = new Set(items.map((item) => item?.type));

    if (types.size === 0) {
      return '';
    }

    return `[${Array.from(types).map((type) => {
      const key = MECHANIC_LABEL_KEYS[type ?? ''] ?? MECHANIC_LABEL_KEYS.unknown;
      return I18n.t(key);
    }).join('/')}]`;
  }

  private tendlessMapHelp(mapId: string | undefined): string {
    if (!mapId) {
      return I18n.t('help.maps.endlessUnknown');
    }

    const key = `help.maps.endless.${mapId}`;
    const translated = I18n.t(key);
    return translated === key ? I18n.t('help.maps.endlessUnknown') : translated;
  }

  private groupMechanicsByType(mechanics: MapMechanicRecord[]): Record<string, MapMechanicRecord[]> {
    const grouped: Record<string, MapMechanicRecord[]> = {};

    for (const mechanic of mechanics) {
      const key = mechanic.type ?? 'unknown';
      grouped[key] = grouped[key] ?? [];
      grouped[key].push(mechanic);
    }

    return grouped;
  }

  private countMechanicTypes(mechanics: MapMechanicRecord[]): Record<string, number> {
    return mechanics.reduce<Record<string, number>>((record, mechanic) => {
      const type = mechanic.type ?? 'unknown';
      record[type] = (record[type] ?? 0) + 1;
      return record;
    }, {});
  }

  private formatEvolutionRequirement(rule: {
    requiredWeaponUpgradeTotal: number;
    requiredPassiveId: string;
    requiredPassiveLevel: number;
  }): string {
    return I18n.t('help.evolution.requirement', {
      weaponUpgrades: rule.requiredWeaponUpgradeTotal,
      passive: I18n.t('ui.passive'),
      passiveLevel: rule.requiredPassiveLevel,
    });
  }

  private getPassiveMaxLevel(_passiveId: string): number {
    return 5;
  }
  private divider(): HelpLine {
    return { type: 'divider' };
  }
}
