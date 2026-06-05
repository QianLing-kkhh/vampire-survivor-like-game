import Phaser from 'phaser';

import { AppearanceManager } from '../appearance/AppearanceManager';
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

  static getPlayerTextureKey(
    scene: Phaser.Scene,
    skinId?: string,
    characterId?: string,
  ): string | null {
    for (const candidateSkinId of AssetKeyResolver.getPlayerSkinCandidates(skinId, characterId)) {
      const skinTextureKey = AssetKeyResolver.resolveTexture(
        scene,
        {
          primary: `art_player_${candidateSkinId}_walk_sheet`,
          fallbacks: [`art_player_${candidateSkinId}_texture`],
        },
        `player.${candidateSkinId}.texture`,
      );

      if (skinTextureKey) {
        return skinTextureKey;
      }
    }

    return AssetKeyResolver.resolveTexture(
      scene,
      DEFAULT_ASSET_KEY_MAP.player.texture,
      'player.default.texture',
    );
  }

  static getPlayerAnimationKey(
    scene: Phaser.Scene,
    state: PlayerAnimationState,
    direction: PlayerDirection8,
    skinId?: string,
    characterId?: string,
  ): string | null {
    for (const candidateSkinId of AssetKeyResolver.getPlayerSkinCandidates(skinId, characterId)) {
      const skinDirectionAnimationKey = AssetKeyResolver.resolveAnimation(
        scene,
        {
          primary: `art_player_${candidateSkinId}_${state}_${direction}`,
        },
        `player.${candidateSkinId}.${state}.${direction}`,
      );

      if (skinDirectionAnimationKey) {
        return skinDirectionAnimationKey;
      }

      const skinGenericAnimationKey = AssetKeyResolver.resolveAnimation(
        scene,
        {
          primary: `art_player_${candidateSkinId}_${state}`,
        },
        `player.${candidateSkinId}.${state}`,
      );

      if (skinGenericAnimationKey) {
        return skinGenericAnimationKey;
      }
    }

    return AssetKeyResolver.resolveAnimation(
      scene,
      DEFAULT_ASSET_KEY_MAP.player.animations[state][direction],
      `player.default.animation.${state}.${direction}`,
    );
  }

  static getEnemyTextureKey(scene: Phaser.Scene, enemyId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.enemies[
      enemyId as keyof typeof DEFAULT_ASSET_KEY_MAP.enemies
    ];

    if (!entry) {
      return AssetKeyResolver.resolveTexture(
        scene,
        { primary: enemyId },
        `enemy.${enemyId}.texture`,
      );
    }

    return AssetKeyResolver.resolveTexture(scene, entry.texture, `enemy.${enemyId}.texture`);
  }

  static getEnemyAnimationKey(scene: Phaser.Scene, enemyId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.enemies[
      enemyId as keyof typeof DEFAULT_ASSET_KEY_MAP.enemies
    ];

    if (!entry || !('animation' in entry)) {
      return null;
    }

    return AssetKeyResolver.resolveAnimation(scene, entry.animation, `enemy.${enemyId}.animation`);
  }

  static getWeaponProjectileTextureKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.projectileTexture
      ? AssetKeyResolver.resolveTexture(
        scene,
        entry.projectileTexture,
        `weapon.${weaponId}.projectile.texture`,
      )
      : null;
  }

  static getWeaponProjectileAnimationKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.projectileAnimation
      ? AssetKeyResolver.resolveAnimation(
        scene,
        entry.projectileAnimation,
        `weapon.${weaponId}.projectile.animation`,
      )
      : null;
  }

  static getWeaponIconKey(scene: Phaser.Scene, weaponId: string): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);

    return entry?.icon
      ? AssetKeyResolver.resolveTexture(scene, entry.icon, `weapon.${weaponId}.icon`, 'icons')
      : null;
  }

  static getPassiveIconKey(scene: Phaser.Scene, passiveId: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.passives[
      passiveId as keyof typeof DEFAULT_ASSET_KEY_MAP.passives
    ];

    return entry
      ? AssetKeyResolver.resolveTexture(scene, entry, `passive.${passiveId}.icon`, 'icons')
      : null;
  }

  static getPickupTextureKey(scene: Phaser.Scene, pickupType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.pickups[
      pickupType as keyof typeof DEFAULT_ASSET_KEY_MAP.pickups
    ];

    return entry
      ? AssetKeyResolver.resolveTexture(scene, entry, `pickup.${pickupType}.texture`)
      : null;
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

    return entry?.texture
      ? AssetKeyResolver.resolveTexture(scene, entry.texture, `effect.${effectType}.texture`)
      : null;
  }

  static getEffectAnimationKey(scene: Phaser.Scene, effectType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.effects[
      effectType as keyof typeof DEFAULT_ASSET_KEY_MAP.effects
    ];

    return entry && 'animation' in entry && entry.animation
      ? AssetKeyResolver.resolveAnimation(scene, entry.animation, `effect.${effectType}.animation`)
      : null;
  }

  private static getWeaponEntry(weaponId: string) {
    return DEFAULT_ASSET_KEY_MAP.weapons[
      weaponId as keyof typeof DEFAULT_ASSET_KEY_MAP.weapons
    ];
  }

  private static getPlayerSkinCandidates(
    skinId: string | undefined,
    characterId: string | undefined,
  ): string[] {
    return [skinId, characterId]
      .filter((candidate): candidate is string => (
        candidate !== undefined && candidate.length > 0 && candidate !== 'default'
      ))
      .filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);
  }

  private static getWorldTextureKey(scene: Phaser.Scene, key: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.world[
      key as keyof typeof DEFAULT_ASSET_KEY_MAP.world
    ];

    return entry
      ? AssetKeyResolver.resolveTexture(scene, entry, `world.${key}.texture`, 'world')
      : null;
  }

  private static resolveTexture(
    scene: Phaser.Scene,
    entry: AssetKeyEntry,
    logicalKey?: string,
    overrideDomain: 'textures' | 'icons' | 'world' | 'ui' = 'textures',
  ): string | null {
    const overrideKey = AssetKeyResolver.getOverride(logicalKey ?? entry.logicalKey, overrideDomain);

    if (AssetFallbacks.hasTexture(scene, overrideKey)) {
      return overrideKey;
    }

    return AssetFallbacks.resolveTexture(scene, entry.primary, entry.fallbacks ?? []);
  }

  private static resolveAnimation(
    scene: Phaser.Scene,
    entry: AssetKeyEntry,
    logicalKey?: string,
  ): string | null {
    const overrideKey = AssetKeyResolver.getOverride(logicalKey ?? entry.logicalKey, 'animations');

    if (AssetFallbacks.hasAnimation(scene, overrideKey)) {
      return overrideKey;
    }

    return AssetFallbacks.resolveAnimation(scene, entry.primary, entry.fallbacks ?? []);
  }

  private static getOverride(
    logicalKey: string | undefined,
    domain: 'textures' | 'animations' | 'icons' | 'ui' | 'world',
  ): string | undefined {
    if (!logicalKey) {
      return undefined;
    }

    try {
      return AppearanceManager.resolveOverride(logicalKey, domain);
    } catch {
      return undefined;
    }
  }
}
