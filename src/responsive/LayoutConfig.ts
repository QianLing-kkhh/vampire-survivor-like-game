import Phaser from 'phaser';

import { getButtonMetrics } from '../ui/UITheme';
import { SafeArea } from './SafeArea';
import { ScreenManager } from './ScreenManager';

export type HudLayout = {
  statsPosition: Phaser.Math.Vector2;
  weaponsPosition: Phaser.Math.Vector2;
  passivesPosition: Phaser.Math.Vector2;
  minimapPosition: Phaser.Math.Vector2;
  minimapSize: { width: number; height: number };
  bossTextPosition: Phaser.Math.Vector2;
  barWidth: number;
  maxIconRows: number;
  fontSize: string;
};

export type LevelUpPanelLayout = {
  panelCenter: Phaser.Math.Vector2;
  cardWidth: number;
  cardHeight: number;
  cardGap: number;
  layoutMode: 'horizontal' | 'vertical';
  panelWidth: number;
  panelHeight: number;
  fontSize: string;
  descriptionFontSize: string;
};

export type MenuLayout = {
  panelCenter: Phaser.Math.Vector2;
  panelWidth: number;
  panelHeight: number;
  buttonStartY: number;
  buttonGap: number;
  fontSize: string;
};

export type TitleLayout = {
  titlePosition: Phaser.Math.Vector2;
  statusPosition: Phaser.Math.Vector2;
  countdownPosition: Phaser.Math.Vector2;
  buttonStartY: number;
  buttonGap: number;
  buttonColumns: 1 | 2;
  fontSize: string;
};

export type ResultLayout = {
  panelCenter: Phaser.Math.Vector2;
  contentStartY: number;
  buttonArea: Phaser.Math.Vector2;
  buttonGap: number;
  fontSize: string;
  titleY: number;
};

export type HelpLayout = {
  panelCenter: Phaser.Math.Vector2;
  panelWidth: number;
  panelHeight: number;
  bodyWidth: number;
  fontSize: string;
};

export type ButtonLayoutMode = 'vertical' | 'twoColumn';

export type ButtonLayout = {
  positions: Phaser.Math.Vector2[];
  width: number;
  height: number;
  gap: number;
  fontSize: string;
  mode: ButtonLayoutMode;
};

