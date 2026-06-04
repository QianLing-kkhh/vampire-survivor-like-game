import { GameEvent } from '../events/GameEvent';

import { RelicEffectContext } from './RelicEffectContext';

export interface BaseRelicEffectConfig {
  type: string;
}

export interface TreasureRateRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'treasureRate';
  multiplier?: number;
  bonusChance?: number;
}

export interface WeaponTagDamageRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'weaponTagDamage';
  tags: string[];
  multiplier: number;
}

export interface DamageTakenRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'damageTaken';
  multiplier: number;
}

export interface EventTriggeredRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'eventTriggered';
  eventType: string;
}

export type RelicEffectConfig =
  | TreasureRateRelicEffectConfig
  | WeaponTagDamageRelicEffectConfig
  | DamageTakenRelicEffectConfig
  | EventTriggeredRelicEffectConfig
  | BaseRelicEffectConfig;

export interface RelicEffect {
  readonly type: string;
  onAttach?(context: RelicEffectContext): void;
  onDetach?(context: RelicEffectContext): void;
  update?(deltaMs: number, context: RelicEffectContext): void;
  modifyWeaponDamage?(
    weaponId: string,
    baseValue: number,
    context: RelicEffectContext,
  ): number;
  modifyTreasureDropChance?(baseChance: number, context: RelicEffectContext): number;
  modifyDamageTaken?(incomingDamage: number, context: RelicEffectContext): number;
  handleGameEvent?(event: GameEvent, context: RelicEffectContext): void;
}
