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
  pauseButtonPosition: Phaser.Math.Vector2;
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

export type ResultSceneLayout = {
  headerY: number;
  summaryArea: RectLayout;
  leaderboardArea: RectLayout;
  autoRestartY: number;
  buttonArea: RectLayout;
  buttonLayout: ButtonLayout;
  summaryMaxRows: number;
  leaderboardMaxRows: number;
  fontSize: string;
  smallFontSize: string;
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

export type RectLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TextListLayout = {
  rows: Array<{
    iconX: number;
    iconY: number;
    textX: number;
    textY: number;
    width: number;
    height: number;
  }>;
  lineHeight: number;
};

export type ResponsiveFontSizes = {
  title: string;
  header: string;
  body: string;
  small: string;
};

export class LayoutConfig {
  static getResponsiveFontSizes(screen: ScreenManager): ResponsiveFontSizes {
    if (screen.width <= 430 || screen.height <= 620) {
      return {
        title: '26px',
        header: '21px',
        body: '12px',
        small: '10px',
      };
    }

    if (screen.isPortrait() || screen.width <= 760 || screen.height <= 760) {
      return {
        title: '30px',
        header: '24px',
        body: '14px',
        small: '11px',
      };
    }

    return {
      title: '40px',
      header: '28px',
      body: '18px',
      small: '14px',
    };
  }

  static getPanelLayout(
    screen: ScreenManager,
    options: {
      maxWidth: number;
      maxHeight: number;
      padding?: number;
    },
  ): RectLayout & { content: RectLayout } {
    const safe = SafeArea.getInsets(screen);
    const padding = options.padding ?? 24;
    const width = Math.min(options.maxWidth, screen.width - safe.left - safe.right);
    const height = Math.min(options.maxHeight, screen.height - safe.top - safe.bottom);
    const x = screen.centerX - width / 2;
    const y = screen.centerY - height / 2;

    return {
      x,
      y,
      width,
      height,
      content: {
        x: x + padding,
        y: y + padding,
        width: Math.max(0, width - padding * 2),
        height: Math.max(0, height - padding * 2),
      },
    };
  }

  static getTextListLayout(params: {
    startX: number;
    startY: number;
    rowCount: number;
    lineHeight: number;
    iconSize?: number;
    gap?: number;
    width: number;
  }): TextListLayout {
    const iconSize = params.iconSize ?? 0;
    const gap = params.gap ?? 8;

    return {
      lineHeight: params.lineHeight,
      rows: Array.from({ length: params.rowCount }, (_value, index) => {
        const y = params.startY + index * params.lineHeight;

        return {
          iconX: params.startX + iconSize / 2,
          iconY: y + params.lineHeight / 2,
          textX: params.startX + (iconSize > 0 ? iconSize + gap : 0),
          textY: y,
          width: params.width - (iconSize > 0 ? iconSize + gap : 0),
          height: params.lineHeight,
        };
      }),
    };
  }

  static getButtonListLayout(params: {
    screen: ScreenManager;
    count: number;
    startY: number;
    buttonWidth?: number;
    buttonHeight?: number;
    gap?: number;
    mode?: ButtonLayoutMode;
    centerX?: number;
  }): ButtonLayout {
    const metrics = getButtonMetrics(params.screen.width, params.screen.height);
    const width = params.buttonWidth ?? metrics.width;
    const height = params.buttonHeight ?? metrics.height;
    const gap = params.gap ?? Math.max(height + 8, metrics.gap);
    const mode = params.mode ?? 'vertical';
    const centerX = params.centerX ?? params.screen.centerX;
    const positions: Phaser.Math.Vector2[] = [];

    if (mode === 'vertical') {
      for (let index = 0; index < params.count; index += 1) {
        positions.push(new Phaser.Math.Vector2(centerX, params.startY + index * gap));
      }

      return { positions, width, height, gap, fontSize: metrics.fontSize, mode };
    }

    const columnGap = width + 24;
    for (let index = 0; index < params.count; index += 1) {
      const row = Math.floor(index / 2);
      const column = index % 2;
      positions.push(new Phaser.Math.Vector2(
        centerX + (column === 0 ? -columnGap / 2 : columnGap / 2),
        params.startY + row * gap,
      ));
    }

    return { positions, width, height, gap, fontSize: metrics.fontSize, mode };
  }

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
    const minimapWidth = portrait ? 96 : 150;
    const minimapHeight = portrait ? 76 : 104;
    const barWidth = Math.min(portrait ? screen.width * 0.48 : 230, 250);
    const pauseButtonPosition = portrait
      ? new Phaser.Math.Vector2(safe.left + 58, safe.top + 28)
      : new Phaser.Math.Vector2(screen.width - safe.right - minimapWidth - 70, safe.top + 28);
    const minimapPosition = portrait
      ? new Phaser.Math.Vector2(screen.width - safe.right - minimapWidth, safe.top + 16)
      : new Phaser.Math.Vector2(screen.width - safe.right - minimapWidth, safe.top + 56);

    return {
      statsPosition: new Phaser.Math.Vector2(safe.left, safe.top),
      weaponsPosition: new Phaser.Math.Vector2(safe.left, safe.top + 132),
      passivesPosition: new Phaser.Math.Vector2(portrait ? safe.left : safe.left, portrait ? safe.top + 264 : safe.top + 250),
      minimapPosition,
      minimapSize: { width: minimapWidth, height: minimapHeight },
      pauseButtonPosition,
      bossTextPosition: new Phaser.Math.Vector2(screen.centerX, safe.top + 92),
      barWidth,
      maxIconRows: portrait ? 3 : 6,
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
      const cardHeight = Math.max(150, Math.min(210, (availableHeight - 132) / 3));

      return {
        panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
        cardWidth,
        cardHeight,
        cardGap: 10,
        layoutMode: 'vertical',
        panelWidth: Math.min(availableWidth, cardWidth + 34),
        panelHeight: Math.min(availableHeight, cardHeight * 3 + 118),
        fontSize: '14px',
        descriptionFontSize: '11px',
      };
    }

    const cardWidth = Math.min(300, (availableWidth - 96) / 3);

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      cardWidth,
      cardHeight: Math.min(250, availableHeight - 170),
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
      titlePosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 74 : screen.centerY - 188),
      statusPosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 128 : screen.centerY - 118),
      countdownPosition: new Phaser.Math.Vector2(screen.centerX, portrait ? 184 : screen.centerY - 64),
      buttonStartY: portrait ? 228 : screen.centerY - 18,
      buttonGap: getButtonMetrics(screen.width, screen.height).gap,
      buttonColumns: 1,
      fontSize: getButtonMetrics(screen.width, screen.height).fontSize,
    };
  }

  static getResultLayout(screen: ScreenManager): ResultLayout {
    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      contentStartY: screen.isPortrait() ? 104 : 96,
      buttonArea: new Phaser.Math.Vector2(screen.centerX, screen.height - (screen.isPortrait() ? 222 : 154)),
      buttonGap: getButtonMetrics(screen.width, screen.height).gap,
      fontSize: screen.isPortrait() ? '12px' : '18px',
      titleY: screen.isPortrait() ? 46 : 42,
    };
  }

  static getResultSceneLayout(screen: ScreenManager): ResultSceneLayout {
    const safe = SafeArea.getInsets(screen);
    const portrait = screen.isPortrait();
    const metrics = getButtonMetrics(screen.width, screen.height);
    const buttonMode: ButtonLayoutMode = portrait ? 'vertical' : 'twoColumn';
    const buttonRows = portrait ? 5 : 3;
    const buttonAreaHeight = buttonRows * metrics.height + (buttonRows - 1) * 8;
    const buttonArea = {
      x: safe.left,
      y: screen.height - safe.bottom - buttonAreaHeight,
      width: screen.width - safe.left - safe.right,
      height: buttonAreaHeight,
    };
    const headerY = safe.top + (portrait ? 28 : 32);
    const autoRestartY = buttonArea.y - (portrait ? 22 : 18);
    const summaryTop = safe.top + (portrait ? 58 : 64);
    const leaderboardHeight = portrait ? 82 : 118;
    const leaderboardArea = {
      x: safe.left + 12,
      y: autoRestartY - leaderboardHeight - 16,
      width: screen.width - safe.left - safe.right - 24,
      height: leaderboardHeight,
    };
    const summaryArea = {
      x: safe.left + 12,
      y: summaryTop,
      width: screen.width - safe.left - safe.right - 24,
      height: Math.max(80, leaderboardArea.y - summaryTop - 12),
    };
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen,
      count: 5,
      startY: buttonArea.y + metrics.height / 2,
      buttonWidth: metrics.width,
      buttonHeight: metrics.height,
      gap: metrics.height + 8,
      mode: buttonMode,
      centerX: screen.centerX,
    });

    return {
      headerY,
      summaryArea,
      leaderboardArea,
      autoRestartY,
      buttonArea,
      buttonLayout,
      summaryMaxRows: portrait ? Math.max(5, Math.floor(summaryArea.height / 17)) : Math.max(6, Math.floor(summaryArea.height / 23)),
      leaderboardMaxRows: screen.height < 720 ? 3 : 5,
      fontSize: portrait ? '12px' : '16px',
      smallFontSize: portrait ? '10px' : '12px',
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
