import Phaser from 'phaser';

import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';

import { AuraWeapon } from './AuraWeapon';
import { AxeWeapon } from './AxeWeapon';
import { MagicWandWeapon } from './MagicWandWeapon';
import { OrbitWeapon } from './OrbitWeapon';
import { ProjectileWeapon } from './ProjectileWeapon';
import { Weapon, WeaponConfig } from './Weapon';
import { WeaponBehaviorFactory } from './behavior/WeaponBehaviorFactory';

type WeaponConfigMap = Record<string, WeaponConfig>;

export class WeaponFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    weaponConfigs?: WeaponConfigMap,
  ) {
    ContentBootstrap.ensureInitialized();
    this.weaponConfigs = weaponConfigs ?? ContentRegistry.listWeapons();
  }

  private readonly weaponConfigs: WeaponConfigMap;

  create(weaponId: string): Weapon {
    const config = this.weaponConfigs[weaponId];

    if (!config) {
      throw new Error(`Unknown weapon id: ${weaponId}`);
    }

    const behavior = WeaponBehaviorFactory.create(config.behavior);
    if (behavior && !this.isBehaviorCompatibleWithWeaponType(config.type, behavior.type)) {
      console.warn(
        `Weapon ${weaponId} type ${config.type} uses behavior ${behavior.type}; concrete class remains ${config.type}.`,
      );
    }

    switch (config.type) {
      case 'axe':
        return new AxeWeapon(this.scene, weaponId, config);
      case 'aura':
        return new AuraWeapon(this.scene, weaponId, config);
      case 'orbit':
        return new OrbitWeapon(this.scene, weaponId, config);
      case 'magic_wand':
        return new MagicWandWeapon(this.scene, weaponId, config);
      case 'projectile':
        return new ProjectileWeapon(this.scene, weaponId, config);
      default:
        throw new Error(`Unsupported weapon type: ${config.type}`);
    }
  }

  private isBehaviorCompatibleWithWeaponType(weaponType: string, behaviorType: string): boolean {
    if (weaponType === behaviorType) {
      return true;
    }

    if (weaponType === 'axe' && behaviorType === 'arcing') {
      return true;
    }

    if (weaponType === 'magic_wand' && behaviorType === 'homing') {
      return true;
    }

    if (weaponType === 'projectile' && behaviorType === 'homing') {
      return true;
    }

    return false;
  }
}
