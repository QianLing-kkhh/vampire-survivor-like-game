import Phaser from 'phaser';

import { SettingsManager } from '../settings/SettingsManager';
import { getButtonMetrics } from '../ui/UITheme';
import { SafeArea } from './SafeArea';
import { ScreenManager } from './ScreenManager';

export type HudLayout = {
  statsPosition: Phaser.Math.Vector2;
  characterPortraitPosition: Phaser.Math.Vector2;
  characterPortraitSize: number;
  statsContentOffsetY: number;
  weaponsPosition: Phaser.Math.Vector2;
  passivesPosition: Phaser.Math.Vector2;
  minimapPosition: Phaser.Math.Vector2;
  minimapSize: { width: number; height: number };
  pauseButtonPosition: Phaser.Math.Vector2;
  pauseButtonRect: RectLayout;
  statsRect: RectLayout;
  minimapRect: RectLayout;
  buildListRect: RectLayout;
  virtualJoystickRect: RectLayout;
  bossTextPosition: Phaser.Math.Vector2;
  barWidth: number;
  maxIconRows: number;
  maxPassiveRows: number;
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
  static intersects(a: RectLayout, b: RectLayout): boolean {
    return a.x < b.x + b.width
      && a.x + a.width > b.x
      && a.y < b.y + b.height
      && a.y + a.height > b.y;
  }

  static clampRectToSafeArea(
    rect: RectLayout,
    safe: { top: number; right: number; bottom: number; left: number },
    screen: ScreenManager,
  ): RectLayout {
    return {
      ...rect,
      x: Phaser.Math.Clamp(rect.x, safe.left, screen.width - safe.right - rect.width),
      y: Phaser.Math.Clamp(rect.y, safe.top, screen.height - safe.bottom - rect.height),
    };
  }

  static moveToAvoidOverlap(
    target: RectLayout,
    blockers: RectLayout[],
    candidates: RectLayout[],
  ): RectLayout {
    if (!blockers.some((blocker) => LayoutConfig.intersects(target, blocker))) {
      return target;
    }

    return candidates.find((candidate) => (
      !blockers.some((blocker) => LayoutConfig.intersects(candidate, blocker))
    )) ?? target;
  }

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
    const margin = portrait ? 8 : 10;
    const compactHeight = screen.height <= 430;
    const minimapScale = SettingsManager.getDisplay().minimapScale;
    const minimapWidth = (portrait ? 96 : 150) * minimapScale;
    const minimapHeight = (portrait ? 76 : 104) * minimapScale;
    const barWidth = Math.min(portrait ? screen.width * 0.54 : 230, 250);
    const portraitSize = portrait ? 48 : compactHeight ? 44 : 56;
    const statsContentOffsetY = portraitSize + (compactHeight ? 8 : 12);
    const statsHeight = (portrait ? 236 : compactHeight ? 214 : 224) + statsContentOffsetY;
    const buildRowHeight = 64;
    const pauseWidth = portrait ? 48 : 92;
    const pauseHeight = portrait ? 48 : 40;
    const pauseRect = portrait
      ? {
        x: safe.left + margin,
        y: safe.top + margin,
        width: pauseWidth,
        height: pauseHeight,
      }
      : {
        x: screen.width - safe.right - minimapWidth - pauseWidth - 16,
        y: safe.top + margin,
        width: pauseWidth,
        height: pauseHeight,
      };
    const minimapTopRight = {
      x: screen.width - safe.right - minimapWidth,
      y: safe.top + margin,
      width: minimapWidth,
      height: minimapHeight,
    };
    const minimapBottomRight = {
      x: screen.width - safe.right - minimapWidth,
      y: screen.height - safe.bottom - minimapHeight,
      width: minimapWidth,
      height: minimapHeight,
    };
    const minimapRect = LayoutConfig.moveToAvoidOverlap(
      minimapTopRight,
      [pauseRect],
      [
        minimapBottomRight,
        {
          x: pauseRect.x - minimapWidth - 12,
          y: pauseRect.y,
          width: minimapWidth,
          height: minimapHeight,
        },
      ],
    );
    const virtualJoystickRect = portrait
      ? {
        x: safe.left,
        y: screen.height - safe.bottom - 220,
        width: 220,
        height: 220,
      }
      : {
        x: safe.left,
        y: screen.height - safe.bottom - 180,
        width: 190,
        height: 180,
      };
    const buildStartY = portrait
      ? pauseRect.y + pauseRect.height + 10
      : safe.top + margin;
    const maxBuildHeight = Math.max(
      34,
      virtualJoystickRect.y - buildStartY - 10,
    );
    const maxIconRows = Math.max(
      1,
      Math.min(portrait ? 3 : 6, Math.floor(maxBuildHeight / buildRowHeight)),
    );
    const buildListWidth = portrait
      ? Math.min(screen.width - safe.left - safe.right - margin * 2, 330)
      : 330;
    const defaultBuildX = safe.left + margin;
    const shiftedBuildX = virtualJoystickRect.x + virtualJoystickRect.width + 16;
    const buildX = !portrait && buildStartY + maxIconRows * buildRowHeight > virtualJoystickRect.y
      ? Math.min(
        shiftedBuildX,
        screen.width - safe.right - buildListWidth,
      )
      : defaultBuildX;
    const buildListRect = {
      x: buildX,
      y: buildStartY,
      width: buildListWidth,
      height: maxIconRows * buildRowHeight,
    };
    const rightColumnGap = portrait ? 8 : 10;
    const statsWidth = barWidth;
    const statsRightX = screen.width - safe.right - statsWidth;
    const statsPreferredY = minimapScale > 0
      ? minimapRect.y + minimapRect.height + rightColumnGap
      : pauseRect.y + pauseRect.height + rightColumnGap;
    const statsPreferredRect = {
      x: statsRightX,
      y: statsPreferredY,
      width: statsWidth,
      height: statsHeight,
    };
    const statsCandidates = [
      statsPreferredRect,
      {
        ...statsPreferredRect,
        y: Math.max(statsPreferredY, buildListRect.y + buildListRect.height + rightColumnGap),
      },
      {
        ...statsPreferredRect,
        y: Math.max(statsPreferredY, screen.centerY - statsHeight / 2),
      },
      {
        x: Math.max(safe.left + margin, minimapRect.x - statsWidth - rightColumnGap),
        y: Math.max(safe.top + margin, buildListRect.y + buildListRect.height + rightColumnGap),
        width: statsWidth,
        height: statsHeight,
      },
      {
        x: safe.left + margin,
        y: buildListRect.y + buildListRect.height + rightColumnGap,
        width: statsWidth,
        height: statsHeight,
      },
    ].map((rect) => LayoutConfig.clampRectToSafeArea(rect, safe, screen));
    const statsRect = LayoutConfig.moveToAvoidOverlap(
      statsCandidates[0],
      [pauseRect, minimapRect, buildListRect, virtualJoystickRect],
      statsCandidates.slice(1),
    );
    const passivesY = buildListRect.y + buildListRect.height + 8;
    const passiveBottomLimit = portrait
      ? Math.min(virtualJoystickRect.y, statsRect.y - 8)
      : screen.height - safe.bottom;
    const maxPassiveRows = portrait
      ? Math.max(0, Math.min(2, Math.floor((passiveBottomLimit - passivesY - 10) / buildRowHeight)))
      : Math.max(0, Math.min(4, Math.floor((screen.height - safe.bottom - passivesY) / buildRowHeight)));
    const portraitBossTopGapWidth = Math.max(
      140,
      minimapRect.x - (pauseRect.x + pauseRect.width) - 24,
    );
    const bossTextSize = {
      width: Math.min(screen.width - safe.left - safe.right - 24, portrait ? portraitBossTopGapWidth : 460),
      height: portrait ? 42 : 52,
    };
    const bossTextCandidates = [
      ...(portrait ? [{
        x: pauseRect.x + pauseRect.width + 12,
        y: safe.top + 8,
        width: bossTextSize.width,
        height: bossTextSize.height,
      }] : []),
      {
        x: screen.centerX - bossTextSize.width / 2,
        y: safe.top + (portrait ? 86 : 78),
        width: bossTextSize.width,
        height: bossTextSize.height,
      },
      {
        x: Math.max(safe.left + margin, statsRect.x + statsRect.width + 18),
        y: safe.top + (portrait ? 112 : 86),
        width: bossTextSize.width,
        height: bossTextSize.height,
      },
      {
        x: screen.width - safe.right - bossTextSize.width,
        y: minimapRect.y + minimapRect.height + 12,
        width: bossTextSize.width,
        height: bossTextSize.height,
      },
      {
        x: screen.centerX - bossTextSize.width / 2,
        y: statsRect.y + statsRect.height + 8,
        width: bossTextSize.width,
        height: bossTextSize.height,
      },
      {
        x: screen.centerX - bossTextSize.width / 2,
        y: screen.centerY - bossTextSize.height / 2,
        width: bossTextSize.width,
        height: bossTextSize.height,
      },
    ].map((rect) => LayoutConfig.clampRectToSafeArea(rect, safe, screen));
    const bossTextRect = LayoutConfig.moveToAvoidOverlap(
      bossTextCandidates[0],
      [statsRect, minimapRect, pauseRect, buildListRect],
      bossTextCandidates.slice(1),
    );

    return {
      statsPosition: new Phaser.Math.Vector2(statsRect.x, statsRect.y),
      characterPortraitPosition: new Phaser.Math.Vector2(
        statsRect.x + portraitSize / 2,
        statsRect.y + portraitSize / 2,
      ),
      characterPortraitSize: portraitSize,
      statsContentOffsetY,
      weaponsPosition: new Phaser.Math.Vector2(buildListRect.x, buildListRect.y),
      passivesPosition: new Phaser.Math.Vector2(
        buildListRect.x,
        passivesY,
      ),
      minimapPosition: new Phaser.Math.Vector2(minimapRect.x, minimapRect.y),
      minimapSize: { width: minimapWidth, height: minimapHeight },
      pauseButtonPosition: new Phaser.Math.Vector2(
        pauseRect.x + pauseRect.width / 2,
        pauseRect.y + pauseRect.height / 2,
      ),
      pauseButtonRect: pauseRect,
      statsRect,
      minimapRect,
      buildListRect,
      virtualJoystickRect,
      bossTextPosition: new Phaser.Math.Vector2(
        bossTextRect.x + bossTextRect.width / 2,
        bossTextRect.y + bossTextRect.height / 2,
      ),
      barWidth,
      maxIconRows,
      maxPassiveRows,
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
    const safe = SafeArea.getInsets(screen);
    const metrics = getButtonMetrics(screen.width, screen.height);
    const titleY = safe.top + (portrait ? 34 : 30);
    const statusY = titleY + (portrait ? 54 : 44);
    const countdownY = statusY + (portrait ? 70 : 50);
    const buttonStartY = countdownY + metrics.height / 2 + (portrait ? 30 : 16);

    return {
      titlePosition: new Phaser.Math.Vector2(screen.centerX, titleY),
      statusPosition: new Phaser.Math.Vector2(screen.centerX, statusY),
      countdownPosition: new Phaser.Math.Vector2(screen.centerX, countdownY),
      buttonStartY,
      buttonGap: Math.min(metrics.gap, metrics.height + (portrait ? 10 : 6)),
      buttonColumns: 1,
      fontSize: metrics.fontSize,
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
    const resultButtonCount = 7;
    const buttonMode: ButtonLayoutMode = portrait ? 'vertical' : 'twoColumn';
    const buttonRows = portrait ? resultButtonCount : Math.ceil(resultButtonCount / 2);
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
      count: resultButtonCount,
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
