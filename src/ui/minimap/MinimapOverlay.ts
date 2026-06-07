import Phaser from 'phaser';

import { AssetKeyResolver } from '../../assets/AssetKeyResolver';
import {
  MapLightSourceDefinition,
  MapMechanicDefinition,
  MapObstacleDefinition,
  MapPortalDefinition,
  MapSlowZoneDefinition,
} from '../../map/mechanics/MapMechanicDefinition';
import { UITheme } from '../UITheme';
import { MINIMAP_STYLE } from './MinimapStyle';
import { MinimapEnemyPosition, MinimapOverlayState, WorldPosition } from './MinimapTypes';

export class MinimapOverlay {
  private static readonly MAX_ENEMIES = 50;

  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly mechanicsGraphics: Phaser.GameObjects.Graphics;
  private readonly mechanicIcons: Phaser.GameObjects.Image[] = [];
  private readonly markerGraphics: Phaser.GameObjects.Graphics;
  private readonly playerMarker: Phaser.GameObjects.Arc;
  private readonly enemyMarkers: Phaser.GameObjects.Arc[] = [];
  private x = 0;
  private y = 0;
  private width = 130;
  private height = 82;
  private visible = true;

  constructor(private readonly scene: Phaser.Scene) {
    this.background = scene.add.rectangle(0, 0, this.width, this.height, UITheme.panelBgColor, 0.72);
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(1, UITheme.panelBorderColor, 0.65);
    this.background.setDepth(900);
    this.background.setScrollFactor(0);

    this.mechanicsGraphics = scene.add.graphics();
    this.mechanicsGraphics.setDepth(901);
    this.mechanicsGraphics.setScrollFactor(0);
    this.markerGraphics = scene.add.graphics();
    this.markerGraphics.setDepth(904);
    this.markerGraphics.setScrollFactor(0);

    for (let index = 0; index < MinimapOverlay.MAX_ENEMIES; index += 1) {
      const enemyDot = scene.add.circle(0, 0, 2, 0xef4444, 0.85);
      enemyDot.setDepth(902);
      enemyDot.setScrollFactor(0);
      enemyDot.setVisible(false);
      this.enemyMarkers.push(enemyDot);
    }

    this.playerMarker = scene.add.circle(0, 0, 3, 0x38bdf8, 1);
    this.playerMarker.setDepth(904);
    this.playerMarker.setScrollFactor(0);
    this.playerMarker.setVisible(false);
  }

  update(state: MinimapOverlayState): void {
    if (!this.visible) {
      return;
    }

    this.updateMechanics(state);
    this.markerGraphics.clear();
    this.playerMarker.setVisible(false);

    for (const enemyDot of this.enemyMarkers) {
      enemyDot.setVisible(false);
    }

    const normalEnemies = state.enemyPositions.filter((position) => position.bossLike !== true);
    const bossEnemies = state.enemyPositions.filter((position) => position.bossLike === true);

    normalEnemies
      .slice(0, MinimapOverlay.MAX_ENEMIES)
      .forEach((position, index) => {
        const enemyDot = this.enemyMarkers[index];

        enemyDot.setPosition(
          this.toMinimapX(position.x, state.worldWidth),
          this.toMinimapY(position.y, state.worldHeight),
        );
        enemyDot.setVisible(true);
      });

    bossEnemies.forEach((position) => this.drawBossMarker(position, state));
    this.drawPlayerMarker(state.playerPosition, state);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.background.setPosition(x, y);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.background.setSize(width, height);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.background.setVisible(visible);
    this.mechanicsGraphics.setVisible(visible);
    this.markerGraphics.setVisible(visible);
    this.playerMarker.setVisible(false);
    this.mechanicIcons.forEach((icon) => icon.setVisible(false));
    this.enemyMarkers.forEach((enemyDot) => enemyDot.setVisible(false));
  }

