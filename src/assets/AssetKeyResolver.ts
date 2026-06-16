import Phaser from 'phaser';

import { AppearanceManager } from '../appearance/AppearanceManager';
import { VisualSettings } from '../visual/VisualSettings';
import { AssetFallbacks } from './AssetFallbacks';
import {
  AssetKeyEntry,
  getPlayerSkinLogicalKey,
  DEFAULT_ASSET_KEY_MAP,
  MapMechanicIconKind,
  MapMechanicVisualKind,
  PlayerAnimationState,
  PlayerDirection8,
  TEXTURE_STATUS_KEYS,
} from './AssetKeyMap';
import { ExternalArtRegistry } from './ExternalArtRegistry';
import { getDefaultSkinId, resolvePlayerSkinId } from './AssetManifest';

export type AssetVisualTierInput = {
  level?: number;
  maxLevel?: number;
  evolved?: boolean;
};

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
      const skinTextureKey = AssetKeyResolver.getLoadedTextureKey(scene, [
        `art_player_${candidateSkinId}_idle_down`,
        `art_player_${candidateSkinId}_walk_down`,
        `art_player_${candidateSkinId}_walk_sheet`,
        `art_player_${candidateSkinId}_texture`,
      ]);

      if (skinTextureKey) {
        return skinTextureKey;
      }

      const externalTextureAsset = ExternalArtRegistry.getPlayerSkinAsset(
        candidateSkinId,
        'idle',
        'down',
      ) ?? ExternalArtRegistry.getPlayerSkinAsset(candidateSkinId, 'walk', 'down');

      if (
        externalTextureAsset
        && !VisualSettings.shouldUseGraphicsFallback()
        && AssetFallbacks.hasTexture(scene, externalTextureAsset.textureKey)
      ) {
        return externalTextureAsset.textureKey;
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
      const builtInDirectionAnimationKey = `art_player_${candidateSkinId}_${state}_${direction}`;

      if (
        !VisualSettings.shouldUseGraphicsFallback()
        && AssetFallbacks.hasAnimation(scene, builtInDirectionAnimationKey)
      ) {
        return builtInDirectionAnimationKey;
      }

      const externalAnimationAsset = ExternalArtRegistry.getPlayerSkinAsset(
        candidateSkinId,
        state,
        direction,
      );
      const externalAnimationKey = externalAnimationAsset?.animationKey;

      if (
        externalAnimationKey
        && !VisualSettings.shouldUseGraphicsFallback()
        && AssetFallbacks.hasAnimation(scene, externalAnimationKey)
      ) {
        return externalAnimationKey;
      }

      const skinDirectionAnimationKey = AssetKeyResolver.resolveAnimation(
        scene,
        {
          primary: `art_player_${candidateSkinId}_${state}_${direction}`,
        },
        getPlayerSkinLogicalKey(candidateSkinId, state, direction),
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

  static getPlayerPortraitKey(
    scene: Phaser.Scene,
    skinId?: string,
    characterId?: string,
  ): string | null {
    for (const candidateSkinId of AssetKeyResolver.getPlayerSkinCandidates(skinId, characterId)) {
      const externalPortrait = ExternalArtRegistry.getPortrait(candidateSkinId);

      if (AssetFallbacks.hasTexture(scene, externalPortrait?.textureKey)) {
        return externalPortrait.textureKey;
      }

      const portraitKey = AssetKeyResolver.resolveTexture(
        scene,
        { primary: `art_player_${candidateSkinId}_portrait` },
        `player.${candidateSkinId}.portrait`,
        'icons',
      );

      if (portraitKey) {
        return portraitKey;
      }
    }

    return AssetKeyResolver.getPlayerTextureKey(scene, skinId, characterId);
  }

  static getPlayerEffectTextureKey(
    scene: Phaser.Scene,
    effectId: string,
    skinId?: string,
    characterId?: string,
  ): string | null {
    for (const candidateSkinId of AssetKeyResolver.getPlayerSkinCandidates(skinId, characterId)) {
      const effectTextureKey = AssetKeyResolver.resolveTexture(
        scene,
        { primary: `art_player_${candidateSkinId}_${effectId}` },
        `player.${candidateSkinId}.effect.${effectId}`,
      );

      if (effectTextureKey) {
        return effectTextureKey;
      }
    }

    return null;
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

  static getWeaponProjectileTextureKey(
    scene: Phaser.Scene,
    weaponId: string,
    visualTier?: AssetVisualTierInput,
  ): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);
    const tierTextureKey = AssetKeyResolver.getTieredKey(
      scene,
      `art_weapons_${weaponId}_projectile_tier`,
      '_sheet',
      visualTier,
    );

    if (tierTextureKey) {
      return tierTextureKey;
    }

    return entry?.projectileTexture
      ? AssetKeyResolver.resolveTexture(
        scene,
        entry.projectileTexture,
        `weapon.${weaponId}.projectile.texture`,
      )
      : null;
  }

  static getWeaponProjectileAnimationKey(
    scene: Phaser.Scene,
    weaponId: string,
    visualTier?: AssetVisualTierInput,
  ): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);
    const tierTextureKey = AssetKeyResolver.getTieredKey(
      scene,
      `art_weapons_${weaponId}_projectile_tier`,
      '_sheet',
      visualTier,
    );
    const tierAnimationKey = tierTextureKey ? `${tierTextureKey}_anim` : null;

    if (AssetFallbacks.hasAnimation(scene, tierAnimationKey)) {
      return tierAnimationKey;
    }

    return entry?.projectileAnimation
      ? AssetKeyResolver.resolveAnimation(
        scene,
        entry.projectileAnimation,
        `weapon.${weaponId}.projectile.animation`,
      )
      : null;
  }

  static getWeaponIconKey(
    scene: Phaser.Scene,
    weaponId: string,
    visualTier?: AssetVisualTierInput,
  ): string | null {
    const entry = AssetKeyResolver.getWeaponEntry(weaponId);
    const externalIcon = ExternalArtRegistry.getWeaponIcon(weaponId);

    if (AssetFallbacks.hasTexture(scene, externalIcon?.textureKey)) {
      return externalIcon.textureKey;
    }

    const tierIconKey = AssetKeyResolver.getTieredKey(
      scene,
      `art_weapons_${weaponId}_icon_tier`,
      '',
      visualTier,
    );

    if (tierIconKey) {
      return tierIconKey;
    }

    return entry?.icon
      ? AssetKeyResolver.resolveTexture(scene, entry.icon, `weapon.${weaponId}.icon`, 'icons')
      : null;
  }

  static getPassiveIconKey(
    scene: Phaser.Scene,
    passiveId: string,
    visualTier?: AssetVisualTierInput,
  ): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.passives[
      passiveId as keyof typeof DEFAULT_ASSET_KEY_MAP.passives
    ];
    const tierIconKey = AssetKeyResolver.getTieredKey(
      scene,
      `art_passives_${passiveId}_icon_tier`,
      '',
      visualTier,
    );

    if (tierIconKey) {
      return tierIconKey;
    }

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
    return AssetKeyResolver.getWorldTextureKey(scene, tileType)
      ?? (tileType === 'ground_tile' ? null : AssetKeyResolver.getWorldTextureKey(scene, 'ground_tile'));
  }

  static getMapMechanicTextureKey(
    scene: Phaser.Scene,
    kind: MapMechanicVisualKind,
  ): string | undefined {
    const entry = DEFAULT_ASSET_KEY_MAP.mapMechanics.visuals[kind];

    return AssetKeyResolver.resolveTexture(
      scene,
      entry,
      `mapMechanic.${kind}.texture`,
      'world',
    ) ?? undefined;
  }

  static getMapMechanicMinimapIconKey(
    scene: Phaser.Scene,
    kind: MapMechanicIconKind,
  ): string | undefined {
    const entry = DEFAULT_ASSET_KEY_MAP.mapMechanics.minimapIcons[kind];

    return AssetKeyResolver.resolveTexture(
      scene,
      entry,
      `mapMechanic.${kind}.minimap`,
      'icons',
    ) ?? undefined;
  }

  static getEffectTextureKey(scene: Phaser.Scene, effectType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.effects[
      effectType as keyof typeof DEFAULT_ASSET_KEY_MAP.effects
    ];
    const externalEffect = ExternalArtRegistry.getEffect(effectType);

    if (
      !VisualSettings.shouldUseGraphicsFallback()
      && AssetFallbacks.hasTexture(scene, externalEffect?.textureKey)
    ) {
      return externalEffect.textureKey;
    }

    return entry?.texture
      ? AssetKeyResolver.resolveTexture(scene, entry.texture, `effect.${effectType}.texture`)
      : null;
  }

  static getEffectAnimationKey(scene: Phaser.Scene, effectType: string): string | null {
    const entry = DEFAULT_ASSET_KEY_MAP.effects[
      effectType as keyof typeof DEFAULT_ASSET_KEY_MAP.effects
    ];
    const externalEffect = ExternalArtRegistry.getEffect(effectType);

    if (
      externalEffect?.animationKey
      && !VisualSettings.shouldUseGraphicsFallback()
      && AssetFallbacks.hasAnimation(scene, externalEffect.animationKey)
    ) {
      return externalEffect.animationKey;
    }

    return entry && 'animation' in entry && entry.animation
      ? AssetKeyResolver.resolveAnimation(scene, entry.animation, `effect.${effectType}.animation`)
      : null;
  }

  private static getWeaponEntry(weaponId: string) {
    return DEFAULT_ASSET_KEY_MAP.weapons[
      weaponId as keyof typeof DEFAULT_ASSET_KEY_MAP.weapons
    ];
  }

  private static getTieredKey(
    scene: Phaser.Scene,
    prefix: string,
    suffix: string,
    visualTier: AssetVisualTierInput | undefined,
  ): string | null {
    const tier = AssetKeyResolver.getVisualTier(visualTier);

    if (tier === undefined) {
      return null;
    }

    const key = `${prefix}${tier}${suffix}`;

    return AssetFallbacks.hasTexture(scene, key) ? key : null;
  }

  private static getVisualTier(visualTier: AssetVisualTierInput | undefined): 1 | 2 | 3 | undefined {
    if (!visualTier) {
      return undefined;
    }

    if (visualTier.evolved) {
      return 3;
    }

    const level = Math.max(0, Math.floor(visualTier.level ?? 0));
    const maxLevel = Math.max(1, Math.floor(visualTier.maxLevel ?? 0));

    if (level <= 0) {
      return 1;
    }

    const ratio = level / maxLevel;

    if (ratio >= 0.8 || level >= maxLevel) {
      return 3;
    }

    if (ratio >= 0.4) {
      return 2;
    }

    return 1;
  }

  private static getPlayerSkinCandidates(
    skinId: string | undefined,
    characterId: string | undefined,
  ): string[] {
    const resolvedSkinId = resolvePlayerSkinId(skinId, characterId);
    const resolvedCharacterSkinId = getDefaultSkinId(characterId ?? 'default');

    return [skinId, characterId]
      .filter((candidate): candidate is string => (
        candidate !== undefined && candidate.length > 0 && candidate !== 'default'
      ))
      .concat(resolvedSkinId, resolvedCharacterSkinId)
      .filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);
  }

  private static getLoadedTextureKey(
    scene: Phaser.Scene,
    keys: readonly string[],
  ): string | null {
    return keys.find((key) => AssetFallbacks.hasTexture(scene, key)) ?? null;
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
    const fallbackLogicalKey = logicalKey ?? entry.logicalKey;

    if (
      VisualSettings.shouldUseGraphicsFallback()
      && (overrideDomain === 'textures' || overrideDomain === 'world')
    ) {
      return null;
    }

    const externalOverrideKey = AssetKeyResolver.getExternalOverride(
      fallbackLogicalKey,
      overrideDomain,
    );

    if (AssetFallbacks.hasTexture(scene, externalOverrideKey)) {
      return externalOverrideKey;
    }

    const overrideKey = AssetKeyResolver.getOverride(fallbackLogicalKey, overrideDomain);

    if (AssetFallbacks.hasTexture(scene, overrideKey)) {
      return overrideKey;
    }

    if (VisualSettings.shouldUseLegacyArt()) {
      const legacyKey = AssetFallbacks.resolveTexture(
        scene,
        entry.fallbacks?.[0],
        [
          ...(entry.fallbacks?.slice(1) ?? []),
          entry.primary,
        ],
        {
          kind: 'texture',
          logicalKey: fallbackLogicalKey,
        },
      );

      if (legacyKey) {
        return legacyKey;
      }
    }

    return AssetFallbacks.resolveTexture(
      scene,
      entry.primary,
      entry.fallbacks ?? [],
      {
        kind: 'texture',
        logicalKey: fallbackLogicalKey,
      },
    );
  }

  private static resolveAnimation(
    scene: Phaser.Scene,
    entry: AssetKeyEntry,
    logicalKey?: string,
  ): string | null {
    const fallbackLogicalKey = logicalKey ?? entry.logicalKey;

    if (VisualSettings.shouldUseGraphicsFallback()) {
      return null;
    }

    const externalOverrideKey = AssetKeyResolver.getExternalOverride(
      fallbackLogicalKey,
      'animations',
    );

    if (AssetFallbacks.hasAnimation(scene, externalOverrideKey)) {
      return externalOverrideKey;
    }

    const overrideKey = AssetKeyResolver.getOverride(fallbackLogicalKey, 'animations');

    if (AssetFallbacks.hasAnimation(scene, overrideKey)) {
      return overrideKey;
    }

    return AssetFallbacks.resolveAnimation(
      scene,
      entry.primary,
      entry.fallbacks ?? [],
      {
        kind: 'animation',
        logicalKey: fallbackLogicalKey,
      },
    );
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

  private static getExternalOverride(
    logicalKey: string | undefined,
    domain: 'textures' | 'animations' | 'icons' | 'ui' | 'world',
  ): string | undefined {
    if (!logicalKey) {
      return undefined;
    }

    const externalAsset = ExternalArtRegistry.getAssetByLogicalKey(logicalKey);

    if (!externalAsset) {
      return undefined;
    }

    return domain === 'animations'
      ? externalAsset.animationKey
      : externalAsset.textureKey;
  }
}
