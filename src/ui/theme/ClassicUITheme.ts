import { UIThemeDefinition } from './UIStyle';

export const ClassicUITheme: UIThemeDefinition = {
  id: 'classic',
  nameKey: 'settings.uiStyle.classic',
  colors: {
    backgroundOverlay: 0x020617,
    panelBase: 0x020617,
    panelInner: 0x111827,
    panelRaised: 0x1f2937,
    borderPrimary: 0x94a3b8,
    borderBright: 0xcbd5e1,
    accentGold: 0xf5c542,
    accentBlue: 0x38bdf8,
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    accentGoldCss: '#f5c542',
    accentBlueCss: '#38bdf8',
  },
  alpha: {
    overlay: 0.48,
    modal: 0.9,
    hud: 0.55,
    card: 1,
    tooltip: 0.85,
  },
  radius: {
    panel: 2,
    card: 2,
    button: 2,
    badge: 2,
    icon: 2,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 34,
  },
  fonts: {
    family: 'Arial, Helvetica, sans-serif',
    title: '40px',
    header: '28px',
    body: '18px',
    small: '14px',
    tiny: '11px',
  },
  sizes: {
    button: {
      small: { width: 170, height: 34, fontSize: '12px' },
      medium: { width: 230, height: 42, fontSize: '16px' },
      large: { width: 270, height: 50, fontSize: '18px' },
    },
    icon: {
      small: 28,
      medium: 42,
      large: 64,
    },
    badgeFontSize: '11px',
  },
  depth: {
    hud: 900,
    modal: 1200,
    overlay: 1400,
    top: 2200,
  },
  panel: {
    decorated: false,
    innerInset: 0,
    borderWidth: 2,
  },
  button: {
    filled: true,
    borderWidth: 1,
  },
  card: {
    layered: false,
    borderWidth: 1,
  },
  tab: {
    underline: false,
    selectedBorderWidth: 2,
  },
};
