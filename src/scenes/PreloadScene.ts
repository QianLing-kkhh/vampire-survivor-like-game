import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.load.image('player', '/assets/player/player_placeholder.png');
    this.load.image('slime', '/assets/enemy/slime_placeholder.png');
    this.load.image('bat', '/assets/enemy/bat_placeholder.png');
    this.load.image('golem', '/assets/enemy/golem_placeholder.png');
    this.load.image('exp_gem', '/assets/pickup/exp_gem_placeholder.png');
    this.load.image('knife_projectile', '/assets/effects/knife_projectile.png');
    this.load.image(
      'bible_orbit_projectile',
      '/assets/effects/bible_orbit_projectile.png',
    );
  }

  create(): void {
    this.logTextureStatus();
    this.scene.start('TitleScene');
  }

  private logTextureStatus(): void {
    const textureKeys = [
      'player',
      'slime',
      'bat',
      'golem',
      'exp_gem',
      'knife_projectile',
      'bible_orbit_projectile',
    ];

    for (const textureKey of textureKeys) {
      if (this.textures.exists(textureKey)) {
        console.log(`Texture loaded: ${textureKey}`);
        continue;
      }

      console.warn(`Texture not loaded: ${textureKey}`);
    }
  }
}
