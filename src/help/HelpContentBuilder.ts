import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { I18n } from '../i18n/I18n';
import { TreasureManager } from '../pickup/TreasureManager';
import passivesData from '../data/passives.json';
import upgradesData from '../data/upgrades.json';
import weaponsData from '../data/weapons.json';

import { HelpLine, HelpSection, HelpTabId } from './HelpTab';

type WeaponConfig = Record<string, string | number | boolean | string[] | object | undefined> & {
  tags?: string[];
};
type PassiveConfig = {
  id: string;
  name: string;
  description: string;
  maxLevel?: number;
};
type UpgradeConfig = {
  id: string;
  name: string;
  description: string;
};

const BASE_WEAPON_IDS = ['knife', 'garlic', 'bible', 'magic_wand', 'axe'];

export class HelpContentBuilder {
  buildSections(): HelpSection[] {
    return [
      this.buildControlsHelp(),
      this.buildWeaponsHelp(),
      this.buildUiHelp(),
      this.buildEvolutionHelp(),
      this.buildPassivesHelp(),
      this.buildUpgradesHelp(),
      this.buildTreasuresHelp(),
      this.buildEndlessHelp(),
      this.buildGuideHelp(),
    ];
  }

  buildControlsHelp(): HelpSection {
    return this.section('controls', 'Controls', 'time_icon', 'C', [
      this.line('WASD / Arrow Keys: Move', 'time_icon', 'M'),
      this.line('Hold Left Mouse: Move toward cursor', 'time_icon', 'M'),
      this.line('ESC: Pause', 'time_icon', 'P'),
      this.line('Collect EXP gems to level up', 'exp_icon', 'XP'),
      this.line('Open treasure chests for bonus rewards', 'treasure_chest', 'T'),
      this.line('Defeat the Boss to win; Endless continues after Boss', 'boss_lava_beast', 'B'),
    ]);
  }

  buildWeaponsHelp(): HelpSection {
    const lines = BASE_WEAPON_IDS.map((weaponId) => {
      const config = (weaponsData as Record<string, WeaponConfig>)[weaponId];
      return this.line(
        `${this.formatName(weaponId)}: ${this.formatConfig(config)}`,
        this.getWeaponIconKey(weaponId),
        this.getInitials(weaponId),
      );
    });

    return this.section('weapons', 'Weapons', 'knife_icon', 'W', lines);
  }

  buildUiHelp(): HelpSection {
    return this.section('ui', 'UI', 'hp_icon', 'UI', [
      this.line('HUD pairs each weapon with its matching passive.', 'hp_icon', 'H'),
      this.line('Pause opens Resume, Restart, Settings, Help, and Stats / Build.', 'time_icon', 'P'),
      this.line('Stats / Build shows character, weapon, and passive details.', 'exp_icon', 'S'),
      this.line('Settings controls language, audio, Auto, Fast, and Endless.', 'art_ui_panel_bg', 'S'),
      this.line('Result can download current or buffered CSV logs.', 'art_ui_panel_bg', 'CSV'),
    ]);
  }

  buildEvolutionHelp(): HelpSection {
    const lines = EVOLUTION_RULES.map((rule) => this.line(
      `${this.formatName(rule.baseWeaponId)} Lv.${rule.requiredWeaponUpgradeTotal}`
        + ` + ${this.formatName(rule.requiredPassiveId)} Lv.${rule.requiredPassiveLevel}`
        + ` -> ${this.formatName(rule.evolvedWeaponId)} via treasure`,
      this.getWeaponIconKey(rule.evolvedWeaponId),
      this.getInitials(rule.evolvedWeaponId),
    ));

    return this.section('evolution', 'Evolution', 'art_weapons_thousand_edge_icon', 'E', lines);
  }

  buildPassivesHelp(): HelpSection {
    const relatedWeaponsByPassive = new Map<string, string[]>();

    for (const rule of EVOLUTION_RULES) {
      const related = relatedWeaponsByPassive.get(rule.requiredPassiveId) ?? [];
      related.push(rule.baseWeaponId);
      relatedWeaponsByPassive.set(rule.requiredPassiveId, related);
    }

    const lines = (passivesData as PassiveConfig[]).map((passive) => {
      const maxLevel = passive.maxLevel ?? 5;
      const related = relatedWeaponsByPassive.get(passive.id) ?? [];
      const relatedText = related.length > 0
        ? ` Related: ${related.map((weaponId) => this.formatName(weaponId)).join(', ')}`
        : '';

      return this.line(
        `${passive.name} Lv.${maxLevel} max: ${passive.description}.${relatedText}`,
        this.getPassiveIconKey(passive.id),
        this.getInitials(passive.id),
      );
    });

    return this.section('passives', 'Passives', 'art_passives_spinach_icon', 'P', lines);
  }

  buildUpgradesHelp(): HelpSection {
    const lines = (upgradesData as UpgradeConfig[]).map((upgrade) => this.line(
      `${upgrade.name}: ${upgrade.description}`,
      this.getUpgradeIconKey(upgrade.id),
      this.getInitials(upgrade.id),
    ));

    return this.section('upgrades', 'Upgrades', 'exp_icon', 'U', lines);
  }

