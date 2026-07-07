import Phaser from 'phaser';

import { UIBlockingNotice } from './components/UIBlockingNotice';

export class OrientationOverlayController {
  private overlay?: UIBlockingNotice;

  constructor(private readonly scene: Phaser.Scene) {}

  create(): void {
    this.overlay = UIBlockingNotice.createRotateNotice(this.scene);
  }

  update(): boolean {
    const shouldShow = this.shouldShow();

    this.overlay?.setVisible(shouldShow);
    return shouldShow;
  }

  resize(): boolean {
    this.overlay?.resize(this.scene.scale.width, this.scene.scale.height);
    return this.update();
  }

  destroy(): void {
    this.overlay?.destroy();
    this.overlay = undefined;
  }

  private shouldShow(): boolean {
    return this.isTouchOrNarrowScreen()
      && this.scene.scale.height > this.scene.scale.width;
  }

  private isTouchOrNarrowScreen(): boolean {
    const phaserTouch = this.scene.sys.game.device.input.touch;
    const hasTouch = (globalThis.navigator?.maxTouchPoints ?? 0) > 0;
    const hasCoarsePointer = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
    const isNarrowWindow = (globalThis.innerWidth ?? this.scene.scale.width) <= 900
      || (globalThis.innerHeight ?? this.scene.scale.height) <= 900;

    return phaserTouch || hasTouch || hasCoarsePointer || isNarrowWindow;
  }
}
