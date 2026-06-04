export const UITheme = {
  themeId: 'default',
  paletteId: 'default',
  buttonStyleId: 'default',
  fontFamily: 'Arial, Helvetica, sans-serif',
  titleFontSize: '40px',
  headerFontSize: '28px',
  bodyFontSize: '18px',
  smallFontSize: '14px',
  panelBgColor: 0x020617,
  panelBgAlpha: 0.9,
  panelBorderColor: 0x94a3b8,
  buttonBgColor: 0x1f2937,
  buttonHoverColor: 0x334155,
  buttonWidth: 260,
  buttonHeight: 48,
  buttonGap: 54,
  buttonFontSize: '18px',
  compactButtonWidth: 220,
  compactButtonHeight: 42,
  compactButtonFontSize: '15px',
  smallButtonWidth: 190,
  smallButtonHeight: 38,
  smallButtonFontSize: '13px',
  pausePanelAlpha: 0.8,
  hudPanelAlpha: 0.55,
  helpPanelAlpha: 0.85,
  levelUpPanelAlpha: 0.9,
  textColor: '#f8fafc',
  mutedTextColor: '#cbd5e1',
  dangerTextColor: '#ef4444',
  successTextColor: '#22c55e',
  barBgColor: 0x1f2937,
  hpBarColor: 0xef4444,
  expBarColor: 0x38bdf8,
  iconBgColor: 0x111827,
};

export function getButtonMetrics(width: number, height: number): {
  width: number;
  height: number;
  gap: number;
  fontSize: string;
} {
  if (width <= 430 || height <= 620) {
    return {
      width: UITheme.smallButtonWidth,
      height: UITheme.smallButtonHeight,
      gap: UITheme.smallButtonHeight + 8,
      fontSize: UITheme.smallButtonFontSize,
    };
  }

  if (width <= 760 || height <= 760) {
    return {
      width: UITheme.compactButtonWidth,
      height: UITheme.compactButtonHeight,
      gap: UITheme.compactButtonHeight + 10,
      fontSize: UITheme.compactButtonFontSize,
    };
  }

  return {
    width: UITheme.buttonWidth,
    height: UITheme.buttonHeight,
    gap: UITheme.buttonGap,
    fontSize: UITheme.buttonFontSize,
  };
}

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
