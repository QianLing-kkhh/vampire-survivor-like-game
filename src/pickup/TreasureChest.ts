import Phaser from 'phaser';

import { VisualScale } from '../visual/VisualScale';

export class TreasureChest {
  readonly body: Phaser.GameObjects.GameObject & {
    x: number;
    y: number;
    destroy: () => void;
    getData: (key: string) => unknown;
    setData: (key: string, value: unknown) => void;
    setDepth: (value: number) => void;
  };
  isOpened = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.body = this.createBody(scene, x, y);
    this.body.setDepth(12);

    if (
      !scene.textures.exists('art_pickups_treasure_chest')
      && !scene.textures.exists('treasure_chest')
    ) {
      const lid = scene.add.rectangle(
        x,
        y - VisualScale.treasureDisplayHeight * 0.28,
        VisualScale.treasureDisplayWidth,
        VisualScale.treasureDisplayHeight * 0.24,
        0xb45309,
        0.95,
      );
      lid.setStrokeStyle(1, 0xfef3c7, 0.8);
      lid.setDepth(13);
      this.body.setData('lid', lid);
    }
  }

  open(): void {
    if (this.isOpened) {
      return;
    }

    this.isOpened = true;
    this.destroy();
  }

  destroy(): void {
    const lid = this.body.getData('lid') as Phaser.GameObjects.Rectangle | undefined;

    lid?.destroy();
    this.body.destroy();
  }

  private createBody(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): TreasureChest['body'] {
    if (scene.textures.exists('art_pickups_treasure_chest')) {
      const body = scene.add.image(x, y, 'art_pickups_treasure_chest');
      body.setDisplaySize(VisualScale.treasureDisplayWidth, VisualScale.treasureDisplayHeight);

      return body;
    }

    if (scene.textures.exists('treasure_chest')) {
      const body = scene.add.image(x, y, 'treasure_chest');
      body.setDisplaySize(VisualScale.treasureDisplayWidth, VisualScale.treasureDisplayHeight);

      return body;
    }

    const body = scene.add.rectangle(
      x,
      y,
      VisualScale.treasureDisplayWidth,
      VisualScale.treasureDisplayHeight * 0.78,
      0xf59e0b,
      0.95,
    );
    body.setStrokeStyle(2, 0xfef3c7, 0.9);

    return body;
  }
}
