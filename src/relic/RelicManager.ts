import { GameEvent } from '../events/GameEvent';

import { RelicDefinition } from './RelicDefinition';
import { RelicEffect } from './RelicEffect';
import { RelicEffectContext } from './RelicEffectContext';
import { RelicEffectFactory } from './RelicEffectFactory';
import { RelicRegistry } from './RelicRegistry';

interface ActiveRelic {
  definition: RelicDefinition;
  effects: RelicEffect[];
}

export class RelicManager {
  private readonly activeRelics = new Map<string, ActiveRelic>();
  private readonly unsubscribeGameEvents?: () => void;

  constructor(private readonly context: RelicEffectContext = {}) {
    this.unsubscribeGameEvents = context.gameEventBus?.subscribeAll((event) => {
      this.handleGameEvent(event);
    });
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
    return true;
  }

  hasRelic(id: string): boolean {
    return this.activeRelics.has(id);
  }

  getRelics(): RelicDefinition[] {
    return [...this.activeRelics.values()]
      .map((activeRelic) => ({ ...activeRelic.definition }));
  }

  update(deltaMs: number): void {
    for (const effect of this.getEffects()) {
      effect.update?.(deltaMs, this.context);
    }
  }

  modifyWeaponDamage(weaponId: string, baseValue: number): number {
    return this.getEffects().reduce(
      (value, effect) => effect.modifyWeaponDamage?.(weaponId, value, this.context) ?? value,
      baseValue,
    );
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
}
