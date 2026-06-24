import { I18n } from '../i18n/I18n';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { RunState } from '../run/RunState';

import { WeaponManager } from '../weapon/WeaponManager';

type EndlessRewardId =
  | 'endless_heal'
  | 'endless_overdrive'
  | 'endless_growth_damage'
  | 'endless_enemy_slow'
  | 'endless_shield'
  | 'vacuum_all_pickups';

export class EndlessRewardManager {
  private static activeManager?: EndlessRewardManager;
  private static readonly HEAL_AMOUNT = 30;
  private static readonly OVERDRIVE_MULTIPLIER = 1.4;
  private static readonly OVERDRIVE_DURATION_SECONDS = 8;
  private static readonly OVERDRIVE_COOLDOWN_SECONDS = 25;
  private static readonly GROWTH_DAMAGE_BONUS = 0.005;
  private static readonly ENEMY_SLOW_MULTIPLIER = 0.5;
  private static readonly ENEMY_SLOW_DURATION_SECONDS = 6;
  private static readonly ENEMY_SLOW_COOLDOWN_SECONDS = 20;
  private static readonly MAX_SHIELD_STACKS = 20;
  private static readonly VACUUM_PICKUP_RANGE_MULTIPLIER = 80;
  private static readonly VACUUM_DURATION_MS = 2500;
  private static readonly VACUUM_MIN_GAME_TIME_SECONDS = 300;
  private static readonly VACUUM_SELECTION_COOLDOWN_SECONDS = 60;

  private overdriveActiveUntilSeconds = 0;
  private overdriveCooldownUntilSeconds = 0;
  private enemySlowActiveUntilSeconds = 0;
  private enemySlowCooldownUntilSeconds = 0;
  private lastSlowSyncTimeSeconds = 0;
  private lastSyncTimeSeconds = 0;
  private lastVacuumSelectedAtSeconds = Number.NEGATIVE_INFINITY;
  private shieldStacks = 0;

  constructor(
    private readonly params: {
      runState: RunState;
      upgradeApplier: UpgradeApplier;
      weaponManager: WeaponManager;
      getGameTimeSeconds(): number;
      applyTemporaryPickupRangeMultiplier?: (multiplier: number, durationMs: number, source?: string) => void;
    },
  ) {
    this.lastSyncTimeSeconds = params.getGameTimeSeconds();
    this.lastSlowSyncTimeSeconds = this.lastSyncTimeSeconds;
    EndlessRewardManager.activeManager = this;
    this.params.weaponManager.setEndlessDamageMultiplierProvider(() => (
      this.getTotalDamageMultiplier()
    ));
  }

  static getGlobalEnemySpeedMultiplier(): number {
    return EndlessRewardManager.activeManager?.getEnemySpeedMultiplier() ?? 1;
  }

  static getRewardConfig(): {
    heal: { amount: number };
    overdrive: { multiplier: number; durationSeconds: number; cooldownSeconds: number };
    enemySlow: { multiplier: number; durationSeconds: number; cooldownSeconds: number };
    shield: { maxStacks: number };
    minorGrowth: { damageBonus: number };
  } {
    return {
      heal: { amount: EndlessRewardManager.HEAL_AMOUNT },
      overdrive: {
        multiplier: EndlessRewardManager.OVERDRIVE_MULTIPLIER,
        durationSeconds: EndlessRewardManager.OVERDRIVE_DURATION_SECONDS,
        cooldownSeconds: EndlessRewardManager.OVERDRIVE_COOLDOWN_SECONDS,
      },
      enemySlow: {
        multiplier: EndlessRewardManager.ENEMY_SLOW_MULTIPLIER,
        durationSeconds: EndlessRewardManager.ENEMY_SLOW_DURATION_SECONDS,
        cooldownSeconds: EndlessRewardManager.ENEMY_SLOW_COOLDOWN_SECONDS,
      },
      shield: { maxStacks: EndlessRewardManager.MAX_SHIELD_STACKS },
      minorGrowth: { damageBonus: EndlessRewardManager.GROWTH_DAMAGE_BONUS },
    };
  }

  static consumeGlobalShieldStack(incomingDamage: number): boolean {
    return EndlessRewardManager.activeManager?.consumeShieldStack(incomingDamage) ?? false;
  }

  static getGlobalShieldStatus(): {
    stacks: number;
    maxStacks: number;
    absorbedDamage: number;
    consumed: number;
  } {
    const manager = EndlessRewardManager.activeManager;

    if (!manager) {
      return {
        stacks: 0,
        maxStacks: EndlessRewardManager.MAX_SHIELD_STACKS,
        absorbedDamage: 0,
        consumed: 0,
      };
    }

    return {
      stacks: manager.getShieldStacks(),
      maxStacks: manager.getMaxShieldStacks(),
      absorbedDamage: manager.params.runState.endlessShieldAbsorbedDamage,
      consumed: manager.params.runState.endlessShieldConsumed,
    };
  }

