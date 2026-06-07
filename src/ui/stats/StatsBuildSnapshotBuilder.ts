import { CharacterManager } from '../../character/CharacterManager';
import { CharacterRuntime } from '../../character/CharacterRuntime';
import { EndlessRewardManager } from '../../endless/EndlessRewardManager';
import { EvolutionManager } from '../../evolution/EvolutionManager';
import { I18n } from '../../i18n/I18n';
import { PassiveManager } from '../../passive/PassiveManager';
import { PlayerHealth } from '../../player/PlayerHealth';
import { PlayerStats } from '../../player/PlayerStats';
import { ExpManager } from '../../progression/ExpManager';
import { LevelManager } from '../../progression/LevelManager';
import { RelicManager } from '../../relic/RelicManager';
import { RunState } from '../../run/RunState';
import { PlaytestSettingsState } from '../../settings/PlaytestSettings';
import { RunStatsSummary } from '../../stats/RunStats';
import { WeaponManager } from '../../weapon/WeaponManager';

import { StatsBuildCard, StatsBuildSnapshot, StatsBuildStatLine } from './StatsBuildSnapshot';

export interface StatsBuildSnapshotContext {
  timeSeconds: number;
  runState: RunState;
  runStatsSummary: RunStatsSummary;
  playtestSettings: PlaytestSettingsState;
  playerHealth?: PlayerHealth;
  playerStats?: PlayerStats;
  levelManager?: LevelManager;
  expManager?: ExpManager;
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  evolutionManager?: EvolutionManager;
  relicManager?: RelicManager;
  endlessRewardManager?: EndlessRewardManager;
  characterRuntime?: CharacterRuntime;
  playerMapSlow?: {
    slowed: boolean;
    multiplier: number;
  };
}

export class StatsBuildSnapshotBuilder {
  build(context: StatsBuildSnapshotContext): StatsBuildSnapshot {
    const metadata = context.runState.getRunMetadata();
    const characterLabel = this.getCharacterLabel(metadata.characterId);
    const weaponCards = this.buildWeaponCards(context);
    const passiveCards = this.buildPassiveCards(context);
    const relicCards = this.buildRelicCards(context);
    const statusCards = this.buildStatusCards(context);

    return {
      title: I18n.t('statsBuild.title'),
      createdAtSeconds: context.timeSeconds,
      overview: this.buildOverview(context, characterLabel),
      attributes: this.buildAttributes(context),
      weapons: weaponCards,
      passives: passiveCards,
      relics: relicCards,
      status: statusCards,
      run: this.buildRun(context),
    };
  }

  static createEmpty(): StatsBuildSnapshot {
    return {
      title: I18n.t('statsBuild.title'),
      createdAtSeconds: 0,
      overview: [{ label: I18n.t('statsBuild.empty'), value: '-' }],
      attributes: [],
      weapons: [],
      passives: [],
      relics: [],
      status: [],
      run: [],
    };
  }

  private buildOverview(context: StatsBuildSnapshotContext, characterLabel: string): StatsBuildStatLine[] {
    const health = context.playerHealth;
    const level = context.levelManager?.currentLevel ?? 1;
    const currentExp = context.expManager?.currentExp ?? 0;
    const requiredExp = context.levelManager?.requiredExp ?? 0;
    const shieldStacks = health?.getShieldStacks() ?? 0;

    return [
      this.line('statsBuild.character', characterLabel),
      this.line('statsBuild.hp', `${Math.round(health?.currentHp ?? 0)} / ${Math.round(health?.maxHp ?? context.playerStats?.maxHp ?? 0)}`),
      this.line('statsBuild.shield', shieldStacks.toString()),
      this.line('statsBuild.level', `Lv.${level}`),
      this.line('statsBuild.exp', `${Math.floor(currentExp)} / ${Math.floor(requiredExp)}`),
      this.line('statsBuild.time', this.formatTime(context.timeSeconds)),
      this.line('statsBuild.score', Math.floor(context.runState.score).toString()),
      this.line('statsBuild.kills', context.runState.killCount.toString()),
      this.line('statsBuild.treasure', `${context.runState.treasureOpenCount} / ${context.runState.treasureDropCount}`),
      this.line('statsBuild.endless', context.runState.endlessStarted ? this.formatTime(context.runState.endlessSurvivalTime) : I18n.t('common.off')),
    ];
  }

