import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { RunState } from '../run/RunState';

import { WeaponManager } from '../weapon/WeaponManager';

type EndlessRewardId =
  | 'endless_heal'
  | 'endless_overdrive'
  | 'endless_growth_damage'
  | 'endless_enemy_slow'
  | 'endless_shield';

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

  private overdriveActiveUntilSeconds = 0;
  private overdriveCooldownUntilSeconds = 0;
  private enemySlowActiveUntilSeconds = 0;
  private enemySlowCooldownUntilSeconds = 0;
  private lastSlowSyncTimeSeconds = 0;
  private lastSyncTimeSeconds = 0;
  private shieldStacks = 0;

  constructor(
    private readonly params: {
      runState: RunState;
      upgradeApplier: UpgradeApplier;
      weaponManager: WeaponManager;
      getGameTimeSeconds(): number;
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
        name: 'Emergency Heal',
        description: `Restore ${EndlessRewardManager.HEAL_AMOUNT} HP`,
      },
    ];

    if (this.isOverdriveAvailable()) {
      options.push({
        id: 'endless_overdrive',
        name: 'Overdrive',
        description: [
          'Weapon Damage +40%',
          'Duration: 8s',
          'Cooldown: 25s',
        ].join('\n'),
      });
    }

    if (this.isEnemySlowAvailable()) {
      options.push({
        id: 'endless_enemy_slow',
        name: 'Time Slow',
        description: [
          'Enemy Move Speed -50%',
          'Duration: 6s',
          'Cooldown: 20s',
        ].join('\n'),
      });
    }

    if (this.shieldStacks < EndlessRewardManager.MAX_SHIELD_STACKS) {
      options.push({
        id: 'endless_shield',
        name: 'Shield',
        description: [
          'Gain 1 shield stack',
          'Blocks the next hit',
          'Still triggers knockback burst',
          `Stacks up to ${EndlessRewardManager.MAX_SHIELD_STACKS}`,
        ].join('\n'),
      });
    }

    options.push({
      id: 'endless_growth_damage',
      name: 'Minor Growth',
      description: 'Permanent Weapon Damage +0.5%',
    });

    return options.slice(0, 3);
  }

  isRewardId(rewardId: string): rewardId is EndlessRewardId {
    return rewardId === 'endless_heal'
      || rewardId === 'endless_overdrive'
      || rewardId === 'endless_growth_damage'
      || rewardId === 'endless_enemy_slow'
      || rewardId === 'endless_shield';
  }

  applyReward(rewardId: string, source: 'level' | 'chest'): boolean {
    if (!this.params.runState.endlessStarted || !this.isRewardId(rewardId)) {
      return false;
    }

    return this.applyRewardInternal(rewardId, source);
  }

  applyChestFallbackReward(preferredRewardId?: string): string | null {
    const rewardIds = [
      ...(preferredRewardId && this.isRewardId(preferredRewardId) ? [preferredRewardId] : []),
      ...this.getRewardOptions().map((option) => option.id),
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
