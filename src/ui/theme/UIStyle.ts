export type UIStyle = 'classic' | 'arcaneSlate' | 'minimal';

export const UI_STYLES: readonly UIStyle[] = [
  'classic',
  'arcaneSlate',
  'minimal',
];

export interface UIThemeDefinition {
  id: UIStyle;
  nameKey: string;
  colors: {
    backgroundOverlay: number;
    panelBase: number;
    panelInner: number;
    panelRaised: number;
    borderPrimary: number;
    borderBright: number;
    accentGold: number;
    accentBlue: number;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    danger: string;
    success: string;
    warning: string;
    accentGoldCss: string;
    accentBlueCss: string;
  };
  alpha: {
    overlay: number;
    modal: number;
    hud: number;
    card: number;
    tooltip: number;
  };
  radius: {
    panel: number;
    card: number;
    button: number;
    badge: number;
    icon: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fonts: {
    family: string;
    title: string;
    header: string;
    body: string;
    small: string;
    tiny: string;
  };
  sizes: {
    button: {
      small: { width: number; height: number; fontSize: string };
      medium: { width: number; height: number; fontSize: string };
      large: { width: number; height: number; fontSize: string };
    };
    icon: {
      small: number;
      medium: number;
      large: number;
    };
    badgeFontSize: string;
  };
  depth: {
    hud: number;
    modal: number;
    overlay: number;
    top: number;
  };
  panel: {
    decorated: boolean;
    innerInset: number;
    borderWidth: number;
  };
  button: {
    filled: boolean;
    borderWidth: number;
  };
  card: {
    layered: boolean;
    borderWidth: number;
  };
  tab: {
    underline: boolean;
    selectedBorderWidth: number;
  };
}

export function isUIStyle(value: unknown): value is UIStyle {
  return typeof value === 'string' && UI_STYLES.includes(value as UIStyle);
}
