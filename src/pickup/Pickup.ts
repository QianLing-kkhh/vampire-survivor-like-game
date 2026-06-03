import Phaser from 'phaser';

type PickupBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  destroy: () => void;
};

export class Pickup {
  readonly body: PickupBody;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly exp: number,
  ) {
    this.body = this.createBody(scene, x, y);
  }

  collect(): number {
    this.body.destroy();
    return this.exp;
  }

  private createBody(scene: Phaser.Scene, x: number, y: number): PickupBody {
    if (scene.textures.exists('art_pickups_exp_gem')) {
      const body = scene.add.image(x, y, 'art_pickups_exp_gem');
      body.setDisplaySize(16, 16);

      return body;
    }

    if (!scene.textures.exists('exp_gem')) {
      return scene.add.circle(x, y, 6, 0x38bdf8);
    }

    const body = scene.add.image(x, y, 'exp_gem');
    body.setDisplaySize(14, 14);

    return body;
  }
}
