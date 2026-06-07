import Phaser from 'phaser';

import { GameEvent } from '../events/GameEvent';
import { DamageCalculator } from '../combat/DamageCalculator';
import { DamageType } from '../combat/DamageType';

import { RelicDefinition } from './RelicDefinition';
import { RelicEffect } from './RelicEffect';
import {
  BossKillDamageBurstRelicEffectConfig,
  ChestOpenPickupRangeRelicEffectConfig,
  DamageTakenCooldownGuardRelicEffectConfig,
  LevelUpHealRelicEffectConfig,
  DamageTakenCounterRelicEffectConfig,
  LowHealthDamageRelicEffectConfig,
  PickupRangeRelicEffectConfig,
  TreasureOpenBonusRelicEffectConfig,
  TreasureScoreRelicEffectConfig,
} from './RelicEffect';
import { RelicEffectContext } from './RelicEffectContext';
import { RelicEffectFactory } from './RelicEffectFactory';
import { RelicRegistry } from './RelicRegistry';

interface ActiveRelic {
  definition: RelicDefinition;
  effects: RelicEffect[];
}

interface CachedRelicModifiers {
  damageMultiplier: number;
  pickupRangeMultiplier: number;
  treasureScoreMultiplier: number;
}

export class RelicManager {
  private readonly activeRelics = new Map<string, ActiveRelic>();
  private readonly unsubscribeGameEvents?: () => void;
  private readonly damageCalculator = new DamageCalculator();
  private cachedModifiers: CachedRelicModifiers = {
    damageMultiplier: 1,
    pickupRangeMultiplier: 1,
    treasureScoreMultiplier: 1,
  };
  private activeBossKillBurstMultiplier = 1;
  private bossKillBurstExpiresAtMs = 0;
  private temporaryPickupRangeMultiplier = 1;
  private temporaryPickupRangeExpiresAtMs = 0;
  private nextIronShellAvailableAtMs = 0;
  private treasureOpenCountForRift = 0;
  private cachedEffects: RelicEffect[] = [];
  private thornCounterAvailableAtMs = 0;

  constructor(private context: RelicEffectContext = {}) {
    this.unsubscribeGameEvents = context.gameEventBus?.subscribeAll((event) => {
      this.handleGameEvent(event);
    });
  }

  setContext(context: Partial<RelicEffectContext>): void {
    this.context = {
      ...this.context,
      ...context,
    };
  }

  addRelic(id: string): boolean {
    if (this.activeRelics.has(id)) {
      return false;
    }

    const definition = RelicRegistry.get(id);

    if (!definition) {
      console.warn(`Relic definition not found: ${id}`);
      return false;
    }

    const activeRelic = {
      definition,
      effects: RelicEffectFactory.createMany(definition.effects),
    };

    this.activeRelics.set(id, activeRelic);
    this.rebuildCachedEffects();
    this.rebuildCachedModifiers();

    for (const effect of activeRelic.effects) {
      effect.onAttach?.(this.context);
    }

    return true;
  }

  removeRelic(id: string): boolean {
    const activeRelic = this.activeRelics.get(id);

    if (!activeRelic) {
      return false;
    }

    for (const effect of activeRelic.effects) {
      effect.onDetach?.(this.context);
    }

    this.activeRelics.delete(id);
    this.rebuildCachedEffects();
    this.rebuildCachedModifiers();
    return true;
  }

  hasRelic(id: string): boolean {
    return this.activeRelics.has(id);
  }

  getRelics(): RelicDefinition[] {
    return [...this.activeRelics.values()]
      .map((activeRelic) => ({ ...activeRelic.definition }));
  }

  getRelicIds(): string[] {
    return [...this.activeRelics.keys()];
  }

  getRelicDisplayInfo(): Array<{
    id: string;
    name: string;
    description: string;
    rarity: string;
    iconKey?: string;
  }> {
    return this.getRelics().map((relic) => ({
      id: relic.id,
      name: relic.name ?? relic.nameKey ?? relic.id,
      description: relic.description ?? relic.descriptionKey ?? '',
      rarity: relic.rarity ?? 'common',
      iconKey: relic.iconKey,
    }));
  }

  getStatModifiers(): CachedRelicModifiers {
    const nowMs = this.getNowMs();

    this.updateTimedState(nowMs);

    return {
      ...this.cachedModifiers,
      pickupRangeMultiplier: this.cachedModifiers.pickupRangeMultiplier
        * this.temporaryPickupRangeMultiplier,
    };
  }

  update(deltaMs: number): void {
    this.updateTimedState(this.getNowMs());

    for (const effect of this.getEffects()) {
      effect.update?.(deltaMs, this.context);
    }
  }

  modifyWeaponDamage(weaponId: string, baseValue: number): number {
    this.updateTimedState(this.getNowMs());

    const legacyModifiedValue = this.getEffects().reduce(
      (value, effect) => effect.modifyWeaponDamage?.(weaponId, value, this.context) ?? value,
      baseValue,
    );

    return legacyModifiedValue
      * this.cachedModifiers.damageMultiplier
      * this.activeBossKillBurstMultiplier
      * this.getConditionalDamageMultiplier();
  }

