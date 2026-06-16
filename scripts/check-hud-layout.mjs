const cases = [
  { name: 'desktop landscape', width: 1280, height: 720 },
  { name: 'wide desktop', width: 1920, height: 1080 },
  { name: 'mobile portrait', width: 390, height: 844 },
  { name: 'large portrait', width: 430, height: 932 },
  { name: 'narrow landscape', width: 844, height: 390 },
];

const minimapScales = [0, 1, 2, 3];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function intersects(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function clampRect(rect, screen) {
  return {
    ...rect,
    x: clamp(rect.x, 0, screen.width - rect.width),
    y: clamp(rect.y, 0, screen.height - rect.height),
  };
}

function moveToAvoidOverlap(target, blockers, candidates) {
  if (!blockers.some((blocker) => intersects(target, blocker))) {
    return target;
  }

  return candidates.find((candidate) => (
    !blockers.some((blocker) => intersects(candidate, blocker))
  )) ?? target;
}

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

function buildLayout(screen, minimapScale) {
  const portrait = screen.height > screen.width;
  const density = densityFor(screen);
  const tiny = density === 'tiny';
  const compact = density === 'compact' || tiny;
  const spacious = density === 'spacious';
  const margin = tiny ? 6 : compact ? 8 : 10;
  const minimapWidth = (portrait ? tiny ? 76 : 90 : compact ? 112 : spacious ? 156 : 138) * minimapScale;
  const minimapHeight = (portrait ? tiny ? 58 : 70 : compact ? 76 : spacious ? 108 : 96) * minimapScale;
  const rightStackWidth = Math.min(
    portrait ? (tiny ? screen.width * 0.38 : screen.width * 0.44) : spacious ? 224 : 196,
    tiny ? 148 : spacious ? 240 : 210,
  );
  const portraitSize = tiny ? 30 : portrait ? 36 : compact ? 34 : 40;
  const statsContentOffsetY = portraitSize + (tiny ? 2 : compact ? 4 : 6);
  const statsHeight = (tiny ? 112 : compact ? 132 : 150) + statsContentOffsetY;
  const buildIconSize = tiny ? 34 : compact ? 40 : 46;
  const buildRowHeight = buildIconSize + (tiny ? 4 : 5);
  const pauseWidth = portrait ? tiny ? 40 : 46 : compact ? 78 : 92;
  const pauseHeight = portrait ? tiny ? 40 : 46 : compact ? 34 : 40;
  const pauseRect = portrait
    ? { x: margin, y: margin, width: pauseWidth, height: pauseHeight }
    : {
      x: screen.width - minimapWidth - pauseWidth - (compact ? 10 : 16),
      y: margin,
      width: pauseWidth,
      height: pauseHeight,
    };
  const minimapTopRight = {
    x: screen.width - minimapWidth,
    y: margin,
    width: minimapWidth,
    height: minimapHeight,
  };
  const minimapBottomRight = {
    x: screen.width - minimapWidth,
    y: screen.height - minimapHeight,
    width: minimapWidth,
    height: minimapHeight,
  };
  const minimapRect = moveToAvoidOverlap(
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
    ? { x: 0, y: screen.height - 220, width: 220, height: 220 }
    : { x: 0, y: screen.height - 180, width: 190, height: 180 };
  const statsWidth = rightStackWidth;
  const statsRightX = screen.width - statsWidth;
  const buildStartY = portrait
    ? pauseRect.y + pauseRect.height + (tiny ? 6 : 10)
    : margin;
  const maxBuildHeight = Math.max(34, virtualJoystickRect.y - buildStartY - 10);
  let maxIconRows = Math.max(
    1,
    Math.min(portrait ? tiny ? 4 : 5 : compact ? 4 : 6, Math.floor(maxBuildHeight / buildRowHeight)),
  );
  const defaultBuildX = margin;
  const minBuildListWidth = tiny ? 104 : compact ? 128 : 148;
  const portraitBuildWidthLimit = Math.max(minBuildListWidth, statsRightX - defaultBuildX - (portrait ? 8 : 10));
  let buildListWidth = portrait
    ? Math.min(screen.width - margin * 2, tiny ? 210 : 258, portraitBuildWidthLimit)
    : compact ? 236 : 268;
  const shiftedBuildX = virtualJoystickRect.x + virtualJoystickRect.width + 16;
  const buildX = !portrait && buildStartY + maxIconRows * buildRowHeight > virtualJoystickRect.y
    ? Math.min(shiftedBuildX, screen.width - buildListWidth)
    : defaultBuildX;
  let buildListRect = {
    x: buildX,
    y: buildStartY,
    width: buildListWidth,
    height: maxIconRows * buildRowHeight,
  };
  const statsPreferredY = minimapScale > 0
    ? minimapRect.y + minimapRect.height + (portrait ? 8 : 10)
    : pauseRect.y + pauseRect.height + (portrait ? 8 : 10);
  const statsPreferredRect = {
    x: statsRightX,
    y: statsPreferredY,
    width: statsWidth,
    height: statsHeight,
  };
  const statsCandidates = [
    statsPreferredRect,
    { ...statsPreferredRect, y: Math.max(statsPreferredY, screen.height / 2 - statsHeight / 2) },
    {
      x: Math.max(margin, minimapRect.x - statsWidth - (portrait ? 8 : 10)),
      y: statsPreferredY,
      width: statsWidth,
      height: statsHeight,
    },
    {
      x: margin,
      y: buildListRect.y + buildListRect.height + (portrait ? 8 : 10),
      width: statsWidth,
      height: statsHeight,
    },
  ].map((rect) => clampRect(rect, screen));
  const statsRect = moveToAvoidOverlap(
    statsCandidates[0],
    [
      pauseRect,
      ...(minimapScale > 0 ? [minimapRect] : []),
      virtualJoystickRect,
      buildListRect,
    ],
    statsCandidates.slice(1),
  );
  if (intersects(buildListRect, statsRect)) {
    const widthBeforeStats = statsRect.x - buildListRect.x - (portrait ? 8 : 10);
    if (widthBeforeStats >= minBuildListWidth) {
      buildListWidth = Math.min(buildListRect.width, widthBeforeStats);
      buildListRect = { ...buildListRect, width: buildListWidth };
    } else {
      maxIconRows = Math.max(1, maxIconRows - 1);
      buildListRect = { ...buildListRect, height: maxIconRows * buildRowHeight };
    }
  }
  const topCenterLeftLimit = portrait
    ? pauseRect.x + pauseRect.width + 12
    : buildListRect.x + buildListRect.width + 12;
  const topCenterRightLimit = Math.min(
    minimapScale > 0
      ? minimapRect.x - 12
      : screen.width - margin,
    !portrait && pauseRect.x > topCenterLeftLimit
      ? pauseRect.x - 12
      : screen.width - margin,
  );
  const topCenterMaxWidth = Math.max(tiny ? 120 : 160, topCenterRightLimit - topCenterLeftLimit);
  const topCenterWidth = Math.min(tiny ? 230 : compact ? 300 : spacious ? 480 : 380, topCenterMaxWidth);
  const topCenterCandidate = {
    x: clamp(
      screen.width / 2 - topCenterWidth / 2,
      topCenterLeftLimit,
      Math.max(topCenterLeftLimit, topCenterRightLimit - topCenterWidth),
    ),
    y: margin,
    width: topCenterWidth,
    height: tiny ? 58 : compact ? 72 : 92,
  };
  const topCenterFallback = {
    x: margin,
    y: Math.max(pauseRect.y + pauseRect.height, minimapRect.y + minimapRect.height) + 8,
    width: screen.width - margin * 2,
    height: tiny ? 56 : compact ? 70 : 88,
  };
  const topCenterLowFallback = {
    x: margin,
    y: Math.max(
      pauseRect.y + pauseRect.height,
      minimapRect.y + minimapRect.height,
      statsRect.y + statsRect.height,
      buildListRect.y + buildListRect.height,
    ) + 8,
    width: screen.width - margin * 2,
    height: tiny ? 56 : compact ? 70 : 88,
  };
  const topCenter = moveToAvoidOverlap(
    topCenterCandidate,
    [pauseRect, minimapRect, statsRect, buildListRect],
    [topCenterFallback, topCenterLowFallback].map((rect) => clampRect(rect, screen)),
  );

  return {
    density,
    maxIconRows,
    pauseRect,
    minimapRect,
    statsRect,
    buildListRect,
    virtualJoystickRect,
    topCenter,
  };
}

function assertNoOverlap(label, aName, a, bName, b) {
  if (intersects(a, b)) {
    throw new Error(`${label}: ${aName} overlaps ${bName}`);
  }
}

for (const screen of cases) {
  for (const minimapScale of minimapScales) {
    const label = `${screen.name} ${screen.width}x${screen.height} minimapScale=${minimapScale}`;
    const layout = buildLayout(screen, minimapScale);

    assertNoOverlap(label, 'stats', layout.pauseRect, 'pause', layout.statsRect);
    assertNoOverlap(label, 'stats', layout.buildListRect, 'build list', layout.statsRect);
    assertNoOverlap(label, 'build list', layout.buildListRect, 'virtual joystick', layout.virtualJoystickRect);
    assertNoOverlap(label, 'top center', layout.topCenter, 'pause', layout.pauseRect);
    assertNoOverlap(label, 'top center', layout.topCenter, 'build list', layout.buildListRect);
    assertNoOverlap(label, 'top center', layout.topCenter, 'stats', layout.statsRect);

    if (minimapScale > 0) {
      assertNoOverlap(label, 'minimap', layout.minimapRect, 'pause', layout.pauseRect);
      assertNoOverlap(label, 'minimap', layout.minimapRect, 'stats', layout.statsRect);
      assertNoOverlap(label, 'top center', layout.topCenter, 'minimap', layout.minimapRect);
    }

    if (screen.height > screen.width && screen.height >= 800 && layout.maxIconRows < 4) {
      throw new Error(`${label}: portrait build rows too low (${layout.maxIconRows})`);
    }
  }
}

console.info('[hud-layout] HUD layout check passed.');
