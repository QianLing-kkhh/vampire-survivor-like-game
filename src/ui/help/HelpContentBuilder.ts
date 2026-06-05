import charactersData from '../../data/characters.json';
import mapsData from '../../data/maps.json';
import passivesData from '../../data/passives.json';
import stagesData from '../../data/stages.json';
import upgradesData from '../../data/upgrades.json';
import weaponsData from '../../data/weapons.json';
import { EVOLUTION_RULES } from '../../evolution/EvolutionRule';
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
  name?: string;
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

const WEAPON_ICON_KEYS: Record<string, string> = {
  axe: 'art_passives_spinach_icon',
  bible: 'art_weapons_bible_orbit_book',
  death_spiral: 'art_weapons_death_spiral_projectile',
  garlic: 'art_weapons_garlic_core',
  holy_wand: 'art_weapons_holy_wand_projectile',
  knife: 'art_weapons_knife_projectile',
  magic_wand: 'art_weapons_magic_wand_projectile',
  soul_eater: 'art_weapons_soul_eater_core',
  thousand_edge: 'art_weapons_thousand_edge_projectile',
  unholy_vespers: 'art_weapons_unholy_vespers_orbit_book',
};

const PASSIVE_ICON_KEYS: Record<string, string> = {
  bracer: 'art_passives_bracer_icon',
  clover: 'art_passives_clover_icon',
  empty_tome: 'art_passives_empty_tome_icon',
  pummarola: 'art_passives_pummarola_icon',
  spinach: 'art_passives_spinach_icon',
};

const DAMAGE_REACTION_SUMMARY: Record<string, string> = {
  blinkForward: 'Blink Forward: escapes danger by blinking in the current movement direction.',
  holySanctuary: 'Holy Sanctuary: creates a sanctuary, heals, gains shield, and knocks enemies back.',
  ironCounter: 'Iron Counter: counters with a shockwave and temporary damage reduction.',
  slowTrail: 'Slow Trail: leaves slowing zones after damage to control enemy movement.',
};

