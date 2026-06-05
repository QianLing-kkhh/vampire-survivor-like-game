import Phaser from 'phaser';

export interface ShadowHost {
  shadow?: Phaser.GameObjects.Ellipse;
  updateShadow?(): void;
  destroyShadow?(): void;
}