  private buildAttributes(context: StatsBuildSnapshotContext): StatsBuildStatLine[] {
    const stats = context.playerStats;

    if (!stats) {
      return [];
    }

    return [
      this.line('statsBuild.maxHp', Math.round(stats.maxHp).toString()),
      this.line('statsBuild.moveSpeed', this.formatNumber(stats.moveSpeed)),
      this.line('statsBuild.pickupRange', this.formatNumber(stats.pickupRange)),
      this.line('statsBuild.expMultiplier', this.formatMultiplier(stats.expMultiplier * stats.expGainMultiplier)),
      this.line('statsBuild.damageMultiplier', this.formatMultiplier(stats.damageMultiplier)),
      this.line('statsBuild.weaponDamageMultiplier', this.formatMultiplier(stats.weaponDamageMultiplier)),
      this.line('statsBuild.physicalDamageMultiplier', this.formatMultiplier(stats.physicalDamageMultiplier)),
      this.line('statsBuild.magicDamageMultiplier', this.formatMultiplier(stats.magicDamageMultiplier)),
      this.line('statsBuild.projectileDamageMultiplier', this.formatMultiplier(stats.projectileDamageMultiplier)),
      this.line('statsBuild.auraDamageMultiplier', this.formatMultiplier(stats.auraDamageMultiplier)),
      this.line('statsBuild.orbitDamageMultiplier', this.formatMultiplier(stats.orbitDamageMultiplier)),
      this.line('statsBuild.areaDamageMultiplier', this.formatMultiplier(stats.areaDamageMultiplier)),
      this.line('statsBuild.explosionDamageMultiplier', this.formatMultiplier(stats.explosionDamageMultiplier)),
      this.line('statsBuild.bossDamageMultiplier', this.formatMultiplier(stats.bossDamageMultiplier)),
      this.line('statsBuild.eliteDamageMultiplier', this.formatMultiplier(stats.eliteDamageMultiplier)),
      this.line('statsBuild.cooldownMultiplier', this.formatMultiplier(stats.cooldownMultiplier)),
      this.line('statsBuild.projectileSpeedMultiplier', this.formatMultiplier(stats.projectileSpeedMultiplier)),
      this.line('statsBuild.knockbackPowerMultiplier', this.formatMultiplier(stats.knockbackPowerMultiplier)),
      this.line('statsBuild.damageTakenMultiplier', this.formatMultiplier(stats.damageTakenMultiplier)),
      this.line('statsBuild.armor', this.formatNumber(stats.armorFlat)),
      this.line('statsBuild.dodge', this.formatPercent(stats.dodgeChance)),
      this.line('statsBuild.critChance', this.formatPercent(stats.critChance)),
      this.line('statsBuild.critDamage', this.formatMultiplier(stats.critDamageMultiplier)),
      this.line('statsBuild.healing', this.formatMultiplier(stats.healingMultiplier)),
      this.line('statsBuild.shieldGain', this.formatMultiplier(stats.shieldGainMultiplier)),
      this.line('statsBuild.treasureDrop', this.formatMultiplier(stats.treasureDropMultiplier)),
      this.line('statsBuild.upgradeChoices', `+${stats.upgradeChoiceBonus}`),
    ];
  }