  destroy(): void {
    this.background.destroy();
    this.mechanicsGraphics.destroy();
    this.mechanicIcons.forEach((icon) => icon.destroy());
    this.markerGraphics.destroy();
    this.playerMarker.destroy();
    this.enemyMarkers.forEach((enemyDot) => enemyDot.destroy());
  }

  private updateMechanics(state: MinimapOverlayState): void {
    this.mechanicsGraphics.clear();
    this.mechanicIcons.forEach((icon) => icon.setVisible(false));

    const mechanics = (state.mapMechanics ?? [])
      .filter((mechanic) => mechanic.enabled !== false && mechanic.minimapVisible !== false)
      .sort((a, b) => (a.minimapPriority ?? this.getDefaultPriority(a))
        - (b.minimapPriority ?? this.getDefaultPriority(b)));
    let iconIndex = 0;

    for (const mechanic of mechanics) {
      switch (mechanic.type) {
        case 'slowZone':
          this.drawSlowZone(mechanic as MapSlowZoneDefinition, state, () => {
            const slowZone = mechanic as MapSlowZoneDefinition;
            iconIndex = this.placeIcon(
              iconIndex,
              this.getSlowZoneIconKind(slowZone.visualType),
              mechanic.x,
              mechanic.y,
              state,
              slowZone.visualType === 'river' ? 8 : 9,
              MINIMAP_STYLE.icons.slowZoneAlpha,
            );
          });
          break;
        case 'portal':
          const portal = mechanic as MapPortalDefinition;
          iconIndex = this.placeIcon(
            iconIndex,
            portal.visualType === 'green'
              ? 'portalGreen'
              : portal.visualType === 'purple'
                ? 'portalPurple'
                : 'portalBlue',
            mechanic.x,
            mechanic.y,
            state,
            14,
            MINIMAP_STYLE.icons.portalAlpha,
          );
          break;
        case 'obstacle':
          const obstacle = mechanic as MapObstacleDefinition;

          if (obstacle.blocksPlayer === false && obstacle.blocksEnemies === false) {
            break;
          }

          this.drawObstacle(obstacle, state);
          iconIndex = this.placeIcon(
            iconIndex,
            'obstacle',
            mechanic.x,
            mechanic.y,
            state,
            8,
            MINIMAP_STYLE.icons.obstacleAlpha,
          );
          break;
        case 'lightSource':
          this.drawLight(mechanic as MapLightSourceDefinition, state);
          iconIndex = this.placeIcon(
            iconIndex,
            'light',
            mechanic.x,
            mechanic.y,
            state,
            9,
            MINIMAP_STYLE.icons.lightAlpha,
          );
          break;
        case 'hazard':
          iconIndex = this.placeIcon(
            iconIndex,
            'hazard',
            mechanic.x,
            mechanic.y,
            state,
            11,
            MINIMAP_STYLE.icons.hazardAlpha,
          );
          break;
        case 'altar':
          iconIndex = this.placeIcon(
            iconIndex,
            'altar',
            mechanic.x,
            mechanic.y,
            state,
            10,
            MINIMAP_STYLE.icons.defaultAlpha,
          );
          break;
        case 'spawner':
          iconIndex = this.placeIcon(
            iconIndex,
            'spawner',
            mechanic.x,
            mechanic.y,
            state,
            10,
            MINIMAP_STYLE.icons.defaultAlpha,
          );
          break;
        default:
          break;
      }
    }
  }