  getRewardOptions(): UpgradeOption[] {
    const options: UpgradeOption[] = [
      {
        id: 'endless_heal',
        name: I18n.t('upgrade.endless_heal.name'),
        description: I18n.t('upgrade.endless_heal.description', { amount: EndlessRewardManager.HEAL_AMOUNT }),
      },
    ];

    if (this.isOverdriveAvailable()) {
      options.push({
        id: 'endless_overdrive',
        name: I18n.t('upgrade.endless_overdrive.name'),
        description: I18n.t('upgrade.endless_overdrive.description', {
          duration: EndlessRewardManager.OVERDRIVE_DURATION_SECONDS,
          cooldown: EndlessRewardManager.OVERDRIVE_COOLDOWN_SECONDS,
        }),
      });
    }

    if (this.isEnemySlowAvailable()) {
      options.push({
        id: 'endless_enemy_slow',
        name: I18n.t('upgrade.endless_enemy_slow.name'),
        description: I18n.t('upgrade.endless_enemy_slow.description', {
          duration: EndlessRewardManager.ENEMY_SLOW_DURATION_SECONDS,
          cooldown: EndlessRewardManager.ENEMY_SLOW_COOLDOWN_SECONDS,
        }),
      });
    }

    if (this.shieldStacks < EndlessRewardManager.MAX_SHIELD_STACKS) {
      options.push({
        id: 'endless_shield',
        name: I18n.t('upgrade.endless_shield.name'),
        description: I18n.t('upgrade.endless_shield.description', { maxStacks: EndlessRewardManager.MAX_SHIELD_STACKS }),
      });
    }

    options.push({
      id: 'endless_growth_damage',
      name: I18n.t('upgrade.endless_growth_damage.name'),
      description: I18n.t('upgrade.endless_growth_damage.description'),
    });

    return options.slice(0, 3);
  }

  getChestFallbackRewardOptions(): UpgradeOption[] {
    const options = [...this.getRewardOptions()];

    if (this.isVacuumAvailable()) {
      options.push({
        id: 'vacuum_all_pickups',
        name: I18n.t('upgrade.vacuum_all_pickups.name'),
        description: I18n.t('upgrade.vacuum_all_pickups.description', {
          multiplier: EndlessRewardManager.VACUUM_PICKUP_RANGE_MULTIPLIER,
          duration: EndlessRewardManager.VACUUM_DURATION_MS / 1000,
        }),
      });
    }

    return options;
  }

  getAutoRewardContext(): {
    started: boolean;
    shieldStacks: number;
    maxShieldStacks: number;
    overdriveAvailable: boolean;
    enemySlowAvailable: boolean;
    vacuumAvailable: boolean;
    vacuumCooldownRemainingSeconds: number;
  } {
    return {
      started: this.params.runState.endlessStarted,
      shieldStacks: this.shieldStacks,
      maxShieldStacks: EndlessRewardManager.MAX_SHIELD_STACKS,
      overdriveAvailable: this.isOverdriveAvailable(),
      enemySlowAvailable: this.isEnemySlowAvailable(),
      vacuumAvailable: this.isVacuumAvailable(),
      vacuumCooldownRemainingSeconds: this.getVacuumCooldownRemainingSeconds(),
    };
  }

  isRewardId(rewardId: string): rewardId is EndlessRewardId {
    return rewardId === 'endless_heal'
      || rewardId === 'endless_overdrive'
      || rewardId === 'endless_growth_damage'
      || rewardId === 'endless_enemy_slow'
      || rewardId === 'endless_shield'
      || rewardId === 'vacuum_all_pickups';
  }

  applyReward(rewardId: string, source: 'level' | 'chest'): boolean {
    if (!this.isRewardId(rewardId)) {
      return false;
    }

    if (
      rewardId !== 'vacuum_all_pickups'
      && !this.params.runState.endlessStarted
    ) {
      return false;
    }

    return this.applyRewardInternal(rewardId, source);
  }