  private buildWeaponCards(context: StatsBuildSnapshotContext): StatsBuildCard[] {
    const weaponManager = context.weaponManager;
    const passiveManager = context.passiveManager;
    const evolutionManager = context.evolutionManager;

    if (!weaponManager || !passiveManager || !evolutionManager) {
      return [];
    }

    return weaponManager.getWeaponDetailInfo({
      getPassiveLevel: (passiveId) => passiveManager.getPassiveLevel(passiveId),
      getPassiveName: (passiveId) => passiveManager.getPassiveName(passiveId),
      getRequiredPassiveForWeapon: (weaponId) => evolutionManager.getRequiredPassiveForWeapon(weaponId),
    }).map((weapon) => ({
      id: weapon.displayWeaponId,
      title: weapon.displayName,
      subtitle: weapon.evolved ? I18n.t('statsBuild.evolved') : I18n.t('statsBuild.weapon'),
      iconKey: weapon.iconKey,
      fallback: this.getFallback(weapon.displayName),
      badges: [
        `Lv.${weapon.level}/${weapon.maxLevel}`,
        ...(weapon.evolved ? [I18n.t('statsBuild.evolved')] : []),
      ],
      relatedIcons: weapon.requiredPassiveId ? [{
        id: weapon.requiredPassiveId,
        label: weapon.requiredPassiveName ?? weapon.requiredPassiveId,
        iconKey: weapon.requiredPassiveIconKey,
        fallback: this.getFallback(weapon.requiredPassiveName ?? weapon.requiredPassiveId),
      }] : [],
      rows: [
        this.line('statsBuild.level', `Lv.${weapon.level}/${weapon.maxLevel}`),
        ...(weapon.requiredPassiveId ? [
          this.line('statsBuild.requires', `${weapon.requiredPassiveName ?? weapon.requiredPassiveId} Lv.${weapon.requiredPassiveLevel ?? 0}`),
        ] : []),
        ...Object.entries(weapon.stats).slice(0, 8).map(([label, value]) => ({
          label: this.formatStatLabel(label),
          value: this.formatNumber(value),
        })),
        this.line('statsBuild.totalDamage', this.formatNumber(weapon.runtimeStats.damageDealt)),
        this.line('statsBuild.hits', weapon.runtimeStats.hits.toString()),
        this.line('statsBuild.kills', weapon.runtimeStats.kills.toString()),
      ],
    }));
  }

  private buildPassiveCards(context: StatsBuildSnapshotContext): StatsBuildCard[] {
    const passiveManager = context.passiveManager;
    const evolutionManager = context.evolutionManager;

    if (!passiveManager || !evolutionManager) {
      return [];
    }

    return passiveManager.getPassiveDetailInfo({
      getRelatedWeaponIds: (passiveId) => evolutionManager.getWeaponsForPassive(passiveId)
        .map((rule) => rule.evolvedWeaponId),
    }).map((passive) => ({
      id: passive.passiveId,
      title: passive.displayName,
      subtitle: I18n.t('statsBuild.passive'),
      iconKey: passive.iconKey,
      fallback: this.getFallback(passive.displayName),
      badges: [`Lv.${passive.level}/${passive.maxLevel}`],
      relatedIcons: passive.relatedWeaponIds.map((weaponId) => ({
        id: weaponId,
        label: this.formatId(weaponId),
        fallback: this.getFallback(weaponId),
      })),
      rows: [
        this.line('statsBuild.level', `Lv.${passive.level}/${passive.maxLevel}`),
        {
          label: this.translatePassiveEffectLabel(passive.effectLabel),
          value: passive.effectValue || '-',
        },
        this.line('statsBuild.relatedEvolutions', passive.relatedWeaponIds.length.toString()),
      ],
    }));
  }

  private buildRelicCards(context: StatsBuildSnapshotContext): StatsBuildCard[] {
    const relicManager = context.relicManager;

    if (!relicManager) {
      return [];
    }

    const modifiers = relicManager.getStatModifiers();
    return relicManager.getRelics().map((relic) => {
      const display = relicManager.getRelicDisplayInfo().find((item) => item.id === relic.id);
      return {
        id: relic.id,
        title: display?.name ?? this.formatId(relic.id),
        subtitle: I18n.t('statsBuild.relic'),
        iconKey: display?.iconKey,
        fallback: this.getFallback(display?.name ?? relic.id),
        badges: [I18n.t(`relic.rarity.${relic.rarity}`)],
        description: display?.description,
        rows: [
          this.line('statsBuild.rarity', I18n.t(`relic.rarity.${relic.rarity}`)),
          ...relic.effects.map((effect) => this.describeRelicEffect(effect.type)),
          ...(relic.id === 'void_compass' ? [this.line('statsBuild.pickupRange', this.formatMultiplier(modifiers.pickupRangeMultiplier))] : []),
          ...(relic.id === 'golden_scarab' ? [this.line('statsBuild.treasureScore', this.formatMultiplier(modifiers.treasureScoreMultiplier))] : []),
          ...(relic.id === 'blood_pact' ? [this.line('statsBuild.damageMultiplier', this.formatMultiplier(modifiers.damageMultiplier))] : []),
        ],
      };
    });
  }

