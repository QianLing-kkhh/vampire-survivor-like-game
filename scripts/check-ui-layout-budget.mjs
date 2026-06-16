const cases = [
  { name: 'desktop landscape', width: 1280, height: 720 },
  { name: 'wide desktop', width: 1920, height: 1080 },
  { name: 'mobile portrait', width: 390, height: 844 },
  { name: 'large portrait', width: 430, height: 932 },
  { name: 'narrow landscape', width: 844, height: 390 },
];

function densityFor(screen) {
  if (screen.width <= 430 || screen.height <= 390) {
    return 'tiny';
  }
  if (screen.height > screen.width || screen.width <= 900 || screen.height <= 560) {
    return 'compact';
  }
  if (screen.width >= 1600 && screen.height >= 900) {
    return 'spacious';
  }
  return 'normal';
}

function portrait(screen) {
  return screen.height > screen.width;
}

function area(rect) {
  return rect.width * rect.height;
}

function intersects(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function screenArea(screen) {
  return screen.width * screen.height;
}

function genericPanel(screen, maxWidth, maxHeight) {
  const density = densityFor(screen);
  const widthRatio = portrait(screen)
    ? density === 'tiny' ? 0.9 : 0.86
    : density === 'spacious' ? 0.54 : density === 'compact' || density === 'tiny' ? 0.66 : 0.6;
  const heightRatio = portrait(screen)
    ? density === 'tiny' ? 0.84 : 0.78
    : density === 'tiny' ? 0.84 : density === 'compact' ? 0.72 : 0.66;

  return {
    width: Math.min(maxWidth, screen.width * widthRatio),
    height: Math.min(maxHeight, screen.height * heightRatio),
  };
}

function panelLayout(screen, options) {
  const density = densityFor(screen);
  const padding = options.padding ?? (density === 'tiny' ? 14 : density === 'compact' ? 18 : 24);
  const widthRatio = portrait(screen)
    ? density === 'tiny' ? 0.9 : 0.86
    : density === 'spacious' ? 0.54 : density === 'compact' || density === 'tiny' ? 0.66 : 0.6;
  const heightRatio = portrait(screen)
    ? density === 'tiny' ? 0.84 : 0.78
    : density === 'tiny' ? 0.84 : density === 'compact' ? 0.72 : 0.66;
  const width = Math.min(options.maxWidth, screen.width * widthRatio);
  const height = Math.min(options.maxHeight, screen.height * heightRatio);
  const x = screen.width / 2 - width / 2;
  const y = screen.height / 2 - height / 2;

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

function compactButtonGrid(screen, count, area, options) {
  const density = densityFor(screen);
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
      (area.height - gapY * (rows - 1)) / rows,
    ),
  );
  const width = Math.max(
    options.minWidth ?? 84,
    Math.min(
      options.maxWidth ?? (tiny ? 138 : compact ? 160 : 184),
      (area.width - gapX * (columns - 1)) / columns,
    ),
  );
  const gridWidth = columns * width + (columns - 1) * gapX;
  const gridHeight = rows * height + (rows - 1) * gapY;
  const startX = area.x + area.width / 2 - gridWidth / 2 + width / 2;
  const startY = area.y + Math.max(0, (area.height - gridHeight) / 2) + height / 2;
  const positions = Array.from({ length: count }, (_value, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;

    return {
      x: startX + column * (width + gapX),
      y: startY + row * (height + gapY),
    };
  });

  return { positions, width, height, gridWidth, gridHeight };
}

function titleLayout(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const titleY = tiny ? 24 : portrait(screen) ? 30 : compact ? 26 : 30;
  const statusY = titleY + (tiny ? 44 : portrait(screen) ? 50 : compact ? 38 : 44);
  const countdownY = statusY + (tiny ? 54 : portrait(screen) ? 62 : compact ? 42 : 48);
  const primaryWidth = Math.min(screen.width - (tiny ? 24 : 36), tiny ? 220 : compact ? 260 : 300);
  const primaryHeight = tiny ? 34 : compact ? 38 : 44;
  const buttonStartY = countdownY + primaryHeight / 2 + (tiny ? 18 : portrait(screen) ? 22 : 14);
  const buttonRects = [];

  const primary = compactButtonGrid(
    screen,
    1,
    {
      x: screen.width / 2 - primaryWidth / 2,
      y: buttonStartY - primaryHeight / 2,
      width: primaryWidth,
      height: primaryHeight,
    },
    {
      columns: 1,
      compact,
      minWidth: primaryWidth,
      maxWidth: primaryWidth,
      minHeight: primaryHeight,
      maxHeight: primaryHeight,
    },
  );
  buttonRects.push({
    x: primary.positions[0].x - primary.width / 2,
    y: primary.positions[0].y - primary.height / 2,
    width: primary.width,
    height: primary.height,
  });

  const secondaryTop = buttonStartY + primaryHeight / 2 + (tiny ? 8 : 10);
  const secondary = compactButtonGrid(
    screen,
    5,
    {
      x: tiny ? 10 : 14,
      y: secondaryTop,
      width: screen.width - (tiny ? 20 : 28),
      height: Math.max(
        1,
        Math.min(
          screen.height - secondaryTop - (tiny ? 10 : 16),
          Math.ceil(5 / (portrait(screen) ? 2 : 3)) * (tiny ? 30 : compact ? 34 : 38)
            + (Math.ceil(5 / (portrait(screen) ? 2 : 3)) - 1) * (tiny ? 4 : compact ? 6 : 8)
            + (tiny ? 4 : 6),
        ),
      ),
    },
    {
      columns: portrait(screen) ? 2 : 3,
      compact,
      minWidth: tiny ? 86 : 104,
      maxWidth: tiny ? 126 : compact ? 152 : 172,
      minHeight: tiny ? 26 : 30,
      maxHeight: tiny ? 30 : compact ? 34 : 38,
    },
  );
  secondary.positions.forEach((position) => {
    buttonRects.push({
      x: position.x - secondary.width / 2,
      y: position.y - secondary.height / 2,
      width: secondary.width,
      height: secondary.height,
    });
  });

  const buttonLeft = Math.min(...buttonRects.map((rect) => rect.x));
  const buttonRight = Math.max(...buttonRects.map((rect) => rect.x + rect.width));
  const buttonBottom = Math.max(...buttonRects.map((rect) => rect.y + rect.height));
  const top = statusY - (compact ? 28 : 34);
  const bottom = buttonBottom + (compact ? 10 : 14);
  const frameWidth = Math.min(
    screen.width - 24,
    Math.max(buttonRight - buttonLeft + (compact ? 34 : 44), portrait(screen) ? 286 : 460),
  );
  const frameHeight = Math.max(compact ? 142 : 164, bottom - top);

  return {
    titleY,
    statusY,
    countdownY,
    frame: {
      x: screen.width / 2 - frameWidth / 2,
      y: top,
      width: frameWidth,
      height: frameHeight,
    },
    buttonRects,
  };
}

