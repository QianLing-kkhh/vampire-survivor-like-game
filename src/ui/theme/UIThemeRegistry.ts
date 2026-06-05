import { SettingsManager } from '../../settings/SettingsManager';
import { ArcaneSlateTheme } from './ArcaneSlateTheme';
import { ClassicUITheme } from './ClassicUITheme';
import { MinimalUITheme } from './MinimalUITheme';
import {
  UI_STYLES,
  UIStyle,
  UIThemeDefinition,
  isUIStyle,
} from './UIStyle';

const THEMES: Record<UIStyle, UIThemeDefinition> = {
  classic: ClassicUITheme,
  arcaneSlate: ArcaneSlateTheme,
  minimal: MinimalUITheme,
};

export class UIThemeRegistry {
  static getCurrentStyle(): UIStyle {
    try {
      const style = SettingsManager.getDisplay().uiStyle;

      return isUIStyle(style) ? style : 'classic';
    } catch {
      return 'classic';
    }
  }

  static getCurrentTheme(): UIThemeDefinition {
    return UIThemeRegistry.getTheme(UIThemeRegistry.getCurrentStyle());
  }

  static getTheme(style: UIStyle): UIThemeDefinition {
    return THEMES[style] ?? ClassicUITheme;
  }

  static listStyles(): readonly UIStyle[] {
    return UI_STYLES;
  }

  static cycleStyle(current: UIStyle): UIStyle {
    const styles = UIThemeRegistry.listStyles();
    const currentIndex = styles.indexOf(current);

    return styles[(currentIndex + 1) % styles.length] ?? 'classic';
  }
}
