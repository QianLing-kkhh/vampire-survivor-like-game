import { UIThemeRegistry } from './theme/UIThemeRegistry';

export const UITheme = {
  current: () => UIThemeRegistry.getCurrentTheme(),
  get themeId(): string {
    return UITheme.current().id;
  },
  get paletteId(): string {
    return UITheme.current().id;
  },
  get buttonStyleId(): string {
    return UITheme.current().id;
  },
  get colors() {
    return UITheme.current().colors;
  },
  get alpha() {
    return UITheme.current().alpha;
  },
  get radius() {
    return UITheme.current().radius;
  },
  get spacing() {
    return UITheme.current().spacing;
  },
  get sizes() {
    return UITheme.current().sizes;
  },
  get depth() {
    return UITheme.current().depth;
  },
  get panel() {
    return UITheme.current().panel;
  },
  get button() {
    return UITheme.current().button;
  },
  get card() {
    return UITheme.current().card;
  },
  get tab() {
    return UITheme.current().tab;
  },
  get fontFamily(): string {
    return UITheme.current().fonts.family;
  },
  get titleFontSize(): string {
    return UITheme.current().fonts.title;
  },
  get headerFontSize(): string {
    return UITheme.current().fonts.header;
  },
  get bodyFontSize(): string {
    return UITheme.current().fonts.body;
  },
  get smallFontSize(): string {
    return UITheme.current().fonts.small;
  },
  get panelBgColor(): number {
    return UITheme.current().colors.panelBase;
  },
  get panelBgAlpha(): number {
    return UITheme.current().alpha.modal;
  },
  get panelBorderColor(): number {
    return UITheme.current().colors.borderPrimary;
  },
  get buttonBgColor(): number {
    return UITheme.current().colors.panelRaised;
  },
  get buttonHoverColor(): number {
    return UITheme.current().id === 'minimal' ? 0x263449 : 0x334155;
  },
  get buttonWidth(): number {
    return UITheme.current().sizes.button.medium.width;
  },
  get buttonHeight(): number {
    return UITheme.current().sizes.button.medium.height;
  },
  get buttonGap(): number {
    return UITheme.current().sizes.button.medium.height + 6;
  },
  get buttonFontSize(): string {
    return UITheme.current().sizes.button.medium.fontSize;
  },
  get compactButtonWidth(): number {
    return Math.min(204, UITheme.current().sizes.button.medium.width);
  },
  get compactButtonHeight(): number {
    return Math.min(38, UITheme.current().sizes.button.medium.height);
  },
  get compactButtonFontSize(): string {
    return UITheme.current().id === 'minimal' ? '13px' : '14px';
  },
  get smallButtonWidth(): number {
    return UITheme.current().sizes.button.small.width;
  },
  get smallButtonHeight(): number {
    return UITheme.current().sizes.button.small.height;
  },
  get smallButtonFontSize(): string {
    return UITheme.current().sizes.button.small.fontSize;
  },
  get pausePanelAlpha(): number {
    return UITheme.current().id === 'classic' ? 0.8 : UITheme.current().alpha.modal;
  },
  get hudPanelAlpha(): number {
    return UITheme.current().alpha.hud;
  },
  get levelUpPanelAlpha(): number {
    return UITheme.current().alpha.modal;
  },
  get textColor(): string {
    return UITheme.current().colors.textPrimary;
  },
  get mutedTextColor(): string {
    return UITheme.current().colors.textSecondary;
  },
  get dangerTextColor(): string {
    return UITheme.current().colors.danger;
  },
  get successTextColor(): string {
    return UITheme.current().colors.success;
  },
  get successAccentColor(): number {
    return 0x22c55e;
  },
  get toggleOnColor(): number {
    return 0x22c55e;
  },
  get toggleOffColor(): number {
    return 0x475569;
  },
  get toggleKnobColor(): number {
    return 0xf8fafc;
  },
  get barBgColor(): number {
    return UITheme.current().colors.panelRaised;
  },
  get hpBarColor(): number {
    return 0xef4444;
  },
  get expBarColor(): number {
    return 0x38bdf8;
  },
  get iconBgColor(): number {
    return UITheme.current().colors.panelInner;
  },
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
      gap: UITheme.smallButtonHeight + 6,
      fontSize: UITheme.smallButtonFontSize,
    };
  }

  if (width <= 760 || height <= 760) {
    return {
      width: UITheme.compactButtonWidth,
      height: UITheme.compactButtonHeight,
      gap: UITheme.compactButtonHeight + 7,
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