function pauseMenu(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || density === 'tiny';
  return {
    width: Math.min(screen.width, portrait(screen) ? tiny ? 282 : compact ? 300 : 318 : compact ? 390 : 440),
    height: Math.min(screen.height, portrait(screen) ? tiny ? 382 : compact ? 406 : 438 : compact ? 260 : 292),
  };
}

function settingsMenu(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const panel = panelLayout(screen, {
    maxWidth: isPortrait ? (tiny ? 300 : 330) : tiny ? 480 : compact ? 520 : 560,
    maxHeight: isPortrait ? (tiny ? 520 : 570) : compact ? 430 : 460,
    padding: tiny ? 14 : compact ? 16 : 20,
  });
  const tabWidth = tiny ? 70 : compact ? 78 : 92;
  const tabHeight = tiny ? 24 : compact ? 26 : 30;
  const tabGap = tiny ? 4 : compact ? 5 : 6;
  const tabTop = panel.content.y + (tiny ? 36 : compact ? 40 : 46);
  const tabColumns = Math.max(1, Math.floor((panel.content.width + tabGap) / (tabWidth + tabGap)));
  const tabRows = Math.ceil(4 / tabColumns);
  const tabAreaHeight = tabRows * tabHeight + Math.max(0, tabRows - 1) * tabGap;
  const closeY = panel.y + panel.height - (tiny ? 20 : compact ? 22 : 26);
  const contentTop = tabTop + tabAreaHeight + (tiny ? 6 : compact ? 8 : 12);
  const contentBottom = closeY - (tiny ? 44 : compact ? 48 : 56);
  const rowGap = tiny ? 4 : compact ? 5 : 6;
  const rowHeight = tiny ? 38 : compact ? 40 : 38;
  const rowsPerPage = Math.max(1, Math.floor((contentBottom - contentTop + rowGap) / (rowHeight + rowGap)));

  return {
    ...panel,
    rowsPerPage,
    contentRowsHeight: contentBottom - contentTop,
    tabRows,
  };
}

function developerMenu(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const panel = panelLayout(screen, {
    maxWidth: isPortrait
      ? tiny ? 300 : 340
      : tiny ? 460 : compact ? 560 : 640,
    maxHeight: isPortrait
      ? tiny ? 500 : compact ? 540 : 580
      : tiny ? 340 : compact ? 390 : 440,
    padding: tiny ? 14 : compact ? 18 : 22,
  });
  const buttonHeight = tiny ? 30 : compact ? 34 : 38;
  const tabY = screen.height / 2 - panel.height / 2 + (tiny ? 58 : compact ? 68 : 74);
  const rowStartY = tabY + (tiny ? 38 : compact ? 44 : 50);
  const closeY = screen.height / 2 + panel.height / 2 - (tiny ? 24 : compact ? 28 : 32);
  const pagerY = closeY - (tiny || compact ? 36 : 40);
  const rowAreaBottom = pagerY - (tiny ? 18 : compact ? 20 : 24);
  const rowGap = tiny ? 4 : compact ? 5 : 6;
  const columns = isPortrait ? 1 : 2;
  const availableRows = Math.max(1, Math.floor((rowAreaBottom - rowStartY + rowGap) / (buttonHeight + rowGap)));
  const rowsPerPage = Math.max(1, availableRows * columns);

  return {
    ...panel,
    rowsPerPage,
    contentRowsHeight: rowAreaBottom - rowStartY,
    columns,
  };
}

