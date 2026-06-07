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

export interface LowHealthDamageRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'lowHealthDamageModifier';
  value: number;
  thresholdHpRatio: number;
}

export interface PickupRangeRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'pickupRangeModifier';
  value: number;
}

export interface TreasureScoreRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'treasureScoreBonus';
  value: number;
}

export interface DamageTakenCounterRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'onDamageTakenCounter';
  value: number;
  radius: number;
  intervalMs: number;
}

export interface TimedSlowPulseRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'timedSlowPulse';
  value: number;
  intervalMs: number;
  radius: number;
  durationMs: number;
}

export interface BossKillDamageBurstRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'bossKillDamageBurst';
  value: number;
  durationMs: number;
}

export interface ChestOpenPickupRangeRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'chestOpenPickupRangeBoost';
  value: number;
  durationMs: number;
}

export interface DamageTakenCooldownGuardRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'damageTakenCooldownGuard';
  value: number;
  durationMs: number;
  cooldownMs: number;
}

export interface LevelUpHealRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'levelUpHeal';
  value: number;
}

export interface TreasureOpenBonusRelicEffectConfig extends BaseRelicEffectConfig {
  type: 'treasureOpenBonus';
  triggerCount: number;
  bonusMultiplier: number;
}

export type RelicEffectConfig =
  | TreasureRateRelicEffectConfig
  | WeaponTagDamageRelicEffectConfig
  | DamageTakenRelicEffectConfig
  | EventTriggeredRelicEffectConfig
  | LowHealthDamageRelicEffectConfig
  | PickupRangeRelicEffectConfig
  | TreasureScoreRelicEffectConfig
  | DamageTakenCounterRelicEffectConfig
  | TimedSlowPulseRelicEffectConfig
  | BossKillDamageBurstRelicEffectConfig
  | ChestOpenPickupRangeRelicEffectConfig
  | DamageTakenCooldownGuardRelicEffectConfig
  | LevelUpHealRelicEffectConfig
  | TreasureOpenBonusRelicEffectConfig
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