export class LayoutConfig {
  static getButtonLayout(
    screen: ScreenManager,
    count: number,
    options: {
      centerX?: number;
      startY?: number;
      mode?: ButtonLayoutMode | 'auto';
      maxColumns?: 1 | 2;
    } = {},
  ): ButtonLayout {
    const metrics = getButtonMetrics(screen.width, screen.height);
    const mode = options.mode === 'vertical' || screen.isPortrait() || options.maxColumns === 1
      ? 'vertical'
      : options.mode === 'twoColumn'
        ? 'twoColumn'
        : count > 5 ? 'twoColumn' : 'vertical';
    const centerX = options.centerX ?? screen.centerX;
    const startY = options.startY ?? screen.centerY;
    const positions: Phaser.Math.Vector2[] = [];

    if (mode === 'vertical') {
      const totalHeight = (count - 1) * metrics.gap;
      for (let index = 0; index < count; index += 1) {
        positions.push(new Phaser.Math.Vector2(
          centerX,
          startY - totalHeight / 2 + index * metrics.gap,
        ));
      }

      return { positions, mode, ...metrics };
    }

    const columnGap = metrics.width + 26;
    const rows = Math.ceil(count / 2);
    const totalHeight = (rows - 1) * metrics.gap;
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / 2);
      const column = index % 2;
      positions.push(new Phaser.Math.Vector2(
        centerX + (column === 0 ? -columnGap / 2 : columnGap / 2),
        startY - totalHeight / 2 + row * metrics.gap,
      ));
    }

    return { positions, mode, ...metrics };
  }

  static getHudLayout(screen: ScreenManager): HudLayout {
    const safe = SafeArea.getInsets(screen);
    const portrait = screen.isPortrait();
    const minimapWidth = portrait ? 116 : 150;
    const minimapHeight = portrait ? 96 : 104;
    const barWidth = Math.min(portrait ? screen.width * 0.48 : 230, 250);

    return {
      statsPosition: new Phaser.Math.Vector2(safe.left, safe.top),
      weaponsPosition: new Phaser.Math.Vector2(safe.left, safe.top + 132),
      passivesPosition: new Phaser.Math.Vector2(portrait ? safe.left + 136 : safe.left, portrait ? safe.top + 132 : safe.top + 250),
      minimapPosition: new Phaser.Math.Vector2(screen.width - safe.right - minimapWidth, safe.top),
      minimapSize: { width: minimapWidth, height: minimapHeight },
      bossTextPosition: new Phaser.Math.Vector2(screen.centerX, safe.top + 92),
      barWidth,
      maxIconRows: portrait ? 4 : 6,
      fontSize: portrait ? '12px' : '14px',
    };
  }

  static getLevelUpPanelLayout(screen: ScreenManager): LevelUpPanelLayout {
    const portrait = screen.isPortrait();
    const safe = SafeArea.getInsets(screen);
    const availableWidth = screen.width - safe.left - safe.right;
    const availableHeight = screen.height - safe.top - safe.bottom;

    if (portrait) {
      const cardWidth = Math.min(availableWidth - 20, 430);
      const cardHeight = Math.max(96, Math.min(128, (availableHeight - 132) / 3));

      return {
        panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
        cardWidth,
        cardHeight,
        cardGap: 14,
        layoutMode: 'vertical',
        panelWidth: Math.min(availableWidth, cardWidth + 34),
        panelHeight: Math.min(availableHeight, cardHeight * 3 + 118),
        fontSize: '16px',
        descriptionFontSize: '12px',
      };
    }

    const cardWidth = Math.min(300, (availableWidth - 96) / 3);

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      cardWidth,
      cardHeight: Math.min(220, availableHeight - 170),
      cardGap: 18,
      layoutMode: 'horizontal',
      panelWidth: Math.min(availableWidth, cardWidth * 3 + 92),
      panelHeight: Math.min(availableHeight, 360),
      fontSize: '18px',
      descriptionFontSize: '13px',
    };
  }

  static getPauseMenuLayout(screen: ScreenManager): MenuLayout {
    const portrait = screen.isPortrait();
    const safe = SafeArea.getInsets(screen);
    const panelWidth = Math.min(screen.width - safe.left - safe.right, portrait ? 360 : 440);
    const panelHeight = Math.min(screen.height - safe.top - safe.bottom, portrait ? 640 : 650);

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      panelWidth,
      panelHeight,
      buttonStartY: screen.centerY - panelHeight / 2 + 88,
      buttonGap: getButtonMetrics(screen.width, screen.height).gap,
      fontSize: getButtonMetrics(screen.width, screen.height).fontSize,
    };
  }

  static getTitleLayout(screen: ScreenManager): TitleLayout {
    const portrait = screen.isPortrait();

    return {
      titlePosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 84 : screen.centerY - 170),
      statusPosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 142 : screen.centerY - 92),
      countdownPosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 206 : screen.centerY - 44),
      buttonStartY: portrait ? 254 : screen.centerY - 8,
      buttonGap: getButtonMetrics(screen.width, screen.height).gap,
      buttonColumns: portrait ? 1 : 2,
      fontSize: getButtonMetrics(screen.width, screen.height).fontSize,
    };
  }

  static getResultLayout(screen: ScreenManager): ResultLayout {
    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      contentStartY: screen.isPortrait() ? 126 : screen.centerY - 56,
      buttonArea: new Phaser.Math.Vector2(screen.centerX, screen.height - 152),
      buttonGap: getButtonMetrics(screen.width, screen.height).gap,
      fontSize: screen.isPortrait() ? '12px' : '18px',
      titleY: screen.isPortrait() ? 54 : screen.centerY - 140,
    };
  }

  static getHelpLayout(screen: ScreenManager): HelpLayout {
    const safe = SafeArea.getInsets(screen);
    const panelWidth = Math.min(screen.width - safe.left - safe.right, screen.isPortrait() ? 360 : 720);
    const panelHeight = Math.min(screen.height - safe.top - safe.bottom, screen.isPortrait() ? 620 : 500);

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      panelWidth,
      panelHeight,
      bodyWidth: panelWidth - 80,
      fontSize: screen.isPortrait() ? '14px' : '18px',
    };
  }
}
