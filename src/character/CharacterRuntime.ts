import {
  CharacterDamageReactionContext,
  CharacterDamageReactionSkill,
  CharacterDamageReactionType,
} from './CharacterDamageReactionSkill';
import { CharacterDamageReactionFactory } from './CharacterDamageReactionFactory';
import { CharacterDefinition } from './CharacterDefinition';
import { CharacterEffectFactory } from './CharacterEffectFactory';
import {
  calculateCharacterBaseStats,
  CharacterBaseStats,
} from './CharacterStats';
import {
  CharacterLevelUpEffect,
  CharacterLevelUpEffectContext,
  CharacterLevelUpEffectResult,
} from './CharacterLevelUpEffect';

export class CharacterRuntime {
  private level = 1;
  private readonly levelUpEffect: CharacterLevelUpEffect;
  private readonly damageReactionSkill: CharacterDamageReactionSkill;
  private temporaryPickupRangeMultiplier = 1;
  private temporaryPickupRangeRemainingMs = 0;

  constructor(private readonly definition: CharacterDefinition) {
    this.levelUpEffect = CharacterEffectFactory.createLevelUpEffect(definition.levelUpEffect);
    this.damageReactionSkill = CharacterDamageReactionFactory.create(definition.damageReactionSkill);
  }

  getCharacterId(): string {
    return this.definition.id;
  }

  getStartingWeaponId(): string {
    return this.definition.startingWeaponId;
  }

  getSkinId(): string | undefined {
    return this.definition.skinId;
  }

  setLevel(level: number): CharacterBaseStats {
    this.level = Math.max(1, Math.floor(level));
    return this.getBaseStats();
  }

  getBaseStats(): CharacterBaseStats {
    return calculateCharacterBaseStats(this.definition, this.level);
  }

  applyLevelUpEffect(
    context: CharacterLevelUpEffectContext,
  ): CharacterLevelUpEffectResult {
    return this.levelUpEffect.apply(context);
  }

  tryTriggerDamageReaction(context: CharacterDamageReactionContext): boolean {
    return this.damageReactionSkill.tryTrigger(context);
  }

  tryTriggerLevelUpPulse(context: CharacterDamageReactionContext): boolean {
    return this.damageReactionSkill.tryTriggerLevelUpPulse(context);
  }

  updateDamageReaction(
    deltaMs: number,
    context: { player: CharacterDamageReactionContext['player'] },
  ): void {
    this.updateTemporaryPickupRangeMultiplier(deltaMs);
    this.damageReactionSkill.update(deltaMs, context.player);
  }

  isDamageInvulnerable(nowMs: number): boolean {
    return this.damageReactionSkill.isInvulnerable(nowMs);
  }

  getEnemySpeedMultiplierAt(x: number, y: number): number {
    return this.damageReactionSkill.getEnemySpeedMultiplierAt(x, y);
  }

  getPickupRangeMultiplier(): number {
    return Math.max(
      this.damageReactionSkill.getPickupRangeMultiplier(),
      this.temporaryPickupRangeRemainingMs > 0 ? this.temporaryPickupRangeMultiplier : 1,
    );
  }

  getTemporaryPickupRangeStatus(): {
    active: boolean;
    multiplier: number;
    remainingMs: number;
  } {
    return {
      active: this.temporaryPickupRangeRemainingMs > 0,
      multiplier: this.temporaryPickupRangeMultiplier,
      remainingMs: this.temporaryPickupRangeRemainingMs,
    };
  }

  applyTemporaryPickupRangeMultiplier(
    multiplier: number,
    durationMs: number,
    _source?: string,
  ): void {
    const safeMultiplier = Math.max(1, multiplier);
    const safeDurationMs = Math.max(0, durationMs);

    if (safeDurationMs <= 0) {
      return;
    }

    this.temporaryPickupRangeMultiplier = Math.max(
      this.temporaryPickupRangeMultiplier,
      safeMultiplier,
    );
    this.temporaryPickupRangeRemainingMs = Math.max(
      this.temporaryPickupRangeRemainingMs,
      safeDurationMs,
    );
  }

  getMapMoveSpeedFloorMultiplier(): number {
    return this.damageReactionSkill.getMapMoveSpeedFloorMultiplier();
  }

  getTemporaryArmorFlatBonus(): number {
    return this.damageReactionSkill.getTemporaryArmorFlatBonus();
  }

  getAutoPlayerSnapshot(): {
    characterId: string;
    damageReactionType: CharacterDamageReactionType;
    baseStats: CharacterBaseStats;
  } {
    return {
      characterId: this.definition.id,
      damageReactionType: this.damageReactionSkill.type,
      baseStats: this.getBaseStats(),
    };
  }

  clear(): void {
    this.damageReactionSkill.clear();
    this.temporaryPickupRangeMultiplier = 1;
    this.temporaryPickupRangeRemainingMs = 0;
  }

  private updateTemporaryPickupRangeMultiplier(deltaMs: number): void {
    if (this.temporaryPickupRangeRemainingMs <= 0) {
      return;
    }

    this.temporaryPickupRangeRemainingMs = Math.max(
      0,
      this.temporaryPickupRangeRemainingMs - Math.max(0, deltaMs),
    );

    if (this.temporaryPickupRangeRemainingMs <= 0) {
      this.temporaryPickupRangeMultiplier = 1;
    }
  }
}
