import { SettingsManager } from '../settings/SettingsManager';

import { AssetStyle, DisplayQuality } from './DisplayQuality';

export class VisualSettings {
  static getDisplayQuality(): DisplayQuality {
    try {
      return SettingsManager.getDisplay().displayQuality;
    } catch {
      return 'high';
    }
  }

  static getAssetStyle(): AssetStyle {
    try {
      return SettingsManager.getDisplay().assetStyle;
    } catch {
      return 'newArt';
    }
  }

  static areShadowsEnabled(): boolean {
    try {
      const display = SettingsManager.getDisplay();

      return display.displayQuality !== 'minimal' && display.shadowsEnabled;
    } catch {
      return true;
    }
  }

  static shouldUsePngAssets(): boolean {
    return !VisualSettings.shouldUseGraphicsFallback();
  }

  static shouldUseNewArt(): boolean {
    return VisualSettings.getAssetStyle() === 'newArt'
      && !VisualSettings.shouldUseGraphicsFallback();
  }

  static shouldUseLegacyArt(): boolean {
    return VisualSettings.getAssetStyle() === 'legacy'
      && !VisualSettings.shouldUseGraphicsFallback();
  }

  static shouldUseGraphicsFallback(): boolean {
    return VisualSettings.getDisplayQuality() === 'minimal'
      || VisualSettings.getAssetStyle() === 'graphics';
  }
}
