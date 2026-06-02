import Phaser from 'phaser';

import { AuraWeapon } from './AuraWeapon';
import { AxeWeapon } from './AxeWeapon';
import { MagicWandWeapon } from './MagicWandWeapon';
import { OrbitWeapon } from './OrbitWeapon';
import { ProjectileWeapon } from './ProjectileWeapon';
import { Weapon, WeaponConfig } from './Weapon';

type WeaponConfigMap = Record<string, WeaponConfig>;

export class WeaponFactory {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly weaponConfigs: WeaponConfigMap,
  ) {}

  create(weaponId: string): Weapon {
    const config = this.weaponConfigs[weaponId];

    if (!config) {
      throw new Error(`Unknown weapon id: ${weaponId}`);
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
}
