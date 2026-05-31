import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
