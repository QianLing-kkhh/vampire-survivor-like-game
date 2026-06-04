import {
  DEFAULT_THEME,
  DEFAULT_THEME_ID,
  ThemeDefinition,
} from './ThemeDefinition';
import {
  SkinDefinition,
  SkinTargetType,
} from './SkinDefinition';

export class AppearanceRegistry {
  private static readonly themes = new Map<string, ThemeDefinition>();
  private static readonly skins = new Map<string, SkinDefinition>();
  private static initialized = false;

  static registerTheme(theme: ThemeDefinition): void {
    this.ensureDefaultRegistered();

    if (this.themes.has(theme.id)) {
      console.warn(`Appearance theme id conflict skipped: ${theme.id}`);
      return;
    }

    this.themes.set(theme.id, this.clone(theme));
  }

  static getTheme(id: string): ThemeDefinition | undefined {
    this.ensureDefaultRegistered();
    const theme = this.themes.get(id);

    return theme ? this.clone(theme) : undefined;
  }

  static listThemes(): ThemeDefinition[] {
    this.ensureDefaultRegistered();

    return Array.from(this.themes.values()).map((theme) => this.clone(theme));
  }

  static registerSkin(skin: SkinDefinition): void {
    this.ensureDefaultRegistered();

    if (this.skins.has(skin.id)) {
      console.warn(`Appearance skin id conflict skipped: ${skin.id}`);
      return;
    }

    this.skins.set(skin.id, this.clone(skin));
  }

  static getSkin(id: string): SkinDefinition | undefined {
    this.ensureDefaultRegistered();
    const skin = this.skins.get(id);

    return skin ? this.clone(skin) : undefined;
  }

  static listSkins(): SkinDefinition[] {
    this.ensureDefaultRegistered();

    return Array.from(this.skins.values()).map((skin) => this.clone(skin));
  }

  static getSkinsForTarget(
    targetType: SkinTargetType,
    targetId: string,
  ): SkinDefinition[] {
    this.ensureDefaultRegistered();

    return Array.from(this.skins.values())
      .filter((skin) => skin.targetType === targetType && skin.targetId === targetId)
      .map((skin) => this.clone(skin));
  }

  static hasTheme(id: string): boolean {
    this.ensureDefaultRegistered();

    return this.themes.has(id);
  }

  private static ensureDefaultRegistered(): void {
    if (this.initialized) {
      return;
    }

    this.themes.set(DEFAULT_THEME_ID, this.clone(DEFAULT_THEME));
    this.initialized = true;
  }

  private static clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
