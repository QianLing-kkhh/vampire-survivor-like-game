import {
  BossTimingMutatorConfig,
  EnemyStatMutatorConfig,
  ExpRateMutatorConfig,
  MutatorConfig,
  SpawnRateMutatorConfig,
  TreasureRateMutatorConfig,
  WeaponPoolMutatorConfig,
} from '../rules/MutatorConfig';
import { MutatorFactory } from '../rules/MutatorFactory';
import type {
  WeaponBehaviorConfig,
  WeaponConfig,
} from '../core/domain/WeaponTypes';
import { WeaponBehaviorRegistry } from '../weapon/behavior/WeaponBehaviorRegistry';
import { WeaponTagRegistry } from '../weapon/tags/WeaponTagRegistry';

import { ContentPack } from './ContentPack';
import { DEFAULT_CONTENT_IDS } from './ContentId';

export class ContentValidator {
  validatePack(pack: ContentPack): void {
    this.validateRequiredDefaults(pack);
    this.validateStages(pack);
    this.validateCharacters(pack);
    this.validateEvolutionRules(pack);
    this.validateWaves(pack);
    this.validateBasicFields(pack);
  }

  private validateRequiredDefaults(pack: ContentPack): void {
    if (!pack.characters?.[DEFAULT_CONTENT_IDS.character]) {
      console.warn(`Content pack ${pack.id} is missing default character.`);
    }

    if (!pack.stages?.[DEFAULT_CONTENT_IDS.stage]) {
      console.warn(`Content pack ${pack.id} is missing default stage.`);
    }
  }

  private validateStages(pack: ContentPack): void {
    for (const stage of Object.values(pack.stages ?? {})) {
      if (!pack.maps?.[stage.mapId]) {
        console.warn(`Stage ${stage.id} references missing map: ${stage.mapId}`);
      }

      if (!pack.enemies?.[stage.finalBossId]) {
        console.warn(`Stage ${stage.id} references missing final boss: ${stage.finalBossId}`);
      }

      this.validateStageMutators(stage.id, stage.mutators, pack);
    }
  }

  private validateStageMutators(
    stageId: string,
    mutators: readonly MutatorConfig[] | undefined,
    pack: ContentPack,
  ): void {
    for (const mutator of mutators ?? []) {
      if (!MutatorFactory.isKnownType(mutator.type)) {
        console.warn(`Stage ${stageId} uses unknown mutator type: ${mutator.type}`);
        continue;
      }

      this.validateMutatorFields(stageId, mutator, pack);
    }
  }

  private validateMutatorFields(
    stageId: string,
    mutator: MutatorConfig,
    pack: ContentPack,
  ): void {
    switch (mutator.type) {
      case 'enemyStat':
        this.validateEnemyStatMutator(stageId, mutator as EnemyStatMutatorConfig);
        break;
      case 'spawnRate':
        this.warnIfNotPositive(
          stageId,
          'spawnRateMultiplier',
          (mutator as SpawnRateMutatorConfig).spawnRateMultiplier,
        );
        break;
      case 'treasureRate':
        this.warnIfNegative(
          stageId,
          'treasureDropMultiplier',
          (mutator as TreasureRateMutatorConfig).treasureDropMultiplier,
        );
        break;
      case 'expRate':
        this.warnIfNegative(
          stageId,
          'expMultiplier',
          (mutator as ExpRateMutatorConfig).expMultiplier,
        );
        break;
      case 'bossTiming':
        this.warnIfNotPositive(
          stageId,
          'finalBossSpawnTimeMultiplier',
          (mutator as BossTimingMutatorConfig).finalBossSpawnTimeMultiplier,
        );
        break;
      case 'weaponPool':
        this.validateWeaponPoolMutator(stageId, mutator as WeaponPoolMutatorConfig, pack);
        break;
      default:
        break;
    }
  }

  private validateEnemyStatMutator(stageId: string, mutator: EnemyStatMutatorConfig): void {
    this.warnIfNotPositive(stageId, 'enemyHpMultiplier', mutator.enemyHpMultiplier);
    this.warnIfNotPositive(stageId, 'enemyDamageMultiplier', mutator.enemyDamageMultiplier);
    this.warnIfNotPositive(stageId, 'enemySpeedMultiplier', mutator.enemySpeedMultiplier);
  }

  private validateWeaponPoolMutator(
    stageId: string,
    mutator: WeaponPoolMutatorConfig,
    pack: ContentPack,
  ): void {
        for (const weaponId of [
          ...(mutator.allowedWeaponIds ?? []),
          ...(mutator.bannedWeaponIds ?? []),
        ]) {
          if (!pack.weapons?.[weaponId]) {
            console.warn(`Stage ${stageId} weaponPool mutator references missing weapon: ${weaponId}`);
          }
        }

        for (const tag of [
          ...(mutator.requiredTags ?? []),
          ...(mutator.bannedTags ?? []),
        ]) {
          if (typeof tag !== 'string') {
            console.warn(`Stage ${stageId} weaponPool mutator includes a non-string tag.`);
          }
        }
  }

  private validateCharacters(pack: ContentPack): void {
    for (const character of Object.values(pack.characters ?? {})) {
      if (!pack.weapons?.[character.startingWeaponId]) {
        console.warn(
          `Character ${character.id} references missing weapon: ${character.startingWeaponId}`,
        );
      }
    }
  }

