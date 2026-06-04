import { SaveManager } from '../save/SaveManager';
import { AppearanceRegistry } from './AppearanceRegistry';
import {
  AppearanceSelection,
  DEFAULT_APPEARANCE_SELECTION,
} from './AppearanceSelection';
import { SkinDefinition } from './SkinDefinition';
import {
  DEFAULT_THEME_ID,
  ThemeDefinition,
} from './ThemeDefinition';
import {
  ThemeAssetOverrideDomain,
  ThemeAssetOverrides,
} from './ThemeAssetOverrides';

type AppearanceListener = (selection: AppearanceSelection) => void;

export class AppearanceManager {
  private static readonly listeners = new Set<AppearanceListener>();

  static getSelection(): AppearanceSelection {
    const save = SaveManager.get();
    const cosmetics = save.cosmetics;
    const selectedThemeId = AppearanceRegistry.hasTheme(cosmetics.selectedThemeId)
      ? cosmetics.selectedThemeId
      : DEFAULT_THEME_ID;

    return {
      ...DEFAULT_APPEARANCE_SELECTION,
      ...cosmetics,
      selectedThemeId,
      selectedCharacterSkinByCharacterId: {
        ...cosmetics.selectedCharacterSkinByCharacterId,
      },
      selectedWeaponSkinByWeaponId: {
        ...cosmetics.selectedWeaponSkinByWeaponId,
      },
      selectedEnemySkinByEnemyId: {
        ...cosmetics.selectedEnemySkinByEnemyId,
      },
    };
  }

  static setSelectedThemeId(themeId: string): void {
    const selectedThemeId = AppearanceRegistry.hasTheme(themeId)
      ? themeId
      : DEFAULT_THEME_ID;

    SaveManager.update({
      selections: {
        selectedThemeId,
      },
      cosmetics: {
        ...SaveManager.get().cosmetics,
        selectedThemeId,
      },
    });
    this.notify();
  }

  static getSelectedTheme(): ThemeDefinition {
    const selection = this.getSelection();

    return AppearanceRegistry.getTheme(selection.selectedThemeId)
      ?? AppearanceRegistry.getTheme(DEFAULT_THEME_ID)
      ?? { id: DEFAULT_THEME_ID, nameKey: 'appearance.theme.default' };
  }

  static setCharacterSkin(characterId: string, skinId: string): void {
    this.setSkin('selectedCharacterSkinByCharacterId', characterId, skinId);
  }

  static setWeaponSkin(weaponId: string, skinId: string): void {
    this.setSkin('selectedWeaponSkinByWeaponId', weaponId, skinId);
  }

  static setEnemySkin(enemyId: string, skinId: string): void {
    this.setSkin('selectedEnemySkinByEnemyId', enemyId, skinId);
  }

  static getActiveAssetOverrides(): ThemeAssetOverrides {
    const selection = this.getSelection();
    const selectedTheme = this.getSelectedTheme();
    const selectedSkins = this.getSelectedSkins(selection);

    return [
      selectedTheme.assetOverrides,
      ...selectedSkins.map((skin) => skin.assetOverrides),
    ].reduce<ThemeAssetOverrides>((overrides, nextOverrides) => (
      this.mergeOverrides(overrides, nextOverrides)
    ), {});
  }

  static resolveOverride(
    logicalKey: string,
    domain?: ThemeAssetOverrideDomain,
  ): string | undefined {
    const overrides = this.getActiveAssetOverrides();

    if (domain) {
      return overrides[domain]?.[logicalKey];
    }

    const domains: ThemeAssetOverrideDomain[] = [
      'textures',
      'animations',
      'icons',
      'ui',
      'world',
      'audio',
    ];

    for (const overrideDomain of domains) {
      const value = overrides[overrideDomain]?.[logicalKey];

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  static subscribe(listener: AppearanceListener): () => void {
    this.listeners.add(listener);

    return () => this.unsubscribe(listener);
  }

  static unsubscribe(listener: AppearanceListener): void {
    this.listeners.delete(listener);
  }

  private static setSkin(
    field:
      | 'selectedCharacterSkinByCharacterId'
      | 'selectedWeaponSkinByWeaponId'
      | 'selectedEnemySkinByEnemyId',
    targetId: string,
    skinId: string,
  ): void {
    const save = SaveManager.get();

    SaveManager.update({
      cosmetics: {
        ...save.cosmetics,
        [field]: {
          ...save.cosmetics[field],
          [targetId]: skinId,
        },
      },
    });
    this.notify();
  }

  private static getSelectedSkins(selection: AppearanceSelection): SkinDefinition[] {
    const skinIds = [
      ...Object.values(selection.selectedCharacterSkinByCharacterId),
      ...Object.values(selection.selectedWeaponSkinByWeaponId),
      ...Object.values(selection.selectedEnemySkinByEnemyId),
    ];

    return skinIds
      .map((skinId) => AppearanceRegistry.getSkin(skinId))
      .filter((skin): skin is SkinDefinition => skin !== undefined);
  }

  private static mergeOverrides(
    base: ThemeAssetOverrides,
    next: ThemeAssetOverrides | undefined,
  ): ThemeAssetOverrides {
    if (!next) {
      return base;
    }

    return {
      textures: { ...base.textures, ...next.textures },
      animations: { ...base.animations, ...next.animations },
      icons: { ...base.icons, ...next.icons },
      ui: { ...base.ui, ...next.ui },
      world: { ...base.world, ...next.world },
      audio: { ...base.audio, ...next.audio },
    };
  }

  private static notify(): void {
    const selection = this.getSelection();

    for (const listener of this.listeners) {
      listener(selection);
    }
  }
}
