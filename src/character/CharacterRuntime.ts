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
    this.damageReactionSkill.update(deltaMs, context.player);
  }

  isDamageInvulnerable(nowMs: number): boolean {
    return this.damageReactionSkill.isInvulnerable(nowMs);
  }

  getEnemySpeedMultiplierAt(x: number, y: number): number {
    return this.damageReactionSkill.getEnemySpeedMultiplierAt(x, y);
  }

  getPickupRangeMultiplier(): number {
    return this.damageReactionSkill.getPickupRangeMultiplier();
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
  }
}
