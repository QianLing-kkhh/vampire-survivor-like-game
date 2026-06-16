import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import {
  MapAltarDefinition,
  MapLightSourceDefinition,
  MapObstacleDefinition,
  MapPortalDefinition,
  MapSlowZoneDefinition,
} from '../map/mechanics/MapMechanicDefinition';
import { MapMechanicContext } from '../map/mechanics/MapMechanicContext';
import { VisualScale } from '../visual/VisualScale';

export class MapMechanicVisualRenderer {
  static renderSlowZone(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    switch (definition.visualType) {
      case 'river':
        return this.renderRiver(context, definition, shape, width, height, radius);
      case 'ink':
        return this.renderInk(context, definition, shape, width, height, radius);
      case 'mud':
        return this.renderMud(context, definition, shape, width, height, radius);
      case 'swamp':
      default:
        return this.renderSwamp(context, definition, shape, width, height, radius);
    }
  }

  static renderPortal(
    context: MapMechanicContext,
    definition: MapPortalDefinition,
  ): Phaser.GameObjects.GameObject[] {
    const kind = definition.visualType === 'gold'
      ? 'portalGold'
      : definition.visualType === 'green'
      ? 'portalGreen'
      : definition.visualType === 'purple'
        ? 'portalPurple'
        : 'portalBlue';
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, kind);
    const color = this.getPortalColor(definition.visualType);
    const glow = context.scene.add.circle(definition.x, definition.y, definition.radius, color, 0.14);

    glow.setStrokeStyle(4, color, 0.55);
    glow.setDepth(-66);

    if (textureKey) {
      const image = context.scene.add.image(definition.x, definition.y, textureKey);
      image.setDisplaySize(definition.radius * 1.8, definition.radius * 1.8);
      image.setDepth(-65);
      return [glow, image];
    }

    const ring = context.scene.add.circle(
      definition.x,
      definition.y,
      definition.radius * 0.72,
      color,
      0.08,
    );