  modifyTreasureDropChance(baseChance: number): number {
    return this.getEffects().reduce(
      (value, effect) => effect.modifyTreasureDropChance?.(value, this.context) ?? value,
      baseChance,
    );
  }

  modifyDamageTaken(incomingDamage: number): number {
    return this.getEffects().reduce(
      (value, effect) => effect.modifyDamageTaken?.(value, this.context) ?? value,
      incomingDamage,
    );
  }

  handleGameEvent(event: GameEvent): void {
    if (event.type === 'boss.killed') {
      this.handleBossKilledEvent(event);
    }

    if (event.type === 'player.levelUp') {
      this.handleLevelUpEvent();
    }

    if (event.type === 'pickup.treasureOpened') {
      this.handleTreasureOpenedEvent();
    }

    if (event.type === 'player.damageTaken') {
      this.handleDamageTakenEvent(event);
    }

    for (const effect of this.getEffects()) {
      effect.handleGameEvent?.(event, this.context);
    }
  }

  destroy(): void {
    for (const relicId of [...this.activeRelics.keys()]) {
      this.removeRelic(relicId);
    }

    this.unsubscribeGameEvents?.();
  }

  private getEffects(): readonly RelicEffect[] {
    return this.cachedEffects;
  }

  private rebuildCachedEffects(): void {
    const nextEffects: RelicEffect[] = [];

    for (const activeRelic of this.activeRelics.values()) {
      nextEffects.push(...activeRelic.effects);
    }

    this.cachedEffects = nextEffects;
  }

