import {
  DEFAULT_ASSET_KEY_MAP,
  HELP_ICON_KEYS,
  type AssetKeyEntry,
  type WeaponAssetEntry,
} from '../assets/AssetKeyMap';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import { WeaponConfig } from '../core/domain/WeaponTypes';
import { I18n } from '../i18n/I18n';
import { TreasureManager } from '../pickup/TreasureManager';

import { HelpLine, HelpSection, HelpTabId } from './HelpTab';

const BASE_WEAPON_IDS = ['knife', 'garlic', 'bible', 'magic_wand', 'axe'];

export class HelpContentBuilder {
  buildSections(): HelpSection[] {
    ContentBootstrap.ensureInitialized();

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
    return this.section('controls', 'Controls', HELP_ICON_KEYS.time, 'C', [
      this.line('WASD / Arrow Keys: Move', HELP_ICON_KEYS.time, 'M'),
      this.line('Hold Left Mouse: Move toward cursor', HELP_ICON_KEYS.time, 'M'),
      this.line('ESC: Pause', HELP_ICON_KEYS.time, 'P'),
      this.line('Collect EXP gems to level up', HELP_ICON_KEYS.experience, 'XP'),
      this.line('Open treasure chests for bonus rewards', HELP_ICON_KEYS.treasureChest, 'T'),
      this.line('Defeat the Boss to win; Endless continues after Boss', HELP_ICON_KEYS.boss, 'B'),
    ]);
  }

  buildWeaponsHelp(): HelpSection {
    const weapons = ContentRegistry.listWeapons();
    const lines = BASE_WEAPON_IDS.map((weaponId) => {
      const config = weapons[weaponId];
      return this.line(
        `${this.formatName(weaponId)}: ${this.formatConfig(config)}`,
        this.getWeaponIconKey(weaponId),
        this.getInitials(weaponId),
      );
    });

    return this.section('weapons', 'Weapons', this.getWeaponIconKey('knife'), 'W', lines);
  }

  buildUiHelp(): HelpSection {
    return this.section('ui', 'UI', HELP_ICON_KEYS.health, 'UI', [
      this.line('HUD pairs each weapon with its matching passive.', HELP_ICON_KEYS.health, 'H'),
      this.line('Pause opens Resume, Restart, Settings, Help, and Stats / Build.', HELP_ICON_KEYS.time, 'P'),
      this.line('Stats / Build shows character, weapon, and passive details.', HELP_ICON_KEYS.experience, 'S'),
      this.line('Settings controls language, audio, Auto, Fast, and Endless.', HELP_ICON_KEYS.panel, 'S'),
      this.line('Result can download current or buffered CSV logs.', HELP_ICON_KEYS.panel, 'CSV'),
    ]);
  }

  buildEvolutionHelp(): HelpSection {
    const lines = ContentRegistry.listEvolutionRules().map((rule) => this.line(
      `${this.formatName(rule.baseWeaponId)} Lv.${rule.requiredWeaponUpgradeTotal}`
        + ` + ${this.formatName(rule.requiredPassiveId)} Lv.${rule.requiredPassiveLevel}`
        + ` -> ${this.formatName(rule.evolvedWeaponId)} via treasure`,
      this.getWeaponIconKey(rule.evolvedWeaponId),
      this.getInitials(rule.evolvedWeaponId),
    ));

    return this.section('evolution', 'Evolution', this.getWeaponIconKey('thousand_edge'), 'E', lines);
  }