  private drawSlowZone(
    mechanic: MapSlowZoneDefinition,
    state: MinimapOverlayState,
    placeIcon: () => void,
  ): void {
    const visualType = mechanic.visualType ?? 'swamp';
    const terrainStyle = MINIMAP_STYLE.terrain;
    const color = visualType === 'river'
      ? terrainStyle.riverColor
      : visualType === 'mud'
        ? terrainStyle.mudColor
        : terrainStyle.swampColor;
    const alpha = visualType === 'river'
      ? terrainStyle.riverAlpha
      : visualType === 'mud'
        ? terrainStyle.mudAlpha
        : terrainStyle.swampAlpha;
    const strokeAlpha = visualType === 'river'
      ? terrainStyle.riverStrokeAlpha
      : visualType === 'mud'
        ? terrainStyle.mudStrokeAlpha
        : terrainStyle.swampStrokeAlpha;

    this.mechanicsGraphics.fillStyle(color, alpha);
    this.mechanicsGraphics.lineStyle(1, color, strokeAlpha);

    if ((mechanic.shape ?? (mechanic.radius ? 'circle' : 'rect')) === 'circle') {
      const radius = (mechanic.radius ?? 1) * this.getScale(state);

      this.mechanicsGraphics.fillCircle(
        this.toMinimapX(mechanic.x, state.worldWidth),
        this.toMinimapY(mechanic.y, state.worldHeight),
        radius,
      );
      this.mechanicsGraphics.strokeCircle(
        this.toMinimapX(mechanic.x, state.worldWidth),
        this.toMinimapY(mechanic.y, state.worldHeight),
        radius,
      );
      placeIcon();
      return;
    }

    const width = (mechanic.width ?? 1) * (this.width / Math.max(1, state.worldWidth));
    const height = (mechanic.height ?? 1) * (this.height / Math.max(1, state.worldHeight));

    this.mechanicsGraphics.fillRect(
      this.toMinimapX(mechanic.x, state.worldWidth) - width / 2,
      this.toMinimapY(mechanic.y, state.worldHeight) - height / 2,
      width,
      height,
    );
    this.mechanicsGraphics.strokeRect(
      this.toMinimapX(mechanic.x, state.worldWidth) - width / 2,
      this.toMinimapY(mechanic.y, state.worldHeight) - height / 2,
      width,
      height,
    );
    placeIcon();
  }

  private drawObstacle(mechanic: MapObstacleDefinition, state: MinimapOverlayState): void {
    const x = this.toMinimapX(mechanic.x, state.worldWidth);
    const y = this.toMinimapY(mechanic.y, state.worldHeight);
    const width = Math.max(3, mechanic.width * (this.width / Math.max(1, state.worldWidth)));
    const height = Math.max(3, mechanic.height * (this.height / Math.max(1, state.worldHeight)));

    this.mechanicsGraphics.fillStyle(
      MINIMAP_STYLE.terrain.obstacleColor,
      MINIMAP_STYLE.terrain.obstacleAlpha,
    );
    this.mechanicsGraphics.fillRect(x - width / 2, y - height / 2, width, height);
  }

  private drawLight(mechanic: MapLightSourceDefinition, state: MinimapOverlayState): void {
    const radius = mechanic.radius * this.getScale(state);

    this.mechanicsGraphics.fillStyle(
      MINIMAP_STYLE.terrain.lightRadiusColor,
      MINIMAP_STYLE.terrain.lightRadiusAlpha,
    );
    this.mechanicsGraphics.fillCircle(
      this.toMinimapX(mechanic.x, state.worldWidth),
      this.toMinimapY(mechanic.y, state.worldHeight),
      radius,
    );
  }

  private placeIcon(
    iconIndex: number,
    kind: Parameters<typeof AssetKeyResolver.getMapMechanicMinimapIconKey>[1],
    worldX: number,
    worldY: number,
    state: MinimapOverlayState,
    size: number,
    alpha: number = MINIMAP_STYLE.icons.defaultAlpha,
  ): number {
    const textureKey = AssetKeyResolver.getMapMechanicMinimapIconKey(this.scene, kind);

    if (!textureKey) {
      this.drawFallbackIcon(kind, worldX, worldY, state, size, alpha);
      return iconIndex;
    }

    while (this.mechanicIcons.length <= iconIndex) {
      const icon = this.scene.add.image(0, 0, textureKey);
      icon.setDepth(903);
      icon.setScrollFactor(0);
      icon.setVisible(false);
      this.mechanicIcons.push(icon);
    }

    const icon = this.mechanicIcons[iconIndex];

    icon.setTexture(textureKey);
    icon.setPosition(this.toMinimapX(worldX, state.worldWidth), this.toMinimapY(worldY, state.worldHeight));
    icon.setDisplaySize(size, size);
    icon.setAlpha(alpha);
    icon.setVisible(true);
    return iconIndex + 1;
  }

