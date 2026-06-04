import { EVOLUTION_RULES } from '../evolution/EvolutionRule';
import { WeaponBehaviorConfig } from '../weapon/behavior/WeaponBehaviorConfig';
import { WeaponBehaviorRegistry } from '../weapon/behavior/WeaponBehaviorRegistry';
import { WeaponConfig } from '../weapon/Weapon';
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
    for (const rule of EVOLUTION_RULES) {
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
}
