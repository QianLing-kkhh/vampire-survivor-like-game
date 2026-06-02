import Phaser from 'phaser';

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
    const trunk = this.scene.add.rectangle(x, y + 12, 10, 24, 0x7c2d12);
    const leaves = this.scene.add.circle(x, y - 4, 24, 0x166534, 0.9);

    trunk.setDepth(-80);
    leaves.setDepth(-79);
  }

  private renderRock(x: number, y: number): void {
    const rock = this.scene.add.ellipse(x, y, 44, 30, 0x64748b, 0.9);

    rock.setStrokeStyle(2, 0x94a3b8, 0.5);
    rock.setDepth(-80);
  }

  private renderGrave(x: number, y: number): void {
    const grave = this.scene.add.rectangle(x, y, 30, 44, 0x6b7280, 0.9);
    const top = this.scene.add.circle(x, y - 20, 15, 0x6b7280, 0.9);

    grave.setStrokeStyle(2, 0x9ca3af, 0.5);
    top.setStrokeStyle(2, 0x9ca3af, 0.5);
    grave.setDepth(-80);
    top.setDepth(-79);
  }
}