  private rebuildCachedModifiers(): void {
    const nextModifiers: CachedRelicModifiers = {
      damageMultiplier: 1,
      pickupRangeMultiplier: 1,
      treasureScoreMultiplier: 1,
    };

    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        switch (effect.type) {
          case 'pickupRangeModifier':
            nextModifiers.pickupRangeMultiplier *= 1
              + Math.max(0, (effect as PickupRangeRelicEffectConfig).value ?? 0);
            break;
          case 'treasureScoreBonus':
            nextModifiers.treasureScoreMultiplier *= 1
              + Math.max(0, (effect as TreasureScoreRelicEffectConfig).value ?? 0);
            break;
          default:
            break;
        }
      }
    }

    this.cachedModifiers = nextModifiers;
  }

  private getConditionalDamageMultiplier(): number {
    const hpRatio = this.getHpRatio();
    let multiplier = 1;

    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        if (effect.type !== 'lowHealthDamageModifier') {
          continue;
        }

        const lowHealthEffect = effect as LowHealthDamageRelicEffectConfig;

        if (hpRatio > lowHealthEffect.thresholdHpRatio) {
          continue;
        }

        multiplier *= 1 + Math.max(0, lowHealthEffect.value ?? 0);
      }
    }

    return multiplier;
  }

  private getHpRatio(): number {
    const playerHealth = this.context.playerHealth;

    if (!playerHealth || playerHealth.maxHp <= 0) {
      return 1;
    }

    return playerHealth.currentHp / playerHealth.maxHp;
  }

  private handleDamageTakenEvent(event: GameEvent): void {
    const payload = event.payload as { actualDamage?: number } | undefined;

    if ((payload?.actualDamage ?? 0) <= 0) {
      return;
    }

    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        if (effect.type === 'onDamageTakenCounter') {
          this.tryTriggerThornCounter(effect as DamageTakenCounterRelicEffectConfig);
        } else if (effect.type === 'damageTakenCooldownGuard') {
          this.tryTriggerIronShell(effect as DamageTakenCooldownGuardRelicEffectConfig);
        }
      }
    }
  }

  private handleBossKilledEvent(event: GameEvent): void {
    const nowMs = this.getNowMsFromPayload(event);

    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        if (effect.type !== 'bossKillDamageBurst') {
          continue;
        }

        const burstEffect = effect as BossKillDamageBurstRelicEffectConfig;
        const durationMs = Math.max(0, burstEffect.durationMs);

        if (durationMs <= 0) {
          continue;
        }

        const nextExpiry = nowMs + durationMs;
        const burstMultiplier = 1 + Math.max(0, burstEffect.value ?? 0);

        this.bossKillBurstExpiresAtMs = Math.max(this.bossKillBurstExpiresAtMs, nextExpiry);
        this.activeBossKillBurstMultiplier = Math.max(
          this.activeBossKillBurstMultiplier,
          burstMultiplier,
        );
      }
    }
  }

  private handleLevelUpEvent(): void {
    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        if (effect.type !== 'levelUpHeal') {
          continue;
        }

        const levelUpEffect = effect as LevelUpHealRelicEffectConfig;
        const healRatio = Math.max(0, Math.min(1, levelUpEffect.value ?? 0));

        if (healRatio <= 0 || !this.context.playerHealth || !this.context.player) {
          continue;
        }

        const healedAmount = this.context.playerHealth.healLostHpRatio(healRatio);
        const player = this.context.player;

        if (healedAmount > 0 && this.context.floatingTextManager) {
          this.context.floatingTextManager.showPlayerHeal(
            player.body.x,
            player.body.y,
            healedAmount,
          );
        }
      }
    }
  }

  private handleTreasureOpenedEvent(): void {
    const runState = this.context.runState;

    for (const relic of this.activeRelics.values()) {
      for (const effect of relic.definition.effects) {
        if (effect.type !== 'chestOpenPickupRangeBoost') {
          continue;
        }

        const pickupEffect = effect as ChestOpenPickupRangeRelicEffectConfig;
        const durationMs = Math.max(0, pickupEffect.durationMs);

        if (durationMs <= 0) {
          continue;
        }

        const boostMultiplier = 1 + Math.max(0, pickupEffect.value ?? 0);

        this.temporaryPickupRangeMultiplier = Math.max(
          this.temporaryPickupRangeMultiplier,
          boostMultiplier,
        );
        this.temporaryPickupRangeExpiresAtMs = this.getNowMs() + durationMs;
      }

      for (const effect of relic.definition.effects) {
        if (effect.type !== 'treasureOpenBonus') {
          continue;
        }

        const bonusEffect = effect as TreasureOpenBonusRelicEffectConfig;
        const triggerCount = Math.max(1, Math.floor(bonusEffect.triggerCount ?? 1));
        const bonusMultiplier = Math.max(0, bonusEffect.bonusMultiplier ?? 0);
        const canScoreBonus = runState !== undefined && bonusMultiplier > 0;

        if (!canScoreBonus) {
          continue;
        }

        this.treasureOpenCountForRift += 1;

        if (this.treasureOpenCountForRift % triggerCount !== 0) {
          continue;
        }

        runState.recordScore('treasure', bonusMultiplier);
      }
    }
  }

  private tryTriggerThornCounter(effect: DamageTakenCounterRelicEffectConfig): void {
    const nowMs = (this.context.scene?.time.now ?? 0);

    if (nowMs < this.thornCounterAvailableAtMs) {
      return;
    }

    const playerPosition = this.getPlayerPosition();

    if (!playerPosition) {
      return;
    }

    const enemies = this.context.enemies ?? [];
    const targets = enemies
      .filter((enemy) => !enemy.isDead)
      .map((enemy) => ({
        enemy,
        distanceSq: Phaser.Math.Distance.Squared(
          playerPosition.x,
          playerPosition.y,
          enemy.body.x,
          enemy.body.y,
        ),
      }))
      .filter((entry) => entry.distanceSq <= effect.radius * effect.radius)
      .sort((left, right) => left.distanceSq - right.distanceSq)
      .slice(0, 8);

    if (targets.length === 0) {
      return;
    }

    this.thornCounterAvailableAtMs = nowMs + effect.intervalMs;

    for (const { enemy } of targets) {
      enemy.takeDamage(this.damageCalculator.calculateDamage(effect.value, DamageType.Normal));
    }
  }

  private tryTriggerIronShell(effect: DamageTakenCooldownGuardRelicEffectConfig): void {
    const nowMs = this.getNowMs();
    const cooldownMs = Math.max(0, effect.cooldownMs ?? 0);
    const durationMs = Math.max(0, effect.durationMs ?? 0);

    if (cooldownMs <= 0 || durationMs <= 0) {
      return;
    }

    if (nowMs < this.nextIronShellAvailableAtMs) {
      return;
    }

    if (!this.context.playerHealth) {
      return;
    }

    const damageMultiplier = Math.max(0, Math.min(1, effect.value ?? 1));

    if (damageMultiplier >= 1) {
      return;
    }

    this.context.playerHealth.addTemporaryDamageTakenMultiplier(damageMultiplier, durationMs);
    this.nextIronShellAvailableAtMs = nowMs + cooldownMs;
  }

  private updateTimedState(nowMs: number): void {
    const safeNowMs = Math.max(0, nowMs);

    if (
      this.bossKillBurstExpiresAtMs > 0
      && safeNowMs >= this.bossKillBurstExpiresAtMs
    ) {
      this.activeBossKillBurstMultiplier = 1;
      this.bossKillBurstExpiresAtMs = 0;
    }

    if (
      this.temporaryPickupRangeExpiresAtMs > 0
      && safeNowMs >= this.temporaryPickupRangeExpiresAtMs
    ) {
      this.temporaryPickupRangeMultiplier = 1;
      this.temporaryPickupRangeExpiresAtMs = 0;
    }
  }

  private getNowMsFromPayload(event: GameEvent): number {
    if (event.gameTimeSeconds !== undefined) {
      return Math.max(0, event.gameTimeSeconds * 1000);
    }

    return this.getNowMs();
  }

  private getNowMs(): number {
    const sceneNow = this.context.scene?.time.now;

    if (typeof sceneNow === 'number') {
      return sceneNow;
    }

    const gameTimeSeconds = this.context.getGameTimeSeconds?.();

    if (gameTimeSeconds !== undefined) {
      return Math.max(0, gameTimeSeconds * 1000);
    }

    return Date.now();
  }

  private getPlayerPosition(): { x: number; y: number } | undefined {
    return this.context.player?.body;
  }
}
