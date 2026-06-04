import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { VisualScale } from '../visual/VisualScale';

import { WorldConfig, WorldRenderConfig } from './WorldConfig';

type LandmarkType = 'tree' | 'rock' | 'grave';

export class WorldRenderer {
  private static readonly GRID_COLOR = 0x1f2937;
  private static readonly LANDMARK_TYPES: LandmarkType[] = ['tree', 'rock', 'grave'];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly config: WorldRenderConfig = WorldConfig,
  ) {}

  render(): void {
    this.renderBackground();
    this.renderGrid();
    this.renderLandmarks();
  }

  private renderBackground(): void {
    const groundTextureKey = AssetKeyResolver.getWorldTileTextureKey(this.scene, 'ground_tile');

    if (groundTextureKey) {
      const background = this.scene.add.tileSprite(
        this.config.width / 2,
        this.config.height / 2,
        this.config.width,
        this.config.height,
        groundTextureKey,
      );

      background.setDepth(-100);
      return;
    }

    const background = this.scene.add.rectangle(
      this.config.width / 2,
      this.config.height / 2,
      this.config.width,
      this.config.height,
      0x111827,
    );

    background.setDepth(-100);
  }

  private renderGrid(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-90);
    graphics.lineStyle(1, WorldRenderer.GRID_COLOR, 0.35);

    for (let x = 0; x <= this.config.width; x += this.config.gridSize) {
      graphics.lineBetween(x, 0, x, this.config.height);
    }

    for (let y = 0; y <= this.config.height; y += this.config.gridSize) {
      graphics.lineBetween(0, y, this.config.width, y);
    }
  }

  private renderLandmarks(): void {
    let landmarkIndex = 0;

    for (
      let x = this.config.landmarkSpacing;
      x < this.config.width;
      x += this.config.landmarkSpacing
    ) {
      for (
        let y = this.config.landmarkSpacing;
        y < this.config.height;
        y += this.config.landmarkSpacing
      ) {
        const type = WorldRenderer.LANDMARK_TYPES[
          landmarkIndex % WorldRenderer.LANDMARK_TYPES.length
        ];

        this.renderLandmark(type, x, y);
        landmarkIndex += 1;
      }
    }
  }

  private renderLandmark(type: LandmarkType, x: number, y: number): void {
    switch (type) {
      case 'tree':
        this.renderTree(x, y);
        break;
      case 'rock':
        this.renderRock(x, y);
        break;
      case 'grave':
        this.renderGrave(x, y);
        break;
    }
  }

  private renderTree(x: number, y: number): void {
    const textureKey = AssetKeyResolver.getWorldLandmarkTextureKey(this.scene, 'tree');

    if (textureKey) {
      const tree = this.scene.add.image(x, y, textureKey);
      const displaySize = VisualScale.getLandmarkDisplaySize('tree');
      tree.setDisplaySize(displaySize, displaySize);
      tree.setDepth(-79);
      return;
    }

    const displaySize = VisualScale.getLandmarkDisplaySize('tree');
    const trunk = this.scene.add.rectangle(
      x,
      y + displaySize * 0.16,
      displaySize * 0.13,
      displaySize * 0.3,
      0x7c2d12,
    );
    const leaves = this.scene.add.circle(x, y - displaySize * 0.05, displaySize * 0.3, 0x166534, 0.9);

    trunk.setDepth(-80);
    leaves.setDepth(-79);
  }

  private renderRock(x: number, y: number): void {
    const textureKey = AssetKeyResolver.getWorldLandmarkTextureKey(this.scene, 'rock');

    if (textureKey) {
      const rockImage = this.scene.add.image(x, y, textureKey);
      const displaySize = VisualScale.getLandmarkDisplaySize('rock');
      rockImage.setDisplaySize(displaySize, displaySize);
      rockImage.setDepth(-80);
      return;
    }

    const displaySize = VisualScale.getLandmarkDisplaySize('rock');
    const rock = this.scene.add.ellipse(
      x,
      y,
      displaySize * 0.82,
      displaySize * 0.56,
      0x64748b,
      0.9,
    );

    rock.setStrokeStyle(2, 0x94a3b8, 0.5);
    rock.setDepth(-80);
  }

  private renderGrave(x: number, y: number): void {
    const textureKey = AssetKeyResolver.getWorldLandmarkTextureKey(this.scene, 'grave');

    if (textureKey) {
      const graveImage = this.scene.add.image(x, y, textureKey);
      const displaySize = VisualScale.getLandmarkDisplaySize('grave');
      graveImage.setDisplaySize(displaySize, displaySize);
      graveImage.setDepth(-80);
      return;
    }

    const displaySize = VisualScale.getLandmarkDisplaySize('grave');
    const grave = this.scene.add.rectangle(
      x,
      y,
      displaySize * 0.42,
      displaySize * 0.62,
      0x6b7280,
      0.9,
    );
    const top = this.scene.add.circle(
      x,
      y - displaySize * 0.28,
      displaySize * 0.21,
      0x6b7280,
      0.9,
    );

    grave.setStrokeStyle(2, 0x9ca3af, 0.5);
    top.setStrokeStyle(2, 0x9ca3af, 0.5);
    grave.setDepth(-80);
    top.setDepth(-79);
  }
}
