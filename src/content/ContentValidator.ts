import { EVOLUTION_RULES } from '../evolution/EvolutionRule';

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
}
