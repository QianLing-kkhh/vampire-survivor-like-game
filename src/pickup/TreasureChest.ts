import Phaser from 'phaser';

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
      const lid = scene.add.rectangle(x, y - 8, 32, 8, 0xb45309, 0.95);
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
      body.setDisplaySize(36, 32);

      return body;
    }

    if (scene.textures.exists('treasure_chest')) {
      const body = scene.add.image(x, y, 'treasure_chest');
      body.setDisplaySize(32, 28);

      return body;
    }

    const body = scene.add.rectangle(x, y, 28, 22, 0xf59e0b, 0.95);
    body.setStrokeStyle(2, 0xfef3c7, 0.9);

    return body;
  }
}
