import Phaser from 'phaser';

import { SettingsManager } from '../settings/SettingsManager';
import { getButtonMetrics } from '../ui/UITheme';
import { SafeArea } from './SafeArea';
import { ScreenManager } from './ScreenManager';

export type HudLayout = {
  density: 'spacious' | 'normal' | 'compact' | 'tiny';
  hudZones: {
    topCenter: RectLayout;
    topLeft: RectLayout;
    topRight: RectLayout;
    leftStack: RectLayout;
    rightStack: RectLayout;
    centerMessage: RectLayout;
    bottomLeft: RectLayout;
    bottomCenter: RectLayout;
    bottomRight: RectLayout;
  };
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
  buildIconSize: number;
  buildRowHeight: number;
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
  static getContentDensity(screen: ScreenManager): HudLayout['density'] {
    const safe = SafeArea.getInsets(screen);
    const width = screen.width - safe.left - safe.right;
    const height = screen.height - safe.top - safe.bottom;

    if (width <= 430 || height <= 390) {
      return 'tiny';
    }

    if (screen.isPortrait() || width <= 900 || height <= 560) {
      return 'compact';
    }

    if (width >= 1600 && height >= 900) {
      return 'spacious';
    }

    return 'normal';
  }

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
    const density = LayoutConfig.getContentDensity(screen);
    const padding = options.padding ?? (density === 'tiny' ? 14 : density === 'compact' ? 18 : 24);
    const widthRatio = screen.isPortrait()
      ? density === 'tiny' ? 0.9 : 0.86
      : density === 'spacious' ? 0.54 : density === 'compact' || density === 'tiny' ? 0.66 : 0.6;
    const heightRatio = screen.isPortrait()
      ? density === 'tiny' ? 0.84 : 0.78
      : density === 'tiny' ? 0.84 : density === 'compact' ? 0.72 : 0.66;
    const width = Math.min(options.maxWidth, (screen.width - safe.left - safe.right) * widthRatio);
    const height = Math.min(options.maxHeight, (screen.height - safe.top - safe.bottom) * heightRatio);
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
    const density = LayoutConfig.getContentDensity(params.screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const width = params.buttonWidth ?? (tiny ? Math.min(metrics.width, 168) : compact ? Math.min(metrics.width, 200) : metrics.width);
    const height = params.buttonHeight ?? (tiny ? Math.min(metrics.height, 32) : compact ? Math.min(metrics.height, 38) : metrics.height);
    const gap = params.gap ?? Math.max(height + (tiny ? 4 : compact ? 6 : 8), Math.min(metrics.gap, height + (tiny ? 6 : compact ? 8 : 12)));
    const mode = params.mode ?? 'vertical';
    const centerX = params.centerX ?? params.screen.centerX;
    const fontSize = tiny ? '10px' : compact ? '12px' : metrics.fontSize;
    const positions: Phaser.Math.Vector2[] = [];

    if (mode === 'vertical') {
      for (let index = 0; index < params.count; index += 1) {
        positions.push(new Phaser.Math.Vector2(centerX, params.startY + index * gap));
      }

      return { positions, width, height, gap, fontSize, mode };
    }

    const columnGap = width + (tiny ? 8 : compact ? 12 : 24);
    for (let index = 0; index < params.count; index += 1) {
      const row = Math.floor(index / 2);
      const column = index % 2;
      positions.push(new Phaser.Math.Vector2(
        centerX + (column === 0 ? -columnGap / 2 : columnGap / 2),
        params.startY + row * gap,
      ));
    }

    return { positions, width, height, gap, fontSize, mode };
  }

  static getActionGridLayout(
    screen: ScreenManager,
    count: number,
    options: {
      area?: RectLayout;
      maxColumns?: 1 | 2;
      compact?: boolean;
    } = {},
  ): ButtonLayout {
    const density = LayoutConfig.getContentDensity(screen);
    const compact = options.compact ?? (density === 'compact' || density === 'tiny');
    const metrics = getButtonMetrics(screen.width, screen.height);
    const mode: ButtonLayoutMode = options.maxColumns === 1 || (screen.isPortrait() && density === 'tiny')
      ? 'vertical'
      : 'twoColumn';
    const buttonWidth = compact ? Math.min(metrics.width, 210) : metrics.width;
    const buttonHeight = compact ? Math.min(metrics.height, 38) : metrics.height;
    const area = options.area;
    const centerX = area ? area.x + area.width / 2 : screen.centerX;
    const rowCount = mode === 'vertical' ? count : Math.ceil(count / 2);
    const rowGap = compact ? 6 : 8;
    const gridHeight = rowCount * buttonHeight + Math.max(0, rowCount - 1) * rowGap;
    const startY = area
      ? mode === 'vertical'
        ? area.y + buttonHeight / 2
        : area.y + Math.min(area.height / 2, gridHeight / 2 + (compact ? 4 : 8))
      : screen.centerY;

    return LayoutConfig.getButtonListLayout({
      screen,
      count,
      startY,
      buttonWidth,
      buttonHeight,
      gap: buttonHeight + rowGap,
      mode,
      centerX,
    });
  }

  static getCompactButtonGridLayout(
    screen: ScreenManager,
    count: number,
    options: {
      area: RectLayout;
      columns: number;
      compact?: boolean;
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      gapX?: number;
      gapY?: number;
      fontSize?: string;
    },
  ): ButtonLayout {
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = options.compact ?? (tiny || density === 'compact');
    const columns = Math.max(1, Math.min(count, Math.floor(options.columns)));
    const gapX = options.gapX ?? (tiny ? 4 : compact ? 6 : 8);
    const gapY = options.gapY ?? (tiny ? 4 : compact ? 6 : 8);
    const rows = Math.max(1, Math.ceil(count / columns));
    const height = Math.max(
      options.minHeight ?? (tiny ? 22 : 26),
      Math.min(
        options.maxHeight ?? (tiny ? 28 : compact ? 34 : 38),
        (options.area.height - gapY * (rows - 1)) / rows,
      ),
    );
    const width = Math.max(
      options.minWidth ?? 84,
      Math.min(
        options.maxWidth ?? (tiny ? 138 : compact ? 160 : 184),
        (options.area.width - gapX * (columns - 1)) / columns,
      ),
    );
    const gridWidth = columns * width + (columns - 1) * gapX;
    const gridHeight = rows * height + (rows - 1) * gapY;
    const startX = options.area.x + options.area.width / 2 - gridWidth / 2 + width / 2;
    const startY = options.area.y + Math.max(0, (options.area.height - gridHeight) / 2) + height / 2;
    const positions = Array.from({ length: count }, (_value, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;

      return new Phaser.Math.Vector2(
        startX + column * (width + gapX),
        startY + row * (height + gapY),
      );
    });

    return {
      positions,
      width,
      height,
      gap: height + gapY,
      fontSize: options.fontSize ?? (tiny ? '9px' : compact ? '10px' : '11px'),
      mode: columns === 1 ? 'vertical' : 'twoColumn',
    };
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
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const buttonMetrics = {
      width: tiny ? Math.min(metrics.width, 168) : compact ? Math.min(metrics.width, 200) : metrics.width,
      height: tiny ? Math.min(metrics.height, 32) : compact ? Math.min(metrics.height, 38) : metrics.height,
      gap: Math.max(
        tiny ? 36 : compact ? 44 : 0,
        Math.min(metrics.gap, metrics.height + (tiny ? 6 : compact ? 8 : 12)),
      ),
      fontSize: tiny ? '10px' : compact ? '12px' : metrics.fontSize,
    };
    const mode = options.mode === 'vertical' || screen.isPortrait() || options.maxColumns === 1
      ? 'vertical'
      : options.mode === 'twoColumn'
        ? 'twoColumn'
        : count > 5 ? 'twoColumn' : 'vertical';
    const centerX = options.centerX ?? screen.centerX;
    const startY = options.startY ?? screen.centerY;
    const positions: Phaser.Math.Vector2[] = [];

    if (mode === 'vertical') {
      const totalHeight = (count - 1) * buttonMetrics.gap;
      for (let index = 0; index < count; index += 1) {
        positions.push(new Phaser.Math.Vector2(
          centerX,
          startY - totalHeight / 2 + index * buttonMetrics.gap,
        ));
      }

      return { positions, mode, ...buttonMetrics };
    }

    const columnGap = buttonMetrics.width + (tiny ? 10 : compact ? 16 : 26);
    const rows = Math.ceil(count / 2);
    const totalHeight = (rows - 1) * buttonMetrics.gap;
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / 2);
      const column = index % 2;
      positions.push(new Phaser.Math.Vector2(
        centerX + (column === 0 ? -columnGap / 2 : columnGap / 2),
        startY - totalHeight / 2 + row * buttonMetrics.gap,
      ));
    }

    return { positions, mode, ...buttonMetrics };
  }

  static getHudLayout(screen: ScreenManager): HudLayout {
    const safe = SafeArea.getInsets(screen);
    const portrait = screen.isPortrait();
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const spacious = density === 'spacious';
    const margin = tiny ? 6 : compact ? 8 : 10;
    const minimapScale = SettingsManager.getDisplay().minimapScale;
    const minimapWidth = (portrait ? tiny ? 76 : 90 : compact ? 112 : spacious ? 156 : 138) * minimapScale;
    const minimapHeight = (portrait ? tiny ? 58 : 70 : compact ? 76 : spacious ? 108 : 96) * minimapScale;
    const rightStackWidth = Math.min(
      portrait ? (tiny ? screen.width * 0.38 : screen.width * 0.44) : spacious ? 224 : 196,
      tiny ? 148 : spacious ? 240 : 210,
    );
    const barWidth = rightStackWidth;
    const portraitSize = tiny ? 30 : portrait ? 36 : compact ? 34 : 40;
    const statsContentOffsetY = portraitSize + (tiny ? 2 : compact ? 4 : 6);
    const statsHeight = (tiny ? 112 : compact ? 132 : 150) + statsContentOffsetY;
    const buildIconSize = tiny ? 34 : compact ? 40 : 46;
    const buildRowHeight = buildIconSize + (tiny ? 4 : 5);
    const pauseWidth = portrait ? tiny ? 40 : 46 : compact ? 78 : 92;
    const pauseHeight = portrait ? tiny ? 40 : 46 : compact ? 34 : 40;
    const pauseRect = portrait
      ? {
        x: safe.left + margin,
        y: safe.top + margin,
        width: pauseWidth,
        height: pauseHeight,
      }
      : {
        x: screen.width - safe.right - minimapWidth - pauseWidth - (compact ? 10 : 16),
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
    const availableWidth = screen.width - safe.left - safe.right;
    const availableHeight = screen.height - safe.top - safe.bottom;
    const bottomCenter = {
      x: safe.left + availableWidth * (portrait ? 0.08 : 0.28),
      y: screen.height - safe.bottom - (tiny ? 76 : compact ? 100 : 128),
      width: availableWidth * (portrait ? 0.84 : 0.44),
      height: tiny ? 70 : compact ? 92 : 118,
    };
    const bottomRight = {
      x: screen.width - safe.right - rightStackWidth,
      y: screen.height - safe.bottom - (compact ? 150 : 180),
      width: rightStackWidth,
      height: tiny ? 112 : compact ? 142 : 170,
    };
    const rightColumnGap = portrait ? 8 : 10;
    const statsWidth = rightStackWidth;
    const statsRightX = screen.width - safe.right - statsWidth;
    const buildStartY = portrait
      ? pauseRect.y + pauseRect.height + (tiny ? 6 : 10)
      : safe.top + margin;
    const maxBuildHeight = Math.max(
      34,
      virtualJoystickRect.y - buildStartY - 10,
    );
    let maxIconRows = Math.max(
      1,
      Math.min(portrait ? tiny ? 4 : 5 : compact ? 4 : 6, Math.floor(maxBuildHeight / buildRowHeight)),
    );
    const defaultBuildX = safe.left + margin;
    const minBuildListWidth = tiny ? 104 : compact ? 128 : 148;
    const portraitBuildWidthLimit = Math.max(
      minBuildListWidth,
      statsRightX - defaultBuildX - rightColumnGap,
    );
    let buildListWidth = portrait
      ? Math.min(availableWidth - margin * 2, tiny ? 210 : 258, portraitBuildWidthLimit)
      : compact ? 236 : 268;
    const shiftedBuildX = virtualJoystickRect.x + virtualJoystickRect.width + 16;
    const buildX = !portrait && buildStartY + maxIconRows * buildRowHeight > virtualJoystickRect.y
      ? Math.min(
        shiftedBuildX,
        screen.width - safe.right - buildListWidth,
      )
      : defaultBuildX;
    let buildListRect = {
      x: buildX,
      y: buildStartY,
      width: buildListWidth,
      height: maxIconRows * buildRowHeight,
    };
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
        y: Math.max(statsPreferredY, screen.centerY - statsHeight / 2),
      },
      {
        x: Math.max(safe.left + margin, minimapRect.x - statsWidth - rightColumnGap),
        y: statsPreferredY,
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
      [
        pauseRect,
        ...(minimapScale > 0 ? [minimapRect] : []),
        virtualJoystickRect,
        buildListRect,
      ],
      statsCandidates.slice(1),
    );
    if (LayoutConfig.intersects(buildListRect, statsRect)) {
      const widthBeforeStats = statsRect.x - buildListRect.x - rightColumnGap;
      if (widthBeforeStats >= minBuildListWidth) {
        buildListWidth = Math.min(buildListRect.width, widthBeforeStats);
        buildListRect = {
          ...buildListRect,
          width: buildListWidth,
        };
      } else {
        maxIconRows = Math.max(1, maxIconRows - 1);
        buildListRect = {
          ...buildListRect,
          height: maxIconRows * buildRowHeight,
        };
      }
    }
    const rightStack = {
      x: statsRect.x,
      y: statsRect.y,
      width: statsRect.width,
      height: Math.max(statsRect.height, screen.height - safe.bottom - statsRect.y),
    };
    const topLeft = {
      x: safe.left + margin,
      y: safe.top + margin,
      width: pauseRect.width,
      height: pauseRect.height,
    };
    const topRight = minimapRect;
    const topCenterLeftLimit = portrait
      ? pauseRect.x + pauseRect.width + 12
      : buildListRect.x + buildListRect.width + 12;
    const topCenterRightLimit = Math.min(
      minimapScale > 0
        ? minimapRect.x - 12
        : screen.width - safe.right - margin,
      !portrait && pauseRect.x > topCenterLeftLimit
        ? pauseRect.x - 12
        : screen.width - safe.right - margin,
    );
    const topCenterMaxWidth = Math.max(tiny ? 120 : 160, topCenterRightLimit - topCenterLeftLimit);
    const topCenterWidth = Math.min(tiny ? 230 : compact ? 300 : spacious ? 480 : 380, topCenterMaxWidth);
    const topCenterCandidate = {
      x: Phaser.Math.Clamp(
        screen.centerX - topCenterWidth / 2,
        topCenterLeftLimit,
        Math.max(topCenterLeftLimit, topCenterRightLimit - topCenterWidth),
      ),
      y: safe.top + margin,
      width: topCenterWidth,
      height: tiny ? 58 : compact ? 72 : 92,
    };
    const topCenterFallback = {
      x: safe.left + margin,
      y: Math.max(pauseRect.y + pauseRect.height, minimapRect.y + minimapRect.height) + 8,
      width: screen.width - safe.left - safe.right - margin * 2,
      height: tiny ? 56 : compact ? 70 : 88,
    };
    const topCenterLowFallback = {
      x: safe.left + margin,
      y: Math.max(
        pauseRect.y + pauseRect.height,
        minimapRect.y + minimapRect.height,
        statsRect.y + statsRect.height,
        buildListRect.y + buildListRect.height,
      ) + 8,
      width: screen.width - safe.left - safe.right - margin * 2,
      height: tiny ? 56 : compact ? 70 : 88,
    };
    const topCenter = LayoutConfig.moveToAvoidOverlap(
      topCenterCandidate,
      [pauseRect, minimapRect, statsRect, buildListRect],
      [
        topCenterFallback,
        topCenterLowFallback,
      ].map((rect) => LayoutConfig.clampRectToSafeArea(rect, safe, screen)),
    );
    const passivesY = buildListRect.y + buildListRect.height + 8;
    const passiveBottomLimit = portrait
      ? virtualJoystickRect.y
      : screen.height - safe.bottom;
    const maxPassiveRows = portrait
      ? Math.max(0, Math.min(tiny ? 1 : 2, Math.floor((passiveBottomLimit - passivesY - 10) / buildRowHeight)))
      : Math.max(0, Math.min(compact ? 2 : 4, Math.floor((screen.height - safe.bottom - passivesY) / buildRowHeight)));
    const portraitBossTopGapWidth = Math.max(
      140,
      minimapRect.x - (pauseRect.x + pauseRect.width) - 24,
    );
    const bossTextSize = {
      width: Math.min(screen.width - safe.left - safe.right - 24, portrait ? portraitBossTopGapWidth : 460),
      height: tiny ? 34 : portrait ? 42 : 52,
    };
    const bossBarsReservedBottom = topCenter.y + topCenter.height + (compact ? 6 : 10);
    const bossTextCandidates = [
      {
        x: screen.centerX - bossTextSize.width / 2,
        y: bossBarsReservedBottom,
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
      [statsRect, minimapRect, pauseRect, buildListRect, topCenter],
      bossTextCandidates.slice(1),
    );
    const hudZones = {
      topCenter,
      topLeft,
      topRight,
      leftStack: buildListRect,
      rightStack,
      centerMessage: bossTextRect,
      bottomLeft: virtualJoystickRect,
      bottomCenter,
      bottomRight,
    };

    return {
      density,
      hudZones,
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
      buildIconSize,
      buildRowHeight,
      maxIconRows,
      maxPassiveRows,
      fontSize: tiny ? '10px' : compact ? '12px' : spacious ? '15px' : '14px',
    };
  }

  static getLevelUpPanelLayout(screen: ScreenManager): LevelUpPanelLayout {
    const portrait = screen.isPortrait();
    const safe = SafeArea.getInsets(screen);
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const availableWidth = screen.width - safe.left - safe.right;
    const availableHeight = screen.height - safe.top - safe.bottom;

    if (portrait) {
      const cardWidth = Math.min(availableWidth - 28, tiny ? 264 : 300);
      const cardHeight = Math.max(tiny ? 92 : 104, Math.min(tiny ? 116 : 134, (availableHeight - 126) / 3));

      return {
        panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
        cardWidth,
        cardHeight,
        cardGap: tiny ? 6 : 8,
        layoutMode: 'vertical',
        panelWidth: Math.min(availableWidth * 0.86, cardWidth + 24),
        panelHeight: Math.min(availableHeight * 0.7, cardHeight * 3 + (tiny ? 68 : 78)),
        fontSize: tiny ? '12px' : '14px',
        descriptionFontSize: tiny ? '10px' : '11px',
      };
    }

    const panelWidthBudget = availableWidth * (compact ? 0.68 : 0.58);
    const horizontalPanelInset = compact ? 36 : 46;
    const cardGap = compact ? 8 : 10;
    const cardWidth = Math.min(
      compact ? 178 : 208,
      (panelWidthBudget - horizontalPanelInset) / 3,
    );

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      cardWidth,
      cardHeight: Math.min(compact ? 156 : 174, availableHeight - (compact ? 112 : 132)),
      cardGap,
      layoutMode: 'horizontal',
      panelWidth: Math.min(panelWidthBudget, cardWidth * 3 + horizontalPanelInset),
      panelHeight: Math.min(availableHeight * 0.54, compact ? 228 : 252),
      fontSize: compact ? '13px' : '15px',
      descriptionFontSize: compact ? '10px' : '11px',
    };
  }

  static getPauseMenuLayout(screen: ScreenManager): MenuLayout {
    const portrait = screen.isPortrait();
    const safe = SafeArea.getInsets(screen);
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || density === 'tiny';
    const panelWidth = Math.min(
      screen.width - safe.left - safe.right,
      portrait ? tiny ? 282 : compact ? 300 : 318 : compact ? 390 : 440,
    );
    const panelHeight = Math.min(
      screen.height - safe.top - safe.bottom,
      portrait ? tiny ? 382 : compact ? 406 : 438 : compact ? 260 : 292,
    );

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      panelWidth,
      panelHeight,
      buttonStartY: screen.centerY - panelHeight / 2 + (compact ? 66 : 76),
      buttonGap: Math.min(getButtonMetrics(screen.width, screen.height).gap, compact ? 38 : 46),
      fontSize: getButtonMetrics(screen.width, screen.height).fontSize,
    };
  }

  static getTitleLayout(screen: ScreenManager): TitleLayout {
    const portrait = screen.isPortrait();
    const safe = SafeArea.getInsets(screen);
    const density = LayoutConfig.getContentDensity(screen);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const metrics = getButtonMetrics(screen.width, screen.height);
    const titleY = safe.top + (tiny ? 24 : portrait ? 30 : compact ? 26 : 30);
    const statusY = titleY + (tiny ? 44 : portrait ? 50 : compact ? 38 : 44);
    const countdownY = statusY + (tiny ? 54 : portrait ? 62 : compact ? 42 : 48);
    const buttonStartY = countdownY + metrics.height / 2 + (tiny ? 18 : portrait ? 22 : 14);

    return {
      titlePosition: new Phaser.Math.Vector2(screen.centerX, titleY),
      statusPosition: new Phaser.Math.Vector2(screen.centerX, statusY),
      countdownPosition: new Phaser.Math.Vector2(screen.centerX, countdownY),
      buttonStartY,
      buttonGap: Math.min(metrics.gap, metrics.height + (tiny ? 4 : portrait ? 8 : 6)),
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
    const density = LayoutConfig.getContentDensity(screen);
    const compact = density === 'compact' || density === 'tiny';
    const tinyLandscape = density === 'tiny' && !portrait;
    const metrics = getButtonMetrics(screen.width, screen.height);
    const availableWidth = screen.width - safe.left - safe.right;
    const buttonGap = tinyLandscape ? 3 : density === 'tiny' ? 4 : compact ? 5 : 6;
    const primaryButtonHeight = tinyLandscape ? 30 : density === 'tiny' ? 32 : compact ? 36 : 42;
    const secondaryButtonHeight = tinyLandscape ? 24 : density === 'tiny' ? 28 : compact ? 32 : 36;
    const secondaryColumns = portrait ? 2 : 3;
    const secondaryRows = Math.ceil(6 / secondaryColumns);
    const buttonAreaHeight = primaryButtonHeight
      + buttonGap
      + secondaryRows * secondaryButtonHeight
      + Math.max(0, secondaryRows - 1) * buttonGap;
    const buttonArea = {
      x: safe.left,
      y: screen.height - safe.bottom - buttonAreaHeight,
      width: availableWidth,
      height: buttonAreaHeight,
    };
    const headerY = safe.top + (compact ? 22 : 28);
    const autoRestartY = buttonArea.y - (compact ? 14 : 18);
    const summaryTop = safe.top + (portrait ? 54 : 58);
    const contentWidth = Math.min(
      availableWidth - 24,
      portrait ? compact ? 400 : 460 : compact ? 600 : 700,
    );
    const contentX = screen.centerX - contentWidth / 2;
    const leaderboardHeight = portrait ? compact ? 52 : 66 : compact ? 66 : 86;
    const leaderboardArea = {
      x: contentX,
      y: autoRestartY - leaderboardHeight - (compact ? 10 : 12),
      width: contentWidth,
      height: leaderboardHeight,
    };
    const summaryArea = {
      x: contentX,
      y: summaryTop,
      width: contentWidth,
      height: Math.max(76, leaderboardArea.y - summaryTop - (compact ? 8 : 10)),
    };
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen,
      count: 7,
      startY: buttonArea.y + primaryButtonHeight / 2,
      buttonWidth: Math.min(metrics.width, density === 'tiny' ? 168 : compact ? 190 : 214),
      buttonHeight: primaryButtonHeight,
      gap: primaryButtonHeight + buttonGap,
      mode: 'twoColumn',
      centerX: screen.centerX,
    });

    return {
      headerY,
      summaryArea,
      leaderboardArea,
      autoRestartY,
      buttonArea,
      buttonLayout,
      summaryMaxRows: portrait ? Math.max(5, Math.floor(summaryArea.height / (compact ? 15 : 17))) : Math.max(6, Math.floor(summaryArea.height / (compact ? 18 : 21))),
      leaderboardMaxRows: screen.height < 720 ? 3 : 5,
      fontSize: density === 'tiny' ? '11px' : portrait || compact ? '12px' : '16px',
      smallFontSize: density === 'tiny' ? '9px' : portrait || compact ? '10px' : '12px',
    };
  }

  static getHelpLayout(screen: ScreenManager): HelpLayout {
    const safe = SafeArea.getInsets(screen);
    const density = LayoutConfig.getContentDensity(screen);
    const compact = density === 'compact' || density === 'tiny';
    const availableWidth = screen.width - safe.left - safe.right;
    const availableHeight = screen.height - safe.top - safe.bottom;
    const panelWidth = Math.min(
      availableWidth * (screen.isPortrait() ? 0.86 : compact ? 0.66 : 0.58),
      screen.isPortrait() ? 324 : density === 'spacious' ? 700 : 600,
    );
    const panelHeight = Math.min(
      availableHeight * (screen.isPortrait() ? 0.74 : compact ? 0.68 : 0.62),
      screen.isPortrait() ? 500 : compact ? 360 : 410,
    );

    return {
      panelCenter: new Phaser.Math.Vector2(screen.centerX, screen.centerY),
      panelWidth,
      panelHeight,
      bodyWidth: panelWidth - (density === 'tiny' ? 42 : compact ? 52 : 60),
      fontSize: density === 'tiny' ? '10px' : screen.isPortrait() || compact ? '12px' : '14px',
    };
  }
}