  applyChestFallbackReward(preferredRewardId?: string): string | null {
    const rewardIds = [
      ...(preferredRewardId && this.isRewardId(preferredRewardId) ? [preferredRewardId] : []),
      ...this.getChestFallbackRewardOptions().map((option) => option.id),
      'vacuum_all_pickups',
      'endless_shield',
      'endless_growth_damage',
    ].filter((rewardId, index, rewardIds) => rewardIds.indexOf(rewardId) === index);

    for (const rewardId of rewardIds) {
      if (!this.isRewardId(rewardId)) {
        continue;
      }

      if (this.applyRewardInternal(rewardId, 'chest')) {
        return rewardId;
      }
    }

    return null;
  }

  private applyRewardInternal(rewardId: EndlessRewardId, source: 'level' | 'chest'): boolean {
    switch (rewardId) {
      case 'endless_heal':
        return this.applyHeal(source);
      case 'endless_overdrive':
        return this.applyOverdrive(source);
      case 'endless_growth_damage':
        return this.applyGrowth(source);
      case 'endless_enemy_slow':
        return this.applyEnemySlow(source);
      case 'endless_shield':
        return this.applyShield(source);
      case 'vacuum_all_pickups':
        return this.applyVacuumAllPickups(source);
      default:
        return false;
    }
  }

  isOverdriveAvailable(): boolean {
    this.syncOverdriveState();

    return !this.isOverdriveActive()
      && this.params.getGameTimeSeconds() >= this.overdriveCooldownUntilSeconds;
  }

  getOverdriveMultiplier(): number {
    this.syncOverdriveState();

    return this.isOverdriveActive()
      ? EndlessRewardManager.OVERDRIVE_MULTIPLIER
      : 1;
  }

  getPermanentDamageMultiplier(): number {
    return this.params.runState.endlessPermanentDamageMultiplier;
  }

  getTotalDamageMultiplier(): number {
    return this.getPermanentDamageMultiplier() * this.getOverdriveMultiplier();
  }

  isEnemySlowAvailable(): boolean {
    this.syncEnemySlowState();

    return !this.isEnemySlowActive()
      && this.params.getGameTimeSeconds() >= this.enemySlowCooldownUntilSeconds;
  }

  getEnemySpeedMultiplier(): number {
    this.syncEnemySlowState();

    return this.isEnemySlowActive()
      ? EndlessRewardManager.ENEMY_SLOW_MULTIPLIER
      : 1;
  }

  getEnemySlowStatus(): {
    active: boolean;
    remainingSeconds: number;
    cooldownRemainingSeconds: number;
  } {
    this.syncEnemySlowState();

    const now = this.params.getGameTimeSeconds();

    return {
      active: this.isEnemySlowActive(),
      remainingSeconds: Math.max(0, this.enemySlowActiveUntilSeconds - now),
      cooldownRemainingSeconds: Math.max(0, this.enemySlowCooldownUntilSeconds - now),
    };
  }

  addShieldStack(count = 1): boolean {
    if (this.shieldStacks >= EndlessRewardManager.MAX_SHIELD_STACKS) {
      return false;
    }

    const nextStacks = Math.min(
      EndlessRewardManager.MAX_SHIELD_STACKS,
      this.shieldStacks + Math.max(1, count),
    );
    const gained = nextStacks - this.shieldStacks;

    if (gained <= 0) {
      return false;
    }

    this.shieldStacks = nextStacks;
    this.params.runState.recordEndlessShieldGained(gained, this.shieldStacks);
    return true;
  }

  consumeShieldStack(incomingDamage: number): boolean {
    if (this.shieldStacks <= 0) {
      return false;
    }

    this.shieldStacks -= 1;
    this.params.runState.recordEndlessShieldConsumed(
      Math.max(0, incomingDamage),
      this.shieldStacks,
    );
    return true;
  }

  getShieldStacks(): number {
    return this.shieldStacks;
  }

  getMaxShieldStacks(): number {
    return EndlessRewardManager.MAX_SHIELD_STACKS;
  }

  getOverdriveStatus(): {
    active: boolean;
    remainingSeconds: number;
    cooldownRemainingSeconds: number;
  } {
    this.syncOverdriveState();

    const now = this.params.getGameTimeSeconds();

    return {
      active: this.isOverdriveActive(),
      remainingSeconds: Math.max(0, this.overdriveActiveUntilSeconds - now),
      cooldownRemainingSeconds: Math.max(0, this.overdriveCooldownUntilSeconds - now),
    };
  }

  private applyHeal(source: 'level' | 'chest'): boolean {
    const healed = this.params.upgradeApplier.applyEndlessHeal(
      EndlessRewardManager.HEAL_AMOUNT,
    );

    if (!healed) {
      return false;
    }

    this.params.runState.recordEndlessReward('endless_heal', source);
    this.params.runState.recordEndlessHeal();
    return true;
  }