function helpPanel(screen) {
  const density = densityFor(screen);
  const compact = density === 'compact' || density === 'tiny';
  return {
    width: Math.min(
      screen.width * (portrait(screen) ? 0.86 : compact ? 0.66 : 0.58),
      portrait(screen) ? 324 : density === 'spacious' ? 700 : 600,
    ),
    height: Math.min(
      screen.height * (portrait(screen) ? 0.74 : compact ? 0.68 : 0.62),
      portrait(screen) ? 500 : compact ? 360 : 410,
    ),
  };
}

function levelUp(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;

  if (portrait(screen)) {
    const cardWidth = Math.min(screen.width - 28, tiny ? 264 : 300);
    const cardHeight = Math.max(tiny ? 92 : 104, Math.min(tiny ? 116 : 134, (screen.height - 126) / 3));
    const panelWidth = Math.min(screen.width * 0.86, cardWidth + 24);
    const panelHeight = Math.min(screen.height * 0.7, cardHeight * 3 + (tiny ? 68 : 78));

    return {
      mode: 'vertical',
      cardWidth,
      cardHeight,
      panelWidth,
      panelHeight,
      cardCountHeight: cardHeight * 3 + (tiny ? 12 : 16),
    };
  }

  const panelWidthBudget = screen.width * (compact ? 0.68 : 0.58);
  const horizontalPanelInset = compact ? 36 : 46;
  const cardGap = compact ? 8 : 10;
  const cardWidth = Math.min(compact ? 178 : 208, (panelWidthBudget - horizontalPanelInset) / 3);
  const panelWidth = Math.min(panelWidthBudget, cardWidth * 3 + horizontalPanelInset);
  const panelHeight = Math.min(screen.height * 0.54, compact ? 228 : 252);

  return {
    mode: 'horizontal',
    cardWidth,
    cardHeight: Math.min(compact ? 156 : 174, screen.height - (compact ? 112 : 132)),
    panelWidth,
    panelHeight,
    cardCountWidth: cardWidth * 3 + cardGap * 2,
  };
}

function resultLayout(screen) {
  const density = densityFor(screen);
  const compact = density === 'compact' || density === 'tiny';
  const tinyLandscape = density === 'tiny' && !portrait(screen);
  const buttonGap = tinyLandscape ? 3 : density === 'tiny' ? 4 : compact ? 5 : 6;
  const primaryButtonHeight = tinyLandscape ? 30 : density === 'tiny' ? 32 : compact ? 36 : 42;
  const secondaryButtonHeight = tinyLandscape ? 24 : density === 'tiny' ? 28 : compact ? 32 : 36;
  const secondaryColumns = portrait(screen) ? 2 : 3;
  const secondaryRows = Math.ceil(6 / secondaryColumns);
  const buttonAreaHeight = primaryButtonHeight
    + buttonGap
    + secondaryRows * secondaryButtonHeight
    + Math.max(0, secondaryRows - 1) * buttonGap;
  const buttonArea = {
    x: 0,
    y: screen.height - buttonAreaHeight,
    width: screen.width,
    height: buttonAreaHeight,
  };
  const headerY = compact ? 22 : 28;
  const autoRestartY = buttonArea.y - (compact ? 14 : 18);
  const summaryTop = portrait(screen) ? 54 : 58;
  const contentWidth = Math.min(screen.width - 24, portrait(screen) ? compact ? 400 : 460 : compact ? 600 : 700);
  const contentX = screen.width / 2 - contentWidth / 2;
  const leaderboardHeight = portrait(screen) ? compact ? 52 : 66 : compact ? 66 : 86;
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
  return { buttonArea, leaderboardArea, summaryArea, headerY };
}

function statsBuildPanel(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = tiny || density === 'compact';
  const isPortrait = portrait(screen);
  const width = isPortrait
    ? Math.min(screen.width * 0.84, tiny ? 304 : 440)
    : Math.min(screen.width * (compact ? 0.62 : 0.56), compact ? 640 : 740);
  const height = isPortrait
    ? Math.min(screen.height * (tiny ? 0.68 : 0.72), tiny ? 460 : 540)
    : Math.min(screen.height * (compact ? 0.68 : 0.58), compact ? 400 : 460);
  const headerReserve = tiny ? 86 : compact || isPortrait ? 98 : 118;
  const footerReserve = tiny ? 58 : compact || isPortrait ? 68 : 86;
  const horizontalInset = tiny ? 18 : compact || isPortrait ? 24 : 32;

  return {
    width,
    height,
    contentWidth: width - horizontalInset * 2,
    contentHeight: height - headerReserve - footerReserve,
  };
}

function selectionPanel(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const panelWidth = Math.min(
    isPortrait
      ? screen.width * (tiny ? 0.84 : 0.82)
      : screen.width * (compact ? 0.64 : 0.56),
    isPortrait ? (tiny ? 316 : 370) : compact ? 680 : 720,
    screen.width,
  );
  const panelHeight = Math.min(
    isPortrait
      ? screen.height * (tiny ? 0.72 : 0.7)
      : screen.height * (compact ? 0.62 : 0.56),
    isPortrait ? (tiny ? 540 : 600) : compact ? 420 : 450,
    screen.height,
  );
  const contentTop = (compact ? 60 : isPortrait ? 66 : 76);
  const buttonHeight = tiny ? 26 : compact ? 30 : 34;
  const buttonBottomReserve = buttonHeight + (compact ? 18 : 26);

  return {
    width: panelWidth,
    height: panelHeight,
    contentHeight: panelHeight - contentTop - buttonBottomReserve,
  };
}