  private buildStatusCards(context: StatsBuildSnapshotContext): StatsBuildCard[] {
    const cards: StatsBuildCard[] = [];
    const healthSnapshot = context.playerHealth?.getStatusSnapshot();
    const pickupStatus = context.characterRuntime?.getTemporaryPickupRangeStatus();
    const overdrive = context.endlessRewardManager?.getOverdriveStatus();
    const enemySlow = context.endlessRewardManager?.getEnemySlowStatus();
    const autoReward = context.endlessRewardManager?.getAutoRewardContext();

    if (healthSnapshot && healthSnapshot.invulnerableRemainingMs > 0) {
      cards.push(this.statusCard('invulnerable', 'statsBuild.invulnerable', [
        this.line('statsBuild.remaining', this.formatSeconds(healthSnapshot.invulnerableRemainingMs / 1000)),
      ]));
    }

    if (healthSnapshot && healthSnapshot.shieldStacks > 0) {
      cards.push(this.statusCard('shield', 'statsBuild.shield', [
        this.line('statsBuild.stacks', healthSnapshot.shieldStacks.toString()),
      ]));
    }

    healthSnapshot?.temporaryDamageTakenMultipliers.forEach((effect, index) => {
      cards.push(this.statusCard(`damage-taken-${index}`, 'statsBuild.tempDamageTaken', [
        this.line('statsBuild.damageTakenMultiplier', this.formatMultiplier(effect.multiplier)),
        this.line('statsBuild.remaining', this.formatSeconds(effect.remainingMs / 1000)),
      ]));
    });

    if (overdrive?.active) {
      cards.push(this.statusCard('overdrive', 'statsBuild.overdrive', [
        this.line('statsBuild.remaining', this.formatSeconds(overdrive.remainingSeconds)),
      ]));
    } else if (overdrive && overdrive.cooldownRemainingSeconds > 0) {
      cards.push(this.statusCard('overdrive-cooldown', 'statsBuild.overdrive', [
        this.line('statsBuild.cooldown', this.formatSeconds(overdrive.cooldownRemainingSeconds)),
      ]));
    }

    if (enemySlow?.active) {
      cards.push(this.statusCard('enemy-slow', 'statsBuild.enemySlow', [
        this.line('statsBuild.remaining', this.formatSeconds(enemySlow.remainingSeconds)),
      ]));
    } else if (enemySlow && enemySlow.cooldownRemainingSeconds > 0) {
      cards.push(this.statusCard('enemy-slow-cooldown', 'statsBuild.enemySlow', [
        this.line('statsBuild.cooldown', this.formatSeconds(enemySlow.cooldownRemainingSeconds)),
      ]));
    }

    if (pickupStatus?.active) {
      cards.push(this.statusCard('pickup-vacuum', 'statsBuild.pickupVacuum', [
        this.line('statsBuild.pickupRange', this.formatMultiplier(pickupStatus.multiplier)),
        this.line('statsBuild.remaining', this.formatSeconds(pickupStatus.remainingMs / 1000)),
      ]));
    } else if (autoReward && autoReward.vacuumCooldownRemainingSeconds > 0) {
      cards.push(this.statusCard('pickup-vacuum-cooldown', 'statsBuild.pickupVacuum', [
        this.line('statsBuild.cooldown', this.formatSeconds(autoReward.vacuumCooldownRemainingSeconds)),
      ]));
    }

    if (context.playerMapSlow?.slowed) {
      cards.push(this.statusCard('map-slow', 'statsBuild.mapSlow', [
        this.line('statsBuild.moveSpeed', this.formatMultiplier(context.playerMapSlow.multiplier)),
      ]));
    }

    return cards;
  }

