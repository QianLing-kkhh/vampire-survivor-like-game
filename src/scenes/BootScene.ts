import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    AudioManager.initializeLifecycle();
    this.scene.start('TitlePreloadScene');
  }
}