function loadingRunCards(screen) {
  const density = densityFor(screen);
  const compact = density === 'compact' || density === 'tiny';
  const isPortrait = portrait(screen);
  const topPadding = compact ? 18 : 28;
  const bottomAreaHeight = compact ? 96 : 118;
  const titleReserve = compact ? 58 : 82;
  const contentTop = topPadding + titleReserve;
  const contentBottom = screen.height - bottomAreaHeight - topPadding;
  const availableHeight = Math.max(100, contentBottom - contentTop);
  const gap = compact ? 8 : 14;
  const sidePadding = isPortrait ? 14 : Math.max(24, screen.width * 0.055);

  if (isPortrait) {
    const cardWidth = Math.min(screen.width - sidePadding * 2, compact ? 340 : 380);
    const cardHeight = Math.max(104, Math.min(compact ? 148 : 168, (availableHeight - gap * 2) / 3));
    return {
      mode: 'vertical',
      cardWidth,
      cardHeight,
      totalHeight: cardHeight * 3 + gap * 2,
      availableHeight,
    };
  }

  const rawCardWidth = (screen.width - sidePadding * 2 - gap * 2) / 3;
  const cardWidth = Math.min(rawCardWidth, compact ? 260 : 420);
  const cardHeight = Math.max(compact ? 130 : 168, Math.min(compact ? 190 : 260, availableHeight));
  return {
    mode: 'horizontal',
    cardWidth,
    cardHeight,
    totalWidth: cardWidth * 3 + gap * 2,
    availableWidth: screen.width - sidePadding * 2,
    availableHeight,
  };
}

function strategyPanel(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const margin = tiny ? 6 : 10;

  if (isPortrait) {
    const width = Math.min(screen.width - margin * 2, Math.max(tiny ? 236 : 268, tiny ? 300 : 364));
    const height = Math.min(
      Math.max(tiny ? 124 : 140, screen.height * (tiny ? 0.16 : 0.18)),
      tiny ? 156 : 184,
      screen.height - margin * 2,
    );
    return { width, height, orientation: 'bottom' };
  }

  const rightStackWidth = Math.min(compact ? 210 : 224, tiny ? 148 : 240);
  const width = Math.min(rightStackWidth, Math.max(compact ? 196 : 216, Math.min(screen.width * 0.18, 270)));
  const height = Math.min(
    Math.max(compact ? 188 : 226, Math.min(screen.height * (compact ? 0.48 : 0.52), compact ? 320 : 420)),
    screen.height - margin * 2,
  );
  return { width, height, orientation: 'right' };
}

function relicAcquiredPanel(screen) {
  const panelWidth = 340;
  const panelHeight = 166;
  const minScale = 0.76;
  const scale = Math.max(
    minScale,
    Math.min(1, (screen.width - 32) / panelWidth, (screen.height * 0.42) / panelHeight),
  );
  const width = panelWidth * scale;
  const height = panelHeight * scale;
  const y = Math.max(
    height / 2 + 16,
    Math.min(screen.height * (portrait(screen) ? 0.22 : 0.24), screen.height - height / 2 - 96),
  );

  return {
    x: screen.width / 2 - width / 2,
    y: y - height / 2,
    width,
    height,
    scale,
  };
}

function temporaryMessageOverlay(screen, kind) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const boss = kind === 'boss';
  const fontSize = boss ? tiny ? 24 : compact ? 30 : 38 : tiny ? 16 : compact ? 18 : 22;
  const wrapRatio = boss
    ? tiny ? 0.36 : compact ? 0.5 : 0.42
    : tiny ? 0.38 : compact ? 0.56 : 0.38;
  const wrapWidth = Math.max(180, Math.min(screen.width * wrapRatio, screen.width - 40));
  const estimatedLines = boss ? 2 : 1;
  const height = fontSize * estimatedLines * 1.35 + (boss ? 10 : 6);

  return {
    width: wrapWidth,
    height,
  };
}

function debugPanel(screen) {
  const compact = screen.width <= 900 || screen.height <= 560;
  const width = Math.min(
    compact ? 240 : 310,
    Math.max(190, screen.width * (compact ? 0.28 : 0.24)),
  );
  const maxHeight = Math.max(82, screen.height * (compact ? 0.26 : 0.34));
  const height = Math.max(compact ? 74 : 90, Math.min(maxHeight, maxHeight));

  return {
    width,
    height,
  };
}

function sceneActionArea(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const margin = tiny ? 10 : compact ? 12 : 16;
  const height = portrait(screen)
    ? tiny ? 64 : compact ? 72 : 84
    : tiny ? 30 : compact ? 36 : 42;

  return {
    x: margin,
    y: screen.height - margin - height,
    width: screen.width - margin * 2,
    height,
  };
}

function recordsScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const safeMargin = tiny ? 10 : compact ? 14 : 18;
  const tabY = portrait(screen) ? tiny ? 56 : compact ? 66 : 80 : compact ? 62 : 76;
  const tabHeight = tiny ? 28 : compact ? 30 : 34;
  const action = {
    x: safeMargin,
    y: 0,
    width: screen.width - safeMargin * 2,
    height: portrait(screen) ? tiny ? 34 : compact ? 38 : 44 : tiny ? 30 : compact ? 36 : 42,
  };
  action.y = screen.height - safeMargin - action.height;
  const actionTop = screen.height - safeMargin - action.height;
  const topOffset = tabY + tabHeight + (tiny ? 10 : compact ? 12 : 16);
  const maxPanelHeight = Math.min(
    Math.max(160, actionTop - topOffset - (tiny ? 8 : 12)),
    screen.height * (portrait(screen) ? tiny ? 0.66 : 0.68 : 0.72),
  );
  const panel = panelLayout(screen, {
    maxWidth: 760,
    maxHeight: maxPanelHeight,
    padding: 0,
  });

  return {
    panel: {
      x: panel.x,
      y: Math.max(topOffset, panel.y),
      width: panel.width,
      height: panel.height,
    },
    action,
  };
}

function replayToolScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const margin = tiny ? 10 : compact ? 12 : 16;
  const top = tiny ? 58 : compact ? 68 : 82;
  const width = screen.width - margin * 2;
  const actionTop = screen.height - margin - (portrait(screen) ? tiny ? 64 : compact ? 72 : 84 : tiny ? 30 : compact ? 36 : 42);
  const bottom = actionTop - (tiny ? 8 : 12);
  const importHeight = portrait(screen) ? tiny ? 72 : compact ? 82 : 92 : compact ? 60 : 74;
  const contentHeight = Math.max(tiny ? 150 : 190, bottom - top - importHeight - (tiny ? 8 : 12));
  const listWidth = portrait(screen) ? width : Math.min(410, width * 0.42);
  const detailWidth = portrait(screen) ? width : width - listWidth - 12;
  const listHeight = portrait(screen) ? Math.floor(contentHeight * 0.48) : contentHeight;
  const detailHeight = portrait(screen) ? contentHeight - listHeight - 10 : contentHeight;

  return {
    list: { width: listWidth, height: listHeight },
    detail: { width: detailWidth, height: detailHeight },
    importPanel: { width, height: importHeight },
    contentHeight,
  };
}

function dailyChallengeScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const margin = tiny ? 10 : compact ? 12 : 18;
  const top = tiny ? 58 : compact ? 68 : 82;
  const width = screen.width - margin * 2;
  const actionHeight = portrait(screen) ? tiny ? 64 : compact ? 72 : 84 : tiny ? 30 : compact ? 36 : 42;
  const bottom = screen.height - margin - actionHeight - (tiny ? 8 : 12);
  const gap = tiny ? 8 : 12;
  const availableHeight = Math.max(tiny ? 170 : 220, bottom - top);
  const detailHeight = Math.max(
    portrait(screen) ? tiny ? 112 : 128 : tiny ? 64 : 78,
    Math.min(
      availableHeight * (portrait(screen) ? 0.28 : 0.24),
      portrait(screen) ? tiny ? 220 : 240 : compact ? 128 : 240,
    ),
  );
  const summaryHeight = Math.max(tiny ? 120 : compact ? 150 : 190, availableHeight - detailHeight - gap);

  return {
    summary: { width, height: summaryHeight },
    detail: { width, height: detailHeight },
    availableHeight,
    totalHeight: summaryHeight + detailHeight + gap,
  };
}

function customStageToolScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const panel = panelLayout(screen, {
    maxWidth: isPortrait ? 320 : tiny ? 460 : compact ? 540 : 620,
    maxHeight: isPortrait ? compact ? 560 : 620 : tiny ? 280 : compact ? 390 : 500,
    padding: compact ? 16 : 22,
  });
  const buttonHeight = isPortrait ? tiny ? 160 : 174 : tiny ? 56 : compact ? 78 : 86;
  const buttonArea = {
    x: panel.content.x,
    y: panel.y + panel.height - buttonHeight - (isPortrait ? tiny ? 14 : 16 : tiny ? 10 : compact ? 14 : 18),
    width: panel.content.width,
    height: buttonHeight,
  };
  const validationHeight = tiny
    ? isPortrait ? 142 : 96
    : compact ? 150 : 164;
  const validationY = panel.y + (tiny ? isPortrait ? 78 : 58 : compact ? 88 : 104);
  const storedTop = validationY + validationHeight + (tiny ? 8 : 12);
  const storedHeight = Math.max(1, buttonArea.y - storedTop - (tiny ? 6 : 10));

  return {
    panel,
    validation: { width: panel.content.width, height: validationHeight },
    stored: { width: panel.content.width, height: storedHeight },
    buttonArea,
  };
}

function customStageEditorScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const buttonArea = {
    x: tiny ? 10 : 16,
    y: isPortrait ? tiny ? 50 : compact ? 58 : 70 : compact ? 54 : 68,
    width: screen.width - (tiny ? 20 : 32),
    height: isPortrait ? tiny ? 164 : compact ? 180 : 214 : tiny ? 72 : compact ? 82 : 96,
  };
  const top = buttonArea.y + buttonArea.height + (isPortrait ? tiny ? 8 : 12 : compact ? 10 : 16);
  const margin = tiny ? 10 : compact ? 12 : 16;
  const availableWidth = screen.width - margin * 2;
  const availableHeight = Math.max(tiny ? 150 : compact ? 190 : 240, screen.height - top - (tiny ? 10 : 18));
  const editorWidth = isPortrait ? availableWidth : Math.floor(availableWidth * 0.52);
  const waveWidth = isPortrait ? availableWidth : availableWidth - editorWidth - 12;
  const editorHeight = isPortrait ? Math.floor(availableHeight * 0.52) : availableHeight;
  const waveHeight = isPortrait ? availableHeight - editorHeight - 10 : availableHeight;

  return {
    buttonArea,
    editor: { width: editorWidth, height: editorHeight },
    wave: { width: waveWidth, height: waveHeight },
    availableHeight,
  };
}

function strategyEditorScene(screen) {
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const isPortrait = portrait(screen);
  const margin = tiny ? 10 : compact ? 14 : 24;
  const bottomY = screen.height - (tiny ? 24 : 34);
  const actionY = isPortrait ? bottomY - (tiny ? 32 : 38) : bottomY;
  const statusY = isPortrait ? actionY - (tiny ? 30 : 36) : screen.height - (tiny ? 54 : 74);
  const profileCount = 4;
  const sliderCount = 16;
  const profileWidth = isPortrait
    ? Math.min(screen.width - margin * 2, tiny ? 220 : 280)
    : compact ? 210 : 260;
  const profileStartY = isPortrait ? tiny ? 64 : 76 : tiny ? 58 : 86;
  const profileGap = tiny ? 30 : compact ? 34 : 40;
  const profileX = isPortrait ? screen.width / 2 : margin + profileWidth / 2;
  const sliderStartX = isPortrait ? margin : margin + profileWidth + (compact ? 18 : 32);
  const profileToSliderGap = tiny ? 24 : compact ? 28 : 32;
  const sliderStartY = isPortrait
    ? profileStartY + profileCount * profileGap + profileToSliderGap
    : profileStartY + (tiny ? 6 : 12);
  const sliderColumns = isPortrait
    ? screen.width >= 360 ? 2 : 1
    : 2;
  const sliderGapX = tiny ? 8 : compact ? 10 : 14;
  const portraitSliderColumnWidth = sliderColumns > 1
    ? Math.floor((screen.width - margin * 2 - sliderGapX) / 2)
    : screen.width - margin * 2;
  const sliderColumnWidth = isPortrait
    ? Math.min(tiny ? 188 : 210, portraitSliderColumnWidth)
    : tiny ? 178 : compact ? 250 : 292;
  const sliderTotalWidth = sliderColumns * sliderColumnWidth + Math.max(0, sliderColumns - 1) * sliderGapX;
  const detailFrameGap = tiny ? 18 : compact ? 22 : 26;
  const sliderGapY = tiny ? 32 : compact ? 36 : 42;
  const visibleSliderRows = Math.ceil(sliderCount / sliderColumns);
  const sliderPanelWidth = sliderTotalWidth + (tiny ? 20 : 28);
  const detailWidth = isPortrait
    ? screen.width - margin * 2
    : Math.max(tiny ? 196 : 220, screen.width - sliderStartX - sliderTotalWidth - detailFrameGap - margin);
  const detailX = isPortrait
    ? margin
    : Math.max(sliderStartX + sliderTotalWidth + detailFrameGap, screen.width - detailWidth - margin);
  const detailY = isPortrait
    ? Math.min(bottomY - 118, sliderStartY + visibleSliderRows * sliderGapY + 8)
    : profileStartY;
  const profilePanel = {
    x: profileX - profileWidth / 2 - (tiny ? 8 : 10),
    y: profileStartY - (tiny ? 18 : 22),
    width: profileWidth + (tiny ? 16 : 20),
    height: profileCount * profileGap + (tiny ? 20 : 28),
  };
  const sliderPanel = {
    x: sliderStartX - (tiny ? 10 : 14),
    y: sliderStartY - (tiny ? 20 : 24),
    width: sliderPanelWidth,
    height: visibleSliderRows * sliderGapY + (tiny ? 18 : 26),
  };
  const detailPanel = {
    x: detailX - (tiny ? 8 : 10),
    y: detailY - (tiny ? 10 : 12),
    width: detailWidth + (tiny ? 16 : 20),
    height: Math.max(110, (isPortrait ? statusY : bottomY) - detailY - (isPortrait ? 6 : 38)),
  };
  const actionArea = {
    x: isPortrait ? margin : margin + profileWidth + (compact ? 20 : 32),
    y: actionY - (tiny ? 13 : 15),
    width: isPortrait
      ? screen.width - margin * 2
      : Math.min(screen.width - margin * 2, 6 * (compact ? 98 : 114)),
    height: tiny ? 58 : 66,
  };

  return {
    profilePanel,
    sliderPanel,
    detailPanel,
    actionArea,
    sliderColumns,
    visibleSliderRows,
  };
}

