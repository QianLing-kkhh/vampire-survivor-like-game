import Phaser from 'phaser';

import { AssetFallbacks } from './AssetFallbacks';
import {
  AssetKeyEntry,
  DEFAULT_ASSET_KEY_MAP,
  PlayerAnimationState,
  PlayerDirection8,
  TEXTURE_STATUS_KEYS,
} from './AssetKeyMap';

export class AssetKeyResolver {
  static getTextureStatusKeys(): readonly string[] {
    return Array.from(new Set(TEXTURE_STATUS_KEYS));
  }

  static getPlayerTextureKey(scene: Phaser.Scene): string | null {
    return AssetKeyResolver.resolveTexture(scene, DEFAULT_ASSET_KEY_MAP.player.texture);
  }

  static getPlayerAnimationKey(
    scene: Phaser.Scene,
    state: PlayerAnimationState,
    direction: PlayerDirection8,
  ): string | null {
    return AssetKeyResolver.resolveAnimation(
      scene,
      DEFAULT_ASSET_KEY_MAP.player.animations[state][direction],
    );
  }

  static getEnemyTextureKey(scene: Phaser.Scene, enemyId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.enemies[
      enemyId as keyof typeof DEFAULT_ASSET_KEY_MAP.enemies
    ];

    if (!entry) {
      return AssetFallbacks.resolveTexture(scene, enemyId);
    }

    return AssetKeyResolver.resolveTexture(scene, entry.texture);
  }

  static getEnemyAnimationKey(scene: Phaser.Scene, enemyId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.enemies[
      enemyId as keyof typeof DEFAULT_ASSET_KEY_MAP.enemies
    ];

    if (!entry || !('animation' in entry)) {
      return null;
    }

    return AssetKeyResolver.resolveAnimation(scene, entry.animation);
  }

  static getWeaponProjectileTextureKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.projectileTexture
      ? AssetKeyResolver.resolveTexture(scene, entry.projectileTexture)
      : null;
  }

  static getWeaponProjectileAnimationKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.projectileAnimation
      ? AssetKeyResolver.resolveAnimation(scene, entry.projectileAnimation)
      : null;
  }

  static getWeaponIconKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.icon ? AssetKeyResolver.resolveTexture(scene, entry.icon) : null;
  }

  static getPassiveIconKey(scene: Phaser.Scene, passiveId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.passives[
      passiveId as keyof typeof DEFAULT_ASSET_KEY_MAP.passives
    ];

    return entry ? AssetKeyResolver.resolveTexture(scene, entry) : null;
  }

  static getPickupTextureKey(scene: Phaser.Scene, pickupType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.pickups[
      pickupType as keyof typeof DEFAULT_ASSET_KEY_MAP.pickups
    ];

    return entry ? AssetKeyResolver.resolveTexture(scene, entry) : null;
  }

  static getWorldLandmarkTextureKey(scene: Phaser.Scene, landmarkType: string): string | null {
    return AssetKeyResolver.getWorldTextureKey(scene, landmarkType);
  }

  static getWorldTileTextureKey(scene: Phaser.Scene, tileType: string): string | null {
    return AssetKeyResolver.getWorldTextureKey(scene, tileType);
  }

  static getEffectTextureKey(scene: Phaser.Scene, effectType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.effects[
      effectType as keyof typeof DEFAULT_ASSET_KEY_MAP.effects
    ];

    return entry?.texture ? AssetKeyResolver.resolveTexture(scene, entry.texture) : null;
  }

  static getEffectAnimationKey(scene: Phaser.Scene, effectType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.effects[
      effectType as keyof typeof DEFAULT_ASSET_KEY_MAP.effects
    ];

    return entry && 'animation' in entry && entry.animation
      ? AssetKeyResolver.resolveAnimation(scene, entry.animation)
      : null;
  }

  private static getWeaponEntry(weaponId: string) {
    return DEFAULT_ASSET_KEY_MAP.weapons[
      weaponId as keyof typeof DEFAULT_ASSET_KEY_MAP.weapons
    ];
  }

  private static getWorldTextureKey(scene: Phaser.Scene, key: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.world[
      key as keyof typeof DEFAULT_ASSET_KEY_MAP.world
    ];

    return entry ? AssetKeyResolver.resolveTexture(scene, entry) : null;
  }

  private static resolveTexture(scene: Phaser.Scene, entry: AssetKeyEntry): string | null {
    return AssetFallbacks.resolveTexture(scene, entry.primary, entry.fallbacks ?? []);
  }

  private static resolveAnimation(scene: Phaser.Scene, entry: AssetKeyEntry): string | null {
    return AssetFallbacks.resolveAnimation(scene, entry.primary, entry.fallbacks ?? []);
  }
}