  private buildRun(context: StatsBuildSnapshotContext): StatsBuildStatLine[] {
    const runState = context.runState;
    const stats = context.runStatsSummary;

    return [
      this.line('statsBuild.score', Math.floor(runState.score).toString()),
      this.line('statsBuild.normalEnemyScore', Math.floor(runState.normalEnemyScore).toString()),
      this.line('statsBuild.miniBossScore', Math.floor(runState.miniBossScore).toString()),
      this.line('statsBuild.finalBossScore', Math.floor(runState.finalBossScore).toString()),
      this.line('statsBuild.treasureScore', Math.floor(runState.treasureScore).toString()),
      this.line('statsBuild.kills', runState.killCount.toString()),
      this.line('statsBuild.damageTaken', this.formatNumber(stats.damageTaken)),
      this.line('statsBuild.lowestHp', this.formatNumber(stats.lowestHp)),
      this.line('statsBuild.levelUpUpgrades', runState.levelUpUpgradeCount.toString()),
      this.line('statsBuild.chestUpgrades', runState.chestUpgradeCount.toString()),
      this.line('statsBuild.chestEvolutions', runState.chestEvolutionCount.toString()),
      this.line('statsBuild.relics', (context.relicManager?.getRelicIds().length ?? 0).toString()),
      this.line('statsBuild.endlessScaling', `Lv.${runState.endlessScalingLevel}`),
      this.line('statsBuild.endlessBosses', `${runState.endlessBossKillCount}/${runState.endlessBossSpawnCount}`),
      this.line('statsBuild.bossDashes', `${runState.bossDashHitCount}/${runState.bossDashCount}`),
      this.line('statsBuild.gameEvents', runState.gameEventCount.toString()),
    ];
  }

  private statusCard(id: string, titleKey: string, rows: StatsBuildStatLine[]): StatsBuildCard {
    return {
      id,
      title: I18n.t(titleKey),
      subtitle: I18n.t('statsBuild.status'),
      fallback: this.getFallback(I18n.t(titleKey)),
      rows,
    };
  }

  private line(labelKey: string, value: string): StatsBuildStatLine {
    return {
      label: I18n.t(labelKey),
      value,
    };
  }

  private describeRelicEffect(type: string): StatsBuildStatLine {
    const key = `statsBuild.relicEffect.${type}`;
    return {
      label: I18n.t('statsBuild.effect'),
      value: this.translateOrFallback(key, this.formatId(type)),
    };
  }

  private getCharacterLabel(characterId: string): string {
    const character = new CharacterManager()
      .listCharacters()
      .find((definition) => definition.id === characterId);

    return character ? I18n.t(character.nameKey) : this.formatId(characterId);
  }

  private translatePassiveEffectLabel(label: string): string {
    const key = label
      .replace(/\s+/g, '')
      .replace(/^./, (first) => first.toLowerCase());

    return this.translateOrFallback(`statsBuild.passiveEffect.${key}`, label);
  }

  private formatStatLabel(label: string): string {
    return this.translateOrFallback(`statsBuild.weaponStat.${label}`, this.formatId(label));
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(timeSeconds));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private formatSeconds(seconds: number): string {
    return `${Math.max(0, seconds).toFixed(1)}s`;
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }

    return Math.abs(value) >= 100 ? Math.round(value).toString() : value.toFixed(2).replace(/\.00$/, '');
  }

  private formatMultiplier(value: number): string {
    return `${this.formatNumber(value)}x`;
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private formatId(id: string): string {
    return id
      .split('_')
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }

  private getFallback(label: string): string {
    const clean = label.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return clean.slice(0, 2) || '?';
  }

  private translateOrFallback(key: string, fallback: string): string {
    const translated = I18n.t(key);
    return translated === key ? fallback : translated;
  }
}