  buildTreasuresHelp(): HelpSection {
    const config = TreasureManager.getTreasureConfig();
    const dropRate = Math.round(config.normalDropChance * 100);

    return this.section('treasures', 'Treasure', 'treasure_chest', 'T', [
      this.line(`Normal enemies can drop chests at ${dropRate}% before bonuses.`, 'treasure_chest', 'T'),
      this.line('Eligible weapon evolution is resolved before normal chest upgrades.', 'art_weapons_thousand_edge_icon', 'E'),
      this.line('When no normal rewards remain in Endless, chests use Endless rewards.', 'time_icon', '∞'),
      this.line(`Endless chest drops are capped at ${config.endlessMaxDropsPerWindow} per ${config.endlessDropWindowSeconds}s window.`, 'treasure_chest', 'T'),
    ]);
  }

  buildEndlessHelp(): HelpSection {
    const rewardConfig = EndlessRewardManager.getRewardConfig();

    return this.section('endless', 'Endless', 'time_icon', '∞', [
      this.line('After the final Boss, enemies keep spawning and scaling over time.', 'boss_lava_beast', 'B'),
      this.line(`Emergency Heal restores ${rewardConfig.heal.amount} HP.`, 'hp_icon', 'H'),
      this.line(`Overdrive: +${Math.round((rewardConfig.overdrive.multiplier - 1) * 100)}% damage for ${rewardConfig.overdrive.durationSeconds}s; cooldown ${rewardConfig.overdrive.cooldownSeconds}s.`, 'art_weapons_death_spiral_icon', 'O'),
      this.line(`Time Slow: enemy speed x${rewardConfig.enemySlow.multiplier} for ${rewardConfig.enemySlow.durationSeconds}s; cooldown ${rewardConfig.enemySlow.cooldownSeconds}s.`, 'time_icon', 'S'),
      this.line(`Shield blocks one hit per stack; max ${rewardConfig.shield.maxStacks}.`, 'hp_icon', 'S'),
      this.line(`Minor Growth permanently adds +${(rewardConfig.minorGrowth.damageBonus * 100).toFixed(1)}% weapon damage.`, 'exp_icon', 'G'),
    ]);
  }

  buildGuideHelp(): HelpSection {
    return this.section('guide', 'Guide', 'time_icon', 'G', [
      this.line('Tutorial hints are event-driven and should stay lightweight.', 'time_icon', 'T'),
      this.line('Hints can point players toward Help tabs without pausing combat.', 'art_ui_panel_bg', 'H'),
      this.line('Seen tutorial steps are saved so one-time hints do not repeat.', 'exp_icon', 'S'),
      this.line('Future mobile, Boss, endless, and reward tips should use TutorialManager.', 'hp_icon', 'G'),
    ]);
  }

  private section(
    id: HelpTabId,
    title: string,
    iconKey: string,
    fallback: string,
    lines: HelpLine[],
  ): HelpSection {
    return {
      id,
      title: this.t(`help.tabs.${id}`, title),
      iconKey,
      fallback,
      lines,
    };
  }

  private line(text: string, iconKey: string | undefined, fallback: string): HelpLine {
    return { text, iconKey, fallback };
  }

  private formatConfig(config: WeaponConfig | undefined): string {
    if (!config) {
      return 'config missing';
    }

    const parts = Object.entries(config)
      .filter(([key]) => key !== 'type')
      .filter(([key]) => key !== 'behavior')
      .filter(([key]) => key !== 'tags')
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${this.formatName(key)} ${value}`);
    const tagText = config.tags && config.tags.length > 0
      ? `tags ${config.tags.join('/')}`
      : undefined;

    return [`type ${config.type ?? 'unknown'}`, ...(tagText ? [tagText] : []), ...parts].join(', ');
  }

  private getUpgradeIconKey(upgradeId: string): string | undefined {
    if (upgradeId === 'speed_up' || upgradeId === 'max_hp_up' || upgradeId === 'pickup_range_up') {
      return upgradeId === 'max_hp_up' ? 'hp_icon' : 'exp_icon';
    }

    if (upgradeId.startsWith('add_')) {
      return this.getWeaponIconKey(upgradeId.replace(/^add_/, ''));
    }

    const passiveIcon = this.getPassiveIconKey(upgradeId);

    if (passiveIcon) {
      return passiveIcon;
    }

    const weaponId = BASE_WEAPON_IDS.find((id) => upgradeId.startsWith(`${id}_`));
    return weaponId ? this.getWeaponIconKey(weaponId) : undefined;
  }

  private getWeaponIconKey(weaponId: string): string | undefined {
    switch (weaponId) {
      case 'knife':
        return 'knife_icon';
      case 'garlic':
        return 'art_weapons_garlic_core_sheet';
      case 'bible':
        return 'art_weapons_bible_orbit_book_sheet';
      case 'axe':
        return 'art_weapons_axe_icon';
      case 'magic_wand':
        return 'art_weapons_magic_wand_icon';
      case 'thousand_edge':
        return 'art_weapons_thousand_edge_icon';
      case 'holy_wand':
        return 'art_weapons_holy_wand_icon';
      case 'death_spiral':
        return 'art_weapons_death_spiral_icon';
      case 'unholy_vespers':
        return 'art_weapons_unholy_vespers_icon';
      case 'soul_eater':
        return 'art_weapons_soul_eater_icon';
      default:
        return undefined;
    }
  }

  private getPassiveIconKey(passiveId: string): string | undefined {
    switch (passiveId) {
      case 'spinach':
        return 'art_passives_spinach_icon';
      case 'empty_tome':
        return 'art_passives_empty_tome_icon';
      case 'bracer':
        return 'art_passives_bracer_icon';
      case 'clover':
        return 'art_passives_clover_icon';
      case 'pummarola':
        return 'art_passives_pummarola_icon';
      default:
        return undefined;
    }
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  private formatName(value: string): string {
    return value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  private t(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
