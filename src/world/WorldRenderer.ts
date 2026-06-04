import Phaser from 'phaser';

import { VisualScale } from '../visual/VisualScale';

import { WorldConfig } from './WorldConfig';

type LandmarkType = 'tree' | 'rock' | 'grave';

export class WorldRenderer {
  private static readonly GRID_COLOR = 0x1f2937;
  private static readonly LANDMARK_TYPES: LandmarkType[] = ['tree', 'rock', 'grave'];

  constructor(private readonly scene: Phaser.Scene) {}

  render(): void {
    this.renderBackground();
    this.renderGrid();
    this.renderLandmarks();
  }

  private renderBackground(): void {
    if (this.scene.textures.exists('art_world_ground_tile')) {
      const background = this.scene.add.tileSprite(
        WorldConfig.width / 2,
        WorldConfig.height / 2,
        WorldConfig.width,
        WorldConfig.height,
        'art_world_ground_tile',
      );

      background.setDepth(-100);
      return;
    }

    const background = this.scene.add.rectangle(
      WorldConfig.width / 2,
      WorldConfig.height / 2,
      WorldConfig.width,
      WorldConfig.height,
      0x111827,
    );

    background.setDepth(-100);
  }

  private renderGrid(): void {
    const graphics = this.scene.add.graphics();
    graphics.setDepth(-90);
    graphics.lineStyle(1, WorldRenderer.GRID_COLOR, 0.35);

    for (let x = 0; x <= WorldConfig.width; x += WorldConfig.gridSize) {
      graphics.lineBetween(x, 0, x, WorldConfig.height);
    }

    for (let y = 0; y <= WorldConfig.height; y += WorldConfig.gridSize) {
      graphics.lineBetween(0, y, WorldConfig.width, y);
    }
  }

  private renderLandmarks(): void {
    let landmarkIndex = 0;

    for (
      let x = WorldConfig.landmarkSpacing;
      x < WorldConfig.width;
      x += WorldConfig.landmarkSpacing
    ) {
      for (
        let y = WorldConfig.landmarkSpacing;
        y < WorldConfig.height;
        y += WorldConfig.landmarkSpacing
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
    if (this.scene.textures.exists('art_world_tree_landmark')) {
      const tree = this.scene.add.image(x, y, 'art_world_tree_landmark');
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
    if (this.scene.textures.exists('art_world_rock_landmark')) {
      const rockImage = this.scene.add.image(x, y, 'art_world_rock_landmark');
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
    if (this.scene.textures.exists('art_world_grave_landmark')) {
      const graveImage = this.scene.add.image(x, y, 'art_world_grave_landmark');
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
