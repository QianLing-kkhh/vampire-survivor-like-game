import Phaser from 'phaser';

import { GameEvent } from '../events/GameEvent';
import { DamageCalculator } from '../combat/DamageCalculator';
import { DamageType } from '../combat/DamageType';

import { RelicDefinition } from './RelicDefinition';
import { RelicEffect } from './RelicEffect';
import {
  DamageTakenCounterRelicEffectConfig,
  LowHealthDamageRelicEffectConfig,
  PickupRangeRelicEffectConfig,
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
    return { ...this.cachedModifiers };
  }

  update(deltaMs: number): void {
    for (const effect of this.getEffects()) {
      effect.update?.(deltaMs, this.context);
    }
  }

  modifyWeaponDamage(weaponId: string, baseValue: number): number {
    const legacyModifiedValue = this.getEffects().reduce(
      (value, effect) => effect.modifyWeaponDamage?.(weaponId, value, this.context) ?? value,
      baseValue,
    );

    return legacyModifiedValue
      * this.cachedModifiers.damageMultiplier
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

  private getEffects(): RelicEffect[] {
    return [...this.activeRelics.values()].flatMap((activeRelic) => activeRelic.effects);
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
        if (effect.type !== 'onDamageTakenCounter') {
          continue;
        }

        this.tryTriggerThornCounter(effect as DamageTakenCounterRelicEffectConfig);
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
      if (enemy.isDead) {
        enemy.destroy();
      }
    }
  }

  private getPlayerPosition(): { x: number; y: number } | undefined {
    return this.context.player?.body;
  }
}
