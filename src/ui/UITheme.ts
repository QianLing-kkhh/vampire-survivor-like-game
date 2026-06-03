export const UITheme = {
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
  textColor: '#f8fafc',
  mutedTextColor: '#cbd5e1',
  dangerTextColor: '#ef4444',
  successTextColor: '#22c55e',
  barBgColor: 0x1f2937,
  hpBarColor: 0xef4444,
  expBarColor: 0x38bdf8,
  iconBgColor: 0x111827,
};

export function toCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