  private applyOverdrive(source: 'level' | 'chest'): boolean {
    if (!this.isOverdriveAvailable()) {
      return false;
    }

    const now = this.params.getGameTimeSeconds();
    this.overdriveActiveUntilSeconds = now + EndlessRewardManager.OVERDRIVE_DURATION_SECONDS;
    this.overdriveCooldownUntilSeconds = now + EndlessRewardManager.OVERDRIVE_COOLDOWN_SECONDS;
    this.lastSyncTimeSeconds = now;
    this.params.runState.recordEndlessReward('endless_overdrive', source);
    this.params.runState.recordEndlessOverdrive();
    return true;
  }

  private applyGrowth(source: 'level' | 'chest'): boolean {
    this.params.runState.recordEndlessReward('endless_growth_damage', source);
    this.params.runState.recordEndlessGrowth(
      EndlessRewardManager.GROWTH_DAMAGE_BONUS,
    );
    return true;
  }

  private applyEnemySlow(source: 'level' | 'chest'): boolean {
    if (!this.isEnemySlowAvailable()) {
      return false;
    }

    const now = this.params.getGameTimeSeconds();
    this.enemySlowActiveUntilSeconds = now + EndlessRewardManager.ENEMY_SLOW_DURATION_SECONDS;
    this.enemySlowCooldownUntilSeconds = now + EndlessRewardManager.ENEMY_SLOW_COOLDOWN_SECONDS;
    this.lastSlowSyncTimeSeconds = now;
    this.params.runState.recordEndlessReward('endless_enemy_slow', source);
    this.params.runState.recordEndlessEnemySlow();
    return true;
  }

  private applyShield(source: 'level' | 'chest'): boolean {
    if (!this.addShieldStack()) {
      return false;
    }

    this.params.runState.recordEndlessReward('endless_shield', source);
    return true;
  }

  private applyVacuumAllPickups(source: 'level' | 'chest'): boolean {
    if (!this.isVacuumAvailable() || !this.params.applyTemporaryPickupRangeMultiplier) {
      return false;
    }

    this.params.applyTemporaryPickupRangeMultiplier(
      EndlessRewardManager.VACUUM_PICKUP_RANGE_MULTIPLIER,
      EndlessRewardManager.VACUUM_DURATION_MS,
      'vacuum_all_pickups',
    );
    this.lastVacuumSelectedAtSeconds = this.params.getGameTimeSeconds();
    this.params.runState.recordEndlessReward('vacuum_all_pickups', source);
    return true;
  }

  private isVacuumAvailable(): boolean {
    return this.params.getGameTimeSeconds() >= EndlessRewardManager.VACUUM_MIN_GAME_TIME_SECONDS
      && this.getVacuumCooldownRemainingSeconds() <= 0;
  }

  private getVacuumCooldownRemainingSeconds(): number {
    const elapsed = this.params.getGameTimeSeconds() - this.lastVacuumSelectedAtSeconds;

    return Math.max(0, EndlessRewardManager.VACUUM_SELECTION_COOLDOWN_SECONDS - elapsed);
  }

  private syncOverdriveState(): void {
    const now = this.params.getGameTimeSeconds();
    const elapsedSeconds = Math.max(0, now - this.lastSyncTimeSeconds);

    if (elapsedSeconds > 0 && this.lastSyncTimeSeconds < this.overdriveActiveUntilSeconds) {
      const activeEnd = Math.min(now, this.overdriveActiveUntilSeconds);
      const activeElapsed = Math.max(0, activeEnd - this.lastSyncTimeSeconds);
      this.params.runState.recordEndlessOverdriveActiveTime(activeElapsed);
    }

    this.lastSyncTimeSeconds = now;
  }

  private isOverdriveActive(): boolean {
    return this.params.getGameTimeSeconds() < this.overdriveActiveUntilSeconds;
  }

  private syncEnemySlowState(): void {
    const now = this.params.getGameTimeSeconds();
    const elapsedSeconds = Math.max(0, now - this.lastSlowSyncTimeSeconds);

    if (elapsedSeconds > 0 && this.lastSlowSyncTimeSeconds < this.enemySlowActiveUntilSeconds) {
      const activeEnd = Math.min(now, this.enemySlowActiveUntilSeconds);
      const activeElapsed = Math.max(0, activeEnd - this.lastSlowSyncTimeSeconds);
      this.params.runState.recordEndlessEnemySlowActiveTime(activeElapsed);
    }

    this.lastSlowSyncTimeSeconds = now;
  }

  private isEnemySlowActive(): boolean {
    return this.params.getGameTimeSeconds() < this.enemySlowActiveUntilSeconds;
  }
}
