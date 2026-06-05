import { UIThemeDefinition } from './UIStyle';

export const MinimalUITheme: UIThemeDefinition = {
  id: 'minimal',
  nameKey: 'settings.uiStyle.minimal',
  colors: {
    backgroundOverlay: 0x000000,
    panelBase: 0x0f172a,
    panelInner: 0x0f172a,
    panelRaised: 0x182235,
    borderPrimary: 0x64748b,
    borderBright: 0xe2e8f0,
    accentGold: 0xeab308,
    accentBlue: 0x7dd3fc,
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#a8b3c5',
    danger: '#f87171',
    success: '#4ade80',
    warning: '#fbbf24',
    accentGoldCss: '#eab308',
    accentBlueCss: '#7dd3fc',
  },
  alpha: {
    overlay: 0.38,
    modal: 0.98,
    hud: 0.35,
    card: 0.96,
    tooltip: 0.95,
  },
  radius: {
    panel: 4,
    card: 4,
    button: 3,
    badge: 3,
    icon: 3,
  },
  spacing: {
    xs: 5,
    sm: 8,
    md: 14,
    lg: 20,
    xl: 28,
  },
  fonts: {
    family: 'Arial, Helvetica, sans-serif',
    title: '38px',
    header: '26px',
    body: '17px',
    small: '13px',
    tiny: '10px',
  },
  sizes: {
    button: {
      small: { width: 180, height: 36, fontSize: '13px' },
      medium: { width: 244, height: 44, fontSize: '17px' },
      large: { width: 284, height: 52, fontSize: '19px' },
    },
    icon: {
      small: 26,
      medium: 38,
      large: 58,
    },
    badgeFontSize: '10px',
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
    borderWidth: 1,
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
    underline: true,
    selectedBorderWidth: 1,
  },
};