  private validateEvolutionRules(pack: ContentPack): void {
    for (const rule of pack.evolutions ?? []) {
      if (!pack.weapons?.[rule.baseWeaponId]) {
        console.warn(`Evolution rule references missing base weapon: ${rule.baseWeaponId}`);
      }

      if (!pack.weapons?.[rule.evolvedWeaponId]) {
        console.warn(`Evolution rule references missing evolved weapon: ${rule.evolvedWeaponId}`);
      }

      if (!pack.passives?.[rule.requiredPassiveId]) {
        console.warn(`Evolution rule references missing passive: ${rule.requiredPassiveId}`);
      }
    }
  }

  private validateWaves(pack: ContentPack): void {
    for (const waves of Object.values(pack.waves ?? {})) {
      for (const wave of waves) {
        if (!pack.enemies?.[wave.enemy]) {
          console.warn(`Wave references missing enemy: ${wave.enemy}`);
        }
      }
    }
  }

  private validateBasicFields(pack: ContentPack): void {
    for (const [weaponId, weapon] of Object.entries(pack.weapons ?? {})) {
      if (!weapon.type || weapon.damage === undefined || weapon.cooldown === undefined) {
        console.warn(`Weapon ${weaponId} is missing a basic field.`);
      }

      this.validateWeaponTags(weaponId, weapon);
      this.validateWeaponBehavior(weaponId, weapon);
    }

    for (const [enemyId, enemy] of Object.entries(pack.enemies ?? {})) {
      if (
        enemy.hp === undefined
        || enemy.moveSpeed === undefined
        || enemy.damage === undefined
        || enemy.exp === undefined
      ) {
        console.warn(`Enemy ${enemyId} is missing a basic field.`);
      }
    }

    for (const passive of Object.values(pack.passives ?? {})) {
      if (!passive.id || !passive.name) {
        console.warn(`Passive ${passive.id ?? 'unknown'} is missing a basic field.`);
      }
    }

    for (const upgrade of pack.upgrades ?? []) {
      if (!upgrade.id || !upgrade.name) {
        console.warn(`Upgrade ${upgrade.id ?? 'unknown'} is missing a basic field.`);
      }
    }
  }

  private validateWeaponTags(weaponId: string, weapon: WeaponConfig): void {
    if (weapon.tags === undefined) {
      return;
    }

    if (!Array.isArray(weapon.tags)) {
      console.warn(`Weapon ${weaponId} tags must be an array.`);
      return;
    }

    for (const tag of weapon.tags) {
      if (typeof tag !== 'string') {
        console.warn(`Weapon ${weaponId} contains a non-string tag.`);
        continue;
      }

      if (!WeaponTagRegistry.isBuiltInTag(tag)) {
        console.warn(`Weapon ${weaponId} uses custom or unknown tag: ${tag}`);
      }
    }
  }

  private validateWeaponBehavior(weaponId: string, weapon: WeaponConfig): void {
    if (weapon.behavior === undefined) {
      return;
    }

    const behavior = weapon.behavior;

    if (!behavior.type || !WeaponBehaviorRegistry.isKnownType(behavior.type)) {
      console.warn(`Weapon ${weaponId} uses unknown behavior type: ${behavior.type}`);
      return;
    }

    if (!this.isWeaponBehaviorCompatible(weapon.type, behavior.type)) {
      console.warn(
        `Weapon ${weaponId} type ${weapon.type} uses behavior ${behavior.type}; concrete class still controls runtime.`,
      );
    }

    this.validateWeaponBehaviorFields(weaponId, behavior);
  }

  private validateWeaponBehaviorFields(weaponId: string, behavior: WeaponBehaviorConfig): void {
    switch (behavior.type) {
      case 'projectile':
        if (
          behavior.pierceDamageFalloff !== undefined
          && (behavior.pierceDamageFalloff < 0 || behavior.pierceDamageFalloff > 1)
        ) {
          console.warn(`Weapon ${weaponId} pierceDamageFalloff should be between 0 and 1.`);
        }
        break;
      case 'aura':
        if (behavior.percentMaxHpDamage !== undefined && behavior.percentMaxHpDamage < 0) {
          console.warn(`Weapon ${weaponId} percentMaxHpDamage should be >= 0.`);
        }
        break;
      case 'arcing':
        if (behavior.maxSpiralRadius !== undefined && behavior.maxSpiralRadius < 0) {
          console.warn(`Weapon ${weaponId} maxSpiralRadius should be >= 0.`);
        }
        if (behavior.acceleration !== undefined && behavior.acceleration < 0) {
          console.warn(`Weapon ${weaponId} acceleration should be >= 0.`);
        }
        break;
      case 'homing':
        if (behavior.explosionRadius !== undefined && behavior.explosionRadius < 0) {
          console.warn(`Weapon ${weaponId} explosionRadius should be >= 0.`);
        }
        if (behavior.explosionDamageMultiplier !== undefined && behavior.explosionDamageMultiplier < 0) {
          console.warn(`Weapon ${weaponId} explosionDamageMultiplier should be >= 0.`);
        }
        break;
      case 'orbit':
      default:
        break;
    }
  }

  private isWeaponBehaviorCompatible(weaponType: string, behaviorType: string): boolean {
    return weaponType === behaviorType
      || (weaponType === 'axe' && behaviorType === 'arcing')
      || (weaponType === 'magic_wand' && behaviorType === 'homing')
      || (weaponType === 'projectile' && behaviorType === 'homing');
  }

  private warnIfNotPositive(stageId: string, field: string, value: number | undefined): void {
    if (value !== undefined && value <= 0) {
      console.warn(`Stage ${stageId} mutator field ${field} should be > 0.`);
    }
  }

  private warnIfNegative(stageId: string, field: string, value: number | undefined): void {
    if (value !== undefined && value < 0) {
      console.warn(`Stage ${stageId} mutator field ${field} should be >= 0.`);
    }
  }
}