  buildPassivesHelp(): HelpSection {
    const relatedWeaponsByPassive = new Map<string, string[]>();

    for (const rule of ContentRegistry.listEvolutionRules()) {
      const related = relatedWeaponsByPassive.get(rule.requiredPassiveId) ?? [];
      related.push(rule.baseWeaponId);
      relatedWeaponsByPassive.set(rule.requiredPassiveId, related);
    }

    const lines = ContentRegistry.listPassives().map((passive) => {
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

    return this.section('passives', 'Passives', this.getPassiveIconKey('spinach'), 'P', lines);
  }

  buildUpgradesHelp(): HelpSection {
    const lines = ContentRegistry.getUpgradeOptions().map((upgrade) => this.line(
      `${upgrade.name}: ${upgrade.description}`,
      this.getUpgradeIconKey(upgrade.id),
      this.getInitials(upgrade.id),
    ));

    return this.section('upgrades', 'Upgrades', HELP_ICON_KEYS.experience, 'U', lines);
  }

  buildTreasuresHelp(): HelpSection {
    const config = TreasureManager.getTreasureConfig();
    const dropRate = Math.round(config.normalDropChance * 100);

    return this.section('treasures', 'Treasure', HELP_ICON_KEYS.treasureChest, 'T', [
      this.line(`Normal enemies can drop chests at ${dropRate}% before bonuses.`, HELP_ICON_KEYS.treasureChest, 'T'),
      this.line('Eligible weapon evolution is resolved before normal chest upgrades.', this.getWeaponIconKey('thousand_edge'), 'E'),
      this.line('When no normal rewards remain in Endless, chests use Endless rewards.', HELP_ICON_KEYS.time, '∞'),
      this.line(`Endless chest drops are capped at ${config.endlessMaxDropsPerWindow} per ${config.endlessDropWindowSeconds}s window.`, HELP_ICON_KEYS.treasureChest, 'T'),
    ]);
  }

  buildEndlessHelp(): HelpSection {
    const rewardConfig = EndlessRewardManager.getRewardConfig();

    return this.section('endless', 'Endless', HELP_ICON_KEYS.time, '∞', [
      this.line('After the final Boss, enemies keep spawning and scaling over time.', HELP_ICON_KEYS.boss, 'B'),
      this.line(`Emergency Heal restores ${rewardConfig.heal.amount} HP.`, HELP_ICON_KEYS.health, 'H'),
      this.line(`Overdrive: +${Math.round((rewardConfig.overdrive.multiplier - 1) * 100)}% damage for ${rewardConfig.overdrive.durationSeconds}s; cooldown ${rewardConfig.overdrive.cooldownSeconds}s.`, this.getWeaponIconKey('death_spiral'), 'O'),
      this.line(`Time Slow: enemy speed x${rewardConfig.enemySlow.multiplier} for ${rewardConfig.enemySlow.durationSeconds}s; cooldown ${rewardConfig.enemySlow.cooldownSeconds}s.`, HELP_ICON_KEYS.time, 'S'),
      this.line(`Shield blocks one hit per stack; max ${rewardConfig.shield.maxStacks}.`, HELP_ICON_KEYS.health, 'S'),
      this.line(`Minor Growth permanently adds +${(rewardConfig.minorGrowth.damageBonus * 100).toFixed(1)}% weapon damage.`, HELP_ICON_KEYS.experience, 'G'),
    ]);
  }

  buildGuideHelp(): HelpSection {
    return this.section('guide', 'Guide', HELP_ICON_KEYS.time, 'G', [
      this.line('Tutorial hints are event-driven and should stay lightweight.', HELP_ICON_KEYS.time, 'T'),
      this.line('Hints can point players toward Help tabs without pausing combat.', HELP_ICON_KEYS.panel, 'H'),
      this.line('Seen tutorial steps are saved so one-time hints do not repeat.', HELP_ICON_KEYS.experience, 'S'),
      this.line('Future mobile, Boss, endless, and reward tips should use TutorialManager.', HELP_ICON_KEYS.health, 'G'),
    ]);
  }

  private section(
    id: HelpTabId,
    title: string,
    iconKey: string | undefined,
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
      return upgradeId === 'max_hp_up' ? HELP_ICON_KEYS.health : HELP_ICON_KEYS.experience;
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
    const weaponAssets = DEFAULT_ASSET_KEY_MAP.weapons as Record<string, WeaponAssetEntry>;
    const entry = weaponAssets[weaponId]?.icon;

    return entry?.fallbacks?.[0] ?? entry?.primary;
  }

  private getPassiveIconKey(passiveId: string): string | undefined {
    const passiveAssets = DEFAULT_ASSET_KEY_MAP.passives as Record<string, AssetKeyEntry>;
    const entry = passiveAssets[passiveId];

    return entry?.fallbacks?.[0] ?? entry?.primary;
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