    ring.setStrokeStyle(3, 0xffffff, 0.42);
    ring.setDepth(-65);
    return [glow, ring];
  }

  static renderLightSource(
    context: MapMechanicContext,
    definition: MapLightSourceDefinition,
  ): Phaser.GameObjects.GameObject[] {
    const color = this.getLightColor(definition.visualType);
    const glow = context.scene.add.circle(
      definition.x,
      definition.y,
      definition.radius,
      color,
      0.08 * (definition.intensity ?? 1),
    );
    const kind = definition.visualType === 'torch'
      ? 'lightTorch'
      : definition.visualType === 'crystal'
        ? 'lightCrystal'
        : definition.visualType === 'candle'
          ? 'lightCandle'
          : definition.visualType === 'arcaneLamp'
            ? 'lightArcaneLamp'
        : 'lightLamp';
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, kind);

    glow.setDepth(-64);

    if (textureKey) {
      const image = context.scene.add.image(definition.x, definition.y, textureKey);
      image.setDisplaySize(84, 84);
      image.setDepth(-62);
      return [glow, image];
    }

    const core = context.scene.add.circle(definition.x, definition.y, 16, color, 0.8);
    const post = context.scene.add.rectangle(
      definition.x,
      definition.y + 24,
      8,
      48,
      0x292524,
      0.95,
    );

    post.setDepth(-63);
    core.setDepth(-62);
    return [glow, post, core];
  }

  static renderObstacle(
    context: MapMechanicContext,
    definition: MapObstacleDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
  ): Phaser.GameObjects.GameObject[] {
    const visualType = definition.visualType ?? 'rock';
    const kind = visualType === 'tree'
      ? 'obstacleTree'
      : visualType === 'grave'
        ? 'obstacleGrave'
        : visualType === 'wall'
          ? 'obstacleWall'
          : visualType === 'cathedralWall'
            ? 'obstacleCathedralWall'
            : visualType === 'cathedralPillar'
              ? 'obstacleCathedralPillar'
              : visualType === 'bookshelf'
                ? 'obstacleBookshelf'
                : visualType === 'archivePillar'
                  ? 'obstacleArchivePillar'
          : 'obstacleRock';
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, kind);

    if (textureKey) {
      const image = context.scene.add.image(definition.x, definition.y, textureKey);
      const displaySize = this.getObstacleDisplaySize(visualType);

      image.setDisplaySize(
        Math.max(width, displaySize),
        Math.max(height, displaySize),
      );
      image.setDepth(-72);
      return [image];
    }

    const object = shape === 'circle'
      ? context.scene.add.circle(definition.x, definition.y, Math.max(width, height) / 2, 0x475569, 0.92)
      : context.scene.add.rectangle(definition.x, definition.y, width, height, 0x475569, 0.92);

    object.setDepth(-72);
    object.setStrokeStyle(2, 0x94a3b8, 0.45);
      return [object];
  }

  static renderAltar(
    context: MapMechanicContext,
    definition: MapAltarDefinition,
  ): {
    objects: Phaser.GameObjects.GameObject[];
    range: Phaser.GameObjects.Arc;
    progress: Phaser.GameObjects.Arc;
    core?: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
  } {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const altarKind = definition.visualType === 'library' ? 'altarLibrary' : 'altarCathedral';
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, altarKind)
      ?? AssetKeyResolver.getMapMechanicTextureKey(context.scene, 'altar');
    const range = context.scene.add.circle(definition.x, definition.y, definition.radius, 0xc4b5fd, 0.08);
    const progress = context.scene.add.circle(definition.x, definition.y, definition.radius + 8, 0xc4b5fd, 0);

    range.setStrokeStyle(2, 0xc4b5fd, 0.24);
    range.setDepth(-64);
    progress.setStrokeStyle(4, 0xfacc15, 0);
    progress.setDepth(-61);
    objects.push(range, progress);

    if (textureKey) {
      const image = context.scene.add.image(definition.x, definition.y, textureKey);
      image.setDisplaySize(132, 132);
      image.setDepth(-62);
      objects.push(image);
      return { objects, range, progress, core: image };
    }

    const base = context.scene.add.circle(definition.x, definition.y, 42, 0x4c1d95, 0.92);
    base.setStrokeStyle(3, 0xfacc15, 0.72);
    base.setDepth(-62);
    objects.push(base);
    return { objects, range, progress, core: base };
  }

  private static renderRiver(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    if (shape === 'circle') {
      return this.renderSwamp(context, definition, shape, width, height, radius);
    }

    const objects: Phaser.GameObjects.GameObject[] = [];
    const visualWidth = this.getEdgeExtendedWidth(context, definition, width);
    const bankTexture = this.getTextureIfLoaded(context, 'art_map_mechanics_river_bank');
    const waterTexture = AssetKeyResolver.getMapMechanicTextureKey(context.scene, 'river');
    const rippleTexture = this.getTextureIfLoaded(context, 'art_map_mechanics_river_ripple');

    if (bankTexture) {
      const bank = context.scene.add.tileSprite(definition.x, definition.y, visualWidth + 68, height + 68, bankTexture);
      bank.setDepth(-87);
      bank.setAlpha(0.78);
      objects.push(bank);
    }

    if (waterTexture) {
      const water = context.scene.add.tileSprite(definition.x, definition.y, visualWidth, height, waterTexture);
      water.setDepth(-86);
      water.setAlpha(0.84);
      objects.push(water);

      if (rippleTexture) {
        const rippleCount = Math.max(3, Math.min(7, Math.round(visualWidth / 420)));

        for (let index = 0; index < rippleCount; index += 1) {
          const ripple = context.scene.add.image(
            definition.x - visualWidth / 2 + visualWidth * ((index + 0.5) / rippleCount),
            definition.y - height * 0.22 + (index % 3) * height * 0.22,
            rippleTexture,
          );

          ripple.setDisplaySize(120, 48);
          ripple.setDepth(-85);
          ripple.setAlpha(0.55);
          ripple.setRotation(-0.16);
          objects.push(ripple);
        }
      }

      return objects;
    }

    return [this.renderRiverFallback(context, definition, visualWidth, height)];
  }

  private static renderSwamp(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, 'swamp');

    if (!textureKey) {
      return [this.renderSoftTerrainFallback(context, definition, shape, width, height, radius, {
        bankColor: 0x102d21,
        fillColor: 0x1f5f46,
        accentColor: 0x78d59b,
      })];
    }

    const image = context.scene.add.image(definition.x, definition.y, textureKey);
    const displaySize = shape === 'circle' ? radius * 2 : Math.max(width, height);
    image.setDisplaySize(displaySize, displaySize);
    image.setDepth(-86);
    image.setAlpha(0.82);
    return [image];
  }

  private static renderMud(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, 'mud');

    if (!textureKey) {
      return [this.renderSoftTerrainFallback(context, definition, shape, width, height, radius, {
        bankColor: 0x3b2614,
        fillColor: 0x6b4a24,
        accentColor: 0xc0843f,
      })];
    }

    const image = context.scene.add.image(definition.x, definition.y, textureKey);
    image.setDisplaySize(shape === 'circle' ? radius * 2 : width, shape === 'circle' ? radius * 2 : height);
    image.setDepth(-86);
    image.setAlpha(0.76);
    return [image];
  }

  private static renderInk(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
  ): Phaser.GameObjects.GameObject[] {
    const textureKey = AssetKeyResolver.getMapMechanicTextureKey(context.scene, 'ink');

    if (!textureKey) {
      return [this.renderSoftTerrainFallback(context, definition, shape, width, height, radius, {
        bankColor: 0x0f172a,
        fillColor: 0x312e81,
        accentColor: 0xa78bfa,
      })];
    }

    const image = context.scene.add.image(definition.x, definition.y, textureKey);
    image.setDisplaySize(shape === 'circle' ? radius * 2 : width, shape === 'circle' ? radius * 2 : height);
    image.setDepth(-86);
    image.setAlpha(0.78);
    return [image];
  }

  private static renderRiverFallback(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    width: number,
    height: number,
  ): Phaser.GameObjects.Graphics {
    const graphics = context.scene.add.graphics();
    const left = definition.x - width / 2;
    const top = definition.y - height / 2;
    const bankPad = 34;

    graphics.setDepth(-86);
    graphics.fillStyle(0x153525, 0.42);
    graphics.fillRoundedRect(left - bankPad, top - bankPad, width + bankPad * 2, height + bankPad * 2, Math.min(120, height / 2 + bankPad));
    graphics.fillStyle(0x3b2f1f, 0.26);
    graphics.fillRoundedRect(left - bankPad / 2, top - bankPad / 2, width + bankPad, height + bankPad, Math.min(96, height / 2));
    graphics.fillStyle(0x1f6f78, 0.56);
    graphics.fillRoundedRect(left, top, width, height, Math.min(96, height / 2));
    graphics.lineStyle(3, 0x9be7dc, 0.25);

    for (let index = 0; index < Math.max(4, Math.min(8, Math.round(width / 360))); index += 1) {
      const progress = (index + 0.5) / Math.max(4, Math.min(8, Math.round(width / 360)));
      const rippleX = left + width * progress;
      const rippleY = top + height * (0.28 + (index % 3) * 0.18);

      graphics.lineBetween(rippleX - 82, rippleY + (index % 2) * 8, rippleX + 82, rippleY - 18);
    }

    return graphics;
  }

  private static renderSoftTerrainFallback(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    shape: 'circle' | 'rect',
    width: number,
    height: number,
    radius: number,
    colors: { bankColor: number; fillColor: number; accentColor: number },
  ): Phaser.GameObjects.Graphics {
    const graphics = context.scene.add.graphics();

    graphics.setDepth(-86);

    if (shape === 'circle') {
      graphics.fillStyle(colors.bankColor, 0.42);
      graphics.fillCircle(definition.x, definition.y, radius + 24);
      graphics.fillStyle(colors.fillColor, 0.46);
      graphics.fillCircle(definition.x, definition.y, radius);
      graphics.lineStyle(2, colors.accentColor, 0.24);
      graphics.strokeCircle(definition.x - radius * 0.2, definition.y, radius * 0.16);
      graphics.strokeCircle(definition.x + radius * 0.2, definition.y + radius * 0.12, radius * 0.2);
      return graphics;
    }

    const left = definition.x - width / 2;
    const top = definition.y - height / 2;

    graphics.fillStyle(colors.bankColor, 0.34);
    graphics.fillRoundedRect(left - 20, top - 20, width + 40, height + 40, Math.min(100, height / 2 + 20));
    graphics.fillStyle(colors.fillColor, 0.34);
    graphics.fillRoundedRect(left, top, width, height, Math.min(80, height / 2));
    graphics.fillStyle(colors.accentColor, 0.18);

    for (let index = 0; index < 8; index += 1) {
      graphics.fillCircle(
        left + width * ((index + 1) / 9),
        top + height * (0.28 + (index % 3) * 0.2),
        8 + (index % 3) * 4,
      );
    }

    return graphics;
  }

  private static getEdgeExtendedWidth(
    context: MapMechanicContext,
    definition: MapSlowZoneDefinition,
    width: number,
  ): number {
    const left = definition.x - width / 2;
    const right = definition.x + width / 2;
    let visualWidth = width;

    if (left <= 80) {
      visualWidth += 240;
    }

    if (right >= context.worldWidth - 80) {
      visualWidth += 240;
    }

    return visualWidth;
  }

  private static getTextureIfLoaded(context: MapMechanicContext, key: string): string | undefined {
    return context.scene.textures.exists(key) ? key : undefined;
  }

  private static getObstacleDisplaySize(visualType: MapObstacleDefinition['visualType']): number {
    switch (visualType) {
      case 'wall':
      case 'cathedralWall':
      case 'bookshelf':
        return 96;
      case 'cathedralPillar':
      case 'archivePillar':
        return 118;
      case 'tree':
      case 'grave':
      case 'rock':
      default:
        return VisualScale.getLandmarkDisplaySize(visualType ?? 'rock');
    }
  }

  private static getPortalColor(visualType: MapPortalDefinition['visualType']): number {
    switch (visualType) {
      case 'gold':
        return 0xfacc15;
      case 'green':
        return 0x22c55e;
      case 'purple':
        return 0xa855f7;
      case 'blue':
      default:
        return 0x38bdf8;
    }
  }

  private static getLightColor(visualType: MapLightSourceDefinition['visualType']): number {
    switch (visualType) {
      case 'candle':
        return 0xfacc15;
      case 'arcaneLamp':
        return 0x818cf8;
      case 'crystal':
        return 0x93c5fd;
      case 'torch':
        return 0xf97316;
      case 'lamp':
      default:
        return 0xfacc15;
    }
  }
}