for (const screen of cases) {
  const label = `${screen.name} ${screen.width}x${screen.height}`;
  const density = densityFor(screen);
  const maxOverlayRatio = portrait(screen) ? 0.72 : density === 'tiny' ? 0.58 : 0.48;

  const settingsPanel = genericPanel(screen, 760, 620);
  assert(
    area(settingsPanel) / screenArea(screen) <= maxOverlayRatio,
    `${label}: generic panel is too dominant`,
  );

  const settings = settingsMenu(screen);
  assert(
    area(settings) / screenArea(screen) <= (portrait(screen) ? 0.58 : density === 'tiny' ? 0.5 : 0.38),
    `${label}: settings menu is too dominant`,
  );
  assert(settings.rowsPerPage >= (density === 'tiny' ? 3 : 4), `${label}: settings menu shows too few rows per page`);
  assert(settings.contentRowsHeight >= (density === 'tiny' ? 120 : 160), `${label}: settings menu content area too short`);
  assert(settings.tabRows <= (portrait(screen) ? 2 : 1), `${label}: settings tabs wrap too much`);

  const developer = developerMenu(screen);
  assert(
    area(developer) / screenArea(screen) <= (portrait(screen) ? 0.58 : density === 'tiny' ? 0.46 : 0.36),
    `${label}: developer menu is too dominant`,
  );
  assert(developer.rowsPerPage >= (density === 'tiny' ? 3 : 4), `${label}: developer menu shows too few actions per page`);
  assert(developer.contentRowsHeight >= (density === 'tiny' ? 100 : 140), `${label}: developer menu content area too short`);

  const title = titleLayout(screen);
  assert(title.frame.y >= 0, `${label}: title menu frame starts above viewport`);
  assert(title.frame.y + title.frame.height <= screen.height + 1, `${label}: title menu frame exceeds viewport`);
  assert(
    area(title.frame) / screenArea(screen) <= (portrait(screen) ? 0.36 : density === 'tiny' ? 0.34 : 0.26),
    `${label}: title menu frame is too dominant`,
  );
  for (const [index, rect] of title.buttonRects.entries()) {
    assert(rect.y >= title.frame.y - 1, `${label}: title button ${index} starts above menu frame`);
    assert(rect.y + rect.height <= title.frame.y + title.frame.height + 1, `${label}: title button ${index} exceeds menu frame`);
  }

  const pause = pauseMenu(screen);
  assert(
    area(pause) / screenArea(screen) <= (portrait(screen) ? 0.46 : 0.38),
    `${label}: pause menu is too large`,
  );
  assert(pause.height >= 250 || density === 'tiny', `${label}: pause menu content height too small`);

  const help = helpPanel(screen);
  assert(
    area(help) / screenArea(screen) <= (portrait(screen) ? 0.68 : 0.46),
    `${label}: help panel is too large`,
  );
  assert(help.width >= 280 || density === 'tiny', `${label}: help panel too narrow`);

  const level = levelUp(screen);
  assert(
    area({ width: level.panelWidth, height: level.panelHeight }) / screenArea(screen) <= (portrait(screen) ? 0.62 : 0.42),
    `${label}: level-up panel is too large`,
  );
  if (level.mode === 'horizontal') {
    assert(level.cardCountWidth <= level.panelWidth - 20, `${label}: level-up cards overflow horizontally`);
  } else {
    assert(level.cardCountHeight <= level.panelHeight - 40, `${label}: level-up cards overflow vertically`);
  }

  const result = resultLayout(screen);
  assert(!intersects(result.summaryArea, result.leaderboardArea), `${label}: result summary overlaps leaderboard`);
  assert(!intersects(result.leaderboardArea, result.buttonArea), `${label}: result leaderboard overlaps buttons`);
  assert(result.summaryArea.height >= (density === 'tiny' ? 76 : 100), `${label}: result summary area too short`);
  assert(result.buttonArea.height <= screen.height * (portrait(screen) ? 0.24 : 0.22), `${label}: result buttons take too much height`);

  const statsBuild = statsBuildPanel(screen);
  assert(
    area(statsBuild) / screenArea(screen) <= (portrait(screen) ? 0.52 : density === 'tiny' ? 0.46 : 0.36),
    `${label}: stats/build panel is too dominant`,
  );
  assert(statsBuild.contentHeight >= (density === 'tiny' ? 110 : 150), `${label}: stats/build content area too short`);
  assert(statsBuild.contentWidth >= (density === 'tiny' ? 220 : 280), `${label}: stats/build content area too narrow`);

  const selection = selectionPanel(screen);
  assert(
    area(selection) / screenArea(screen) <= (portrait(screen) ? 0.62 : density === 'tiny' ? 0.42 : 0.36),
    `${label}: selection panel is too dominant`,
  );
  assert(selection.contentHeight >= (density === 'tiny' ? 110 : 160), `${label}: selection content area too short`);

  const loading = loadingRunCards(screen);
  if (loading.mode === 'vertical') {
    assert(loading.totalHeight <= loading.availableHeight + 1, `${label}: loading cards overflow vertically`);
  } else {
    assert(loading.totalWidth <= loading.availableWidth + 1, `${label}: loading cards overflow horizontally`);
    assert(loading.cardHeight <= loading.availableHeight + 1, `${label}: loading card height exceeds content area`);
  }

  const strategy = strategyPanel(screen);
  assert(
    area(strategy) / screenArea(screen) <= (portrait(screen) ? 0.17 : 0.16),
    `${label}: strategy panel consumes too much playfield`,
  );

  const relic = relicAcquiredPanel(screen);
  assert(relic.scale >= 0.76 && relic.scale <= 1, `${label}: relic acquired scale is invalid`);
  assert(relic.y >= 0, `${label}: relic acquired panel starts above viewport`);
  assert(relic.y + relic.height <= screen.height - 72, `${label}: relic acquired panel blocks bottom HUD area`);
  assert(
    area(relic) / screenArea(screen) <= (portrait(screen) ? 0.19 : 0.18),
    `${label}: relic acquired panel is too dominant`,
  );

  const bossMessage = temporaryMessageOverlay(screen, 'boss');
  assert(
    area(bossMessage) / screenArea(screen) <= (portrait(screen) ? 0.08 : 0.07),
    `${label}: boss temporary message is too dominant`,
  );
  assert(bossMessage.width <= screen.width - 32, `${label}: boss temporary message exceeds viewport width`);

  const normalMessage = temporaryMessageOverlay(screen, 'normal');
  assert(
    area(normalMessage) / screenArea(screen) <= (portrait(screen) ? 0.035 : 0.03),
    `${label}: normal temporary message is too dominant`,
  );

  const debug = debugPanel(screen);
  assert(
    area(debug) / screenArea(screen) <= (portrait(screen) ? 0.13 : 0.09),
    `${label}: debug panel is too dominant`,
  );
  assert(debug.width <= screen.width * (portrait(screen) ? 0.5 : 0.3), `${label}: debug panel too wide`);

  const records = recordsScene(screen);
  assert(!intersects(records.panel, records.action), `${label}: records panel overlaps action buttons`);
  assert(
    area(records.panel) / screenArea(screen) <= (portrait(screen) ? 0.62 : 0.48),
    `${label}: records panel is too dominant`,
  );

  const replay = replayToolScene(screen);
  assert(replay.list.height >= (density === 'tiny' ? 68 : 90), `${label}: replay list area too short`);
  assert(replay.detail.height >= (density === 'tiny' ? 68 : 90), `${label}: replay detail area too short`);
  assert(replay.importPanel.height <= screen.height * (portrait(screen) ? 0.12 : 0.2), `${label}: replay import panel too tall`);

  const daily = dailyChallengeScene(screen);
  assert(daily.totalHeight <= daily.availableHeight + 1, `${label}: daily challenge panels exceed available content height`);
  assert(daily.detail.height >= (portrait(screen) ? density === 'tiny' ? 112 : 128 : density === 'tiny' ? 64 : 78), `${label}: daily challenge detail panel too short`);
  assert(
    daily.summary.height / Math.max(1, daily.totalHeight) <= (portrait(screen) ? 0.76 : 0.78),
    `${label}: daily challenge summary/detail ratio is unbalanced`,
  );

  const customTool = customStageToolScene(screen);
  assert(
    area(customTool.panel) / screenArea(screen) <= (portrait(screen) ? 0.62 : 0.44),
    `${label}: custom stage tool panel is too dominant`,
  );
  assert(customTool.validation.height >= (density === 'tiny' ? portrait(screen) ? 140 : 96 : 155), `${label}: custom validation panel too short`);
  assert(customTool.stored.height >= (density === 'tiny' ? 42 : 70), `${label}: custom stored list too short`);

  const customEditor = customStageEditorScene(screen);
  assert(customEditor.buttonArea.height <= screen.height * (portrait(screen) ? 0.26 : 0.25), `${label}: custom editor action area too tall`);
  assert(customEditor.editor.height >= (density === 'tiny' ? 76 : 110), `${label}: custom editor panel too short`);
  assert(customEditor.wave.height >= (density === 'tiny' ? 64 : 100), `${label}: custom wave panel too short`);
  assert(
    customEditor.editor.height / Math.max(1, customEditor.availableHeight) <= (portrait(screen) ? 0.62 : 1),
    `${label}: custom editor/wave ratio is unbalanced`,
  );

  const strategyEditor = strategyEditorScene(screen);
  assert(strategyEditor.sliderColumns >= (screen.width >= 360 ? 2 : 1), `${label}: strategy editor uses too few slider columns`);
  assert(!intersects(strategyEditor.profilePanel, strategyEditor.sliderPanel), `${label}: strategy editor profile overlaps sliders`);
  assert(!intersects(strategyEditor.sliderPanel, strategyEditor.detailPanel), `${label}: strategy editor sliders overlap detail panel`);
  assert(!intersects(strategyEditor.detailPanel, strategyEditor.actionArea), `${label}: strategy editor detail overlaps action buttons`);
  assert(strategyEditor.sliderPanel.x >= 0, `${label}: strategy editor sliders start outside viewport`);
  assert(strategyEditor.sliderPanel.x + strategyEditor.sliderPanel.width <= screen.width + 1, `${label}: strategy editor sliders exceed viewport width`);
  assert(strategyEditor.detailPanel.height >= (density === 'tiny' ? 98 : 120), `${label}: strategy editor detail panel too short`);
  assert(strategyEditor.actionArea.height <= screen.height * (portrait(screen) ? 0.09 : 0.18), `${label}: strategy editor action area too tall`);
}

console.info('[ui-layout-budget] UI layout budget check passed.');