const ROLE_SUMMARY: Record<string, string> = {
  default: 'Mobility / projectile / escape',
  priest: 'Shield / heal / orbit',
  warrior: 'Armor / knockback / counter',
  witch: 'Magic / slow / control',
};

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
          this.bullet('WASD / Arrow Keys move the character.'),
          this.bullet('Hold the left mouse button to move toward the cursor.'),
          this.bullet('On mobile, use the virtual joystick.'),
          this.bullet('Pause with ESC or the on-screen Pause button.'),
          this.divider(),
          this.paragraph('Survive, collect EXP gems, choose upgrades, build weapons/passives, and defeat the final Boss.'),
          this.paragraph('Treasure chests can grant bonus upgrades and can trigger eligible weapon evolutions.'),
          this.paragraph('Auto Movement, Auto Upgrade, and Fast Mode support repeated auto testing without changing gameplay rules.'),
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
          this.iconRow('Random unlocked character each run.', undefined, '?'),
          this.stat('CSV selection', `${RANDOM_UNLOCKED_CHARACTER_ID} -> actual characterId`),
        ],
      },
      ...characters.map((character) => this.characterSection(character)),
    ];

    return this.tab('characters', 'help.tab.characters', 'Characters', 'C', sections);
  }

  private characterSection(character: CharacterRecord): HelpSection {
    const characterId = character.id ?? 'default';
    const name = HelpFormatter.nameFromKey(character.nameKey, characterId);
    const weapon = this.weaponName(character.startingWeaponId);
    const stats = character.initialStats ?? {};
    const growth = Object.entries(character.growthPerLevel ?? {})
      .map(([key, value]) => `${HelpFormatter.labelFromId(key)} +${value}/level`)
      .join(', ');
    const reactionType = character.damageReactionSkill?.type;
    const reaction = reactionType
      ? DAMAGE_REACTION_SUMMARY[reactionType] ?? `${HelpFormatter.labelFromId(reactionType)} damage reaction.`
      : 'No damage reaction listed.';

    return {
      title: name,
      lines: [
        this.iconRow(HelpFormatter.t(character.descriptionKey ?? '', this.characterDescription(characterId)), undefined, HelpFormatter.initials(name)),
        this.stat('Starting Weapon', weapon),
        this.stat('Role', ROLE_SUMMARY[characterId] ?? 'Flexible survivor'),
        this.stat('Initial Stats', HelpFormatter.joinDefined([
          HelpFormatter.number(stats.maxHp) ? `HP ${HelpFormatter.number(stats.maxHp)}` : undefined,
          HelpFormatter.number(stats.moveSpeed) ? `Move ${HelpFormatter.number(stats.moveSpeed)}` : undefined,
          HelpFormatter.number(stats.pickupRange) ? `Pickup ${HelpFormatter.number(stats.pickupRange)}` : undefined,
        ])),
        ...(growth ? [this.stat('Growth', growth)] : []),
        this.stat('Level Up Effect', HelpFormatter.labelFromId(character.levelUpEffect?.type)),
        this.paragraph(reaction),
      ],
    };
  }

  private buildWeaponsTab(): HelpTabDefinition {
    const weapons = Object.entries(weaponsData as unknown as Record<string, WeaponRecord>)
      .map(([id, weapon]) => ({ ...weapon, id }));

    return this.tab('weapons', 'help.tab.weapons', 'Weapons', 'W', weapons.map((weapon) => {
      const weaponId = weapon.id ?? '';
      const name = this.weaponName(weaponId);
      const upgradeCount = this.countWeaponUpgrades(weaponId);
      const coreStats = this.formatWeaponStats({ ...weapon.stats, ...weapon });
      return {
        title: name,
        lines: [
          this.iconRow(this.weaponRole(weapon), WEAPON_ICON_KEYS[weaponId], HelpFormatter.initials(name)),
          this.stat('Type', HelpFormatter.labelFromId(weapon.type)),
          this.stat('Tags', (weapon.tags ?? []).join(', ') || 'None'),
          this.stat('Behavior', HelpFormatter.labelFromId(weapon.behavior?.type)),
          ...(upgradeCount > 0 ? [this.stat('Upgrade Steps', `${upgradeCount}`)] : []),
          ...(coreStats ? [this.stat('Core Stats', coreStats)] : []),
        ],
      };
    }));
  }

  private buildEvolutionsTab(): HelpTabDefinition {
    return this.tab('evolutions', 'help.tab.evolutions', 'Evolutions', 'E', [
      {
        title: HelpFormatter.t('help.evolutions.title', 'Evolutions'),
        lines: [
          this.paragraph('Eligible evolutions are checked from the current evolution rules. Treasure chests can trigger them after requirements are met.'),
          ...EVOLUTION_RULES.flatMap((rule) => [
            this.iconRow(
              `${this.weaponName(rule.baseWeaponId)} + ${this.passiveName(rule.requiredPassiveId)} -> ${this.weaponName(rule.evolvedWeaponId)}`,
              WEAPON_ICON_KEYS[rule.evolvedWeaponId],
              'EV',
            ),
            this.stat('Requirement', `Weapon upgrades ${rule.requiredWeaponUpgradeTotal}, ${this.passiveName(rule.requiredPassiveId)} Lv. ${rule.requiredPassiveLevel}`),
          ]),
        ],
      },
    ]);
  }

  private buildPassivesTab(): HelpTabDefinition {
    const passives = Object.values(passivesData as PassiveRecord[]);

    return this.tab('passives', 'help.tab.passives', 'Passives', 'P', passives.map((passive) => {
      const routes = EVOLUTION_RULES
        .filter((rule) => rule.requiredPassiveId === passive.id)
        .map((rule) => `${this.weaponName(rule.baseWeaponId)} -> ${this.weaponName(rule.evolvedWeaponId)}`);

      return {
        title: passive.name ?? HelpFormatter.labelFromId(passive.id),
        lines: [
          this.iconRow(passive.description ?? 'Passive effect.', PASSIVE_ICON_KEYS[passive.id], HelpFormatter.initials(passive.name ?? passive.id)),
          this.stat('Max Level', '5'),
          this.stat('Evolution Routes', routes.join(', ') || 'None'),
        ],
      };
    }));
  }

  private buildMapsTab(): HelpTabDefinition {
    const maps = mapsData as Record<string, MapRecord>;
    const stages = Object.values(stagesData as Record<string, StageRecord>);

    return this.tab('maps', 'help.tab.maps', 'Maps', 'M', [
      {
        title: HelpFormatter.t('stage.random.name', 'Random Stage'),
        lines: [
          this.iconRow('Random Stage picks one unlocked stage each run.', undefined, '?'),
          this.stat('CSV selection', `${RANDOM_UNLOCKED_STAGE_ID} -> actual stageId/mapId`),
        ],
      },
      ...stages.map((stage) => {
        const map = maps[stage.mapId ?? ''];
        return {
          title: stage.name ?? HelpFormatter.labelFromId(stage.id),
          lines: [
            this.stat('Map', map?.name ?? HelpFormatter.labelFromId(stage.mapId)),
            this.stat('Size', map ? `${map.worldWidth} x ${map.worldHeight}` : 'Unknown'),
            this.stat('Endless', 'Allowed'),
            this.stat('Final Boss', HelpFormatter.labelFromId(stage.finalBossId)),
            this.paragraph(this.formatMapMechanics(map)),
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
          this.bullet('When enabled, defeating the final Boss starts Endless instead of ending the run.'),
          this.bullet('Enemies spawned by Endless scale over time in HP, damage, speed, and EXP.'),
          this.bullet('Endless Bosses can appear repeatedly, and multiple Bosses can be active.'),
          this.bullet('After normal upgrades are exhausted, post-cap rewards can appear.'),
          this.stat('Rewards', 'Heal, overdrive, time slow, shield, minor growth'),
          this.stat('Shield', 'Each stack absorbs one HP loss hit.'),
          this.paragraph('Local leaderboard keys are scoped by mode, selected character, selected stage, selected map, and reserved ruleset dimensions.'),
        ],
      },
    ]);
  }

  private buildSettingsTab(): HelpTabDefinition {
    return this.tab('settings', 'help.tab.settings', 'Settings', 'S', [
      {
        title: HelpFormatter.t('help.settings.title', 'Settings'),
        lines: [
          this.stat('Display', 'Graphics Quality, Asset Style, UI Style, Model Scale, Shadows, Damage Numbers, Minimap'),
          this.stat('Gameplay', 'Auto Movement, Auto Upgrade, Fast Mode, Endless Mode'),
          this.stat('Audio', 'Master audio, BGM, SFX, weapon, and UI volume. Defaults are currently off.'),
          this.stat('Input', 'Virtual joystick size, opacity, left-handed mode, and key binding foundation.'),
          this.stat('Developer', 'Debug Panel and local diagnostics for testing.'),
          this.paragraph('Some visual settings apply after restart or the next run; gameplay settings apply immediately.'),
        ],
      },
    ]);
  }

  private buildTestingTab(): HelpTabDefinition {
    return this.tab('testing', 'help.tab.testing', 'Testing / Data', 'T', [
      {
        title: HelpFormatter.t('help.testing.title', 'Testing / Data'),
        lines: [
          this.stat('Random character', `selectedCharacterId=${RANDOM_UNLOCKED_CHARACTER_ID}; characterId=actual run character`),
          this.stat('Random stage', `selectedStageId=${RANDOM_UNLOCKED_STAGE_ID}; stageId/mapId=actual run stage/map`),
          this.stat('Core CSV', 'runSeed, gameVersion, contentHash, csvSchemaVersion, characterId, stageId, mapId'),
          this.stat('Selection CSV', 'selectedCharacterId, selectedStageId, characterSelectionMode, stageSelectionMode'),
          this.paragraph('Auto Test combines Auto Movement, Auto Upgrade, and Fast Mode for repeated balance samples.'),
          this.paragraph('Replay records store metadata and selected key events; playback is not implemented yet.'),
          this.paragraph('Validation scripts check TypeScript/build plus content, assets, and documentation when run manually.'),
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

  private weaponName(weaponId: string | undefined): string {
    const weapon = weaponId
      ? (weaponsData as unknown as Record<string, WeaponRecord>)[weaponId]
      : undefined;

    return weapon?.name ?? HelpFormatter.labelFromId(weaponId);
  }

  private passiveName(passiveId: string | undefined): string {
    const passive = (passivesData as PassiveRecord[])
      .find((entry) => entry.id === passiveId);

    return passive?.name ?? HelpFormatter.labelFromId(passiveId);
  }

  private characterDescription(characterId: string): string {
    switch (characterId) {
      case 'witch':
        return 'Leaves slowing zones after taking damage to control enemy movement.';
      case 'priest':
        return 'Creates a sanctuary, heals, gains shield, and knocks back enemies.';
      case 'warrior':
        return 'Counters damage with a shockwave and temporary damage reduction.';
      case 'default':
      default:
        return 'A fast knife user who escapes danger by blinking forward after taking damage.';
    }
  }

  private weaponRole(weapon: WeaponRecord): string {
    const tags = new Set(weapon.tags ?? []);
    const behavior = weapon.behavior?.type;

    if (behavior === 'aura') {
      return 'Defensive area weapon that damages nearby enemies without knockback.';
    }

    if (behavior === 'orbit') {
      return 'Orbit weapon that circles the player and controls nearby space.';
    }

    if (behavior === 'homing') {
      return tags.has('explosive')
        ? 'Homing magic projectile with small explosion pressure.'
        : 'Homing projectile that tracks enemies.';
    }

    if (behavior === 'arcing') {
      return tags.has('spiral')
        ? 'Arcing weapon evolved into a spiral pressure pattern.'
        : 'Arcing physical projectile for area pressure.';
    }

    if (tags.has('pierce')) {
      return 'Projectile weapon that pierces enemies and rewards directional positioning.';
    }

    return 'Weapon behavior is defined by its runtime class and content tags.';
  }

  private countWeaponUpgrades(weaponId: string): number {
    return (upgradesData as Array<{ weaponId?: string }>)
      .filter((upgrade) => upgrade.weaponId === weaponId)
      .length;
  }

  private formatWeaponStats(stats: Record<string, unknown>): string {
    const keys = ['damage', 'cooldown', 'projectileSpeed', 'pierce', 'projectileCount', 'radius', 'orbitCount', 'orbitSpeed'];

    return keys
      .map((key) => {
        const value = HelpFormatter.number(stats[key]);

        return value ? `${HelpFormatter.labelFromId(key)} ${value}` : undefined;
      })
      .filter((part): part is string => Boolean(part))
      .join(', ');
  }

  private formatMapMechanics(map: MapRecord | undefined): string {
    if (!map?.mechanics?.length) {
      return 'Open field layout with no listed map mechanics.';
    }

    const counts = map.mechanics.reduce<Record<string, number>>((record, mechanic) => {
      const type = mechanic.type ?? 'unknown';
      record[type] = (record[type] ?? 0) + 1;
      return record;
    }, {});
    const parts = Object.entries(counts).map(([type, count]) => {
      switch (type) {
        case 'obstacle':
          return `${count} obstacle groups block movement`;
        case 'slowZone':
          return `${count} slow zone reduces movement speed`;
        case 'portal':
          return `${count} portals teleport the player`;
        case 'lightSource':
          return `${count} light sources are visual landmarks`;
        default:
          return `${count} ${HelpFormatter.labelFromId(type)} mechanics`;
      }
    });

    return parts.join('; ');
  }

  private paragraph(text: string): HelpLine {
    return { type: 'paragraph', text };
  }

  private bullet(text: string): HelpLine {
    return { type: 'bullet', text };
  }

  private iconRow(text: string, iconKey?: string, fallback?: string): HelpLine {
    return { type: 'iconRow', text, iconKey, fallback };
  }

  private stat(label: string, value: string): HelpLine {
    return { type: 'statRow', label, value };
  }

  private divider(): HelpLine {
    return { type: 'divider' };
  }
}