  private drawFallbackIcon(
    kind: Parameters<typeof AssetKeyResolver.getMapMechanicMinimapIconKey>[1],
    worldX: number,
    worldY: number,
    state: MinimapOverlayState,
    size: number,
    alpha: number,
  ): void {
    const x = this.toMinimapX(worldX, state.worldWidth);
    const y = this.toMinimapY(worldY, state.worldHeight);
    const color = kind === 'hazard'
      ? 0xef4444
      : kind === 'light'
        ? 0xfacc15
        : kind === 'obstacle'
          ? 0x94a3b8
          : 0x38bdf8;

    this.mechanicsGraphics.fillStyle(color, alpha);
    this.mechanicsGraphics.fillCircle(x, y, size / 2);
  }

  private drawBossMarker(position: MinimapEnemyPosition, state: MinimapOverlayState): void {
    const style = MINIMAP_STYLE.markers;
    const x = this.toMinimapX(position.x, state.worldWidth);
    const y = this.toMinimapY(position.y, state.worldHeight);
    const ringRadius = position.finalBoss === true
      ? style.finalBossRingRadius
      : style.bossRingRadius;
    const centerRadius = position.finalBoss === true
      ? style.finalBossCenterRadius
      : style.bossCenterRadius;

    this.markerGraphics.lineStyle(2, 0xef4444, 0.95);
    this.markerGraphics.strokeCircle(x, y, ringRadius);
    this.markerGraphics.fillStyle(0xdc2626, 1);
    this.markerGraphics.fillCircle(x, y, centerRadius);
    this.markerGraphics.lineStyle(1, 0xffffff, 0.72);
    this.markerGraphics.strokeCircle(x, y, ringRadius + 1);
  }

  private drawPlayerMarker(position: WorldPosition, state: MinimapOverlayState): void {
    const style = MINIMAP_STYLE.markers;
    const x = this.toMinimapX(position.x, state.worldWidth);
    const y = this.toMinimapY(position.y, state.worldHeight);

    this.markerGraphics.lineStyle(2, 0xffffff, 0.95);
    this.markerGraphics.strokeCircle(x, y, style.playerRingRadius);
    this.markerGraphics.lineStyle(1, 0x000000, 0.82);
    this.markerGraphics.strokeCircle(x, y, style.playerOutlineRadius);
    this.markerGraphics.fillStyle(style.playerCenterColor, 1);
    this.markerGraphics.fillCircle(x, y, style.playerCenterRadius);
  }

  private getSlowZoneIconKind(visualType: string | undefined): 'river' | 'swamp' | 'mud' {
    if (visualType === 'river' || visualType === 'mud') {
      return visualType;
    }

    return 'swamp';
  }

  private getDefaultPriority(mechanic: MapMechanicDefinition): number {
    switch (mechanic.type) {
      case 'portal':
        return 20;
      case 'hazard':
        return 18;
      case 'lightSource':
        return 12;
      case 'slowZone':
        return 10;
      case 'obstacle':
        return 8;
      default:
        return 6;
    }
  }

  private toMinimapX(worldX: number, worldWidth: number): number {
    return this.x + Phaser.Math.Clamp(worldX / Math.max(worldWidth, 1), 0, 1) * this.width;
  }

  private toMinimapY(worldY: number, worldHeight: number): number {
    return this.y + Phaser.Math.Clamp(worldY / Math.max(worldHeight, 1), 0, 1) * this.height;
  }

  private getScale(state: MinimapOverlayState): number {
    return Math.min(
      this.width / Math.max(1, state.worldWidth),
      this.height / Math.max(1, state.worldHeight),
    );
  }
}
