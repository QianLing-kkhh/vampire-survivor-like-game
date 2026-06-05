import { UIThemeDefinition } from './UIStyle';

export const ArcaneSlateTheme: UIThemeDefinition = {
  id: 'arcaneSlate',
  nameKey: 'settings.uiStyle.arcaneSlate',
  colors: {
    backgroundOverlay: 0x020617,
    panelBase: 0x0b1220,
    panelInner: 0x111827,
    panelRaised: 0x1f2937,
    borderPrimary: 0x5b7fa8,
    borderBright: 0x93c5fd,
    accentGold: 0xf5c542,
    accentBlue: 0x60a5fa,
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    accentGoldCss: '#f5c542',
    accentBlueCss: '#60a5fa',
  },
  alpha: {
    overlay: 0.72,
    modal: 0.94,
    hud: 0.48,
    card: 0.9,
    tooltip: 0.88,
  },
  radius: {
    panel: 8,
    card: 8,
    button: 6,
    badge: 6,
    icon: 7,
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
      small: { width: 190, height: 38, fontSize: '13px' },
      medium: { width: 260, height: 48, fontSize: '18px' },
      large: { width: 300, height: 56, fontSize: '20px' },
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
    decorated: true,
    innerInset: 8,
    borderWidth: 2,
  },
  button: {
    filled: true,
    borderWidth: 1,
  },
  card: {
    layered: true,
    borderWidth: 1,
  },
  tab: {
    underline: false,
    selectedBorderWidth: 2,
  },
};
