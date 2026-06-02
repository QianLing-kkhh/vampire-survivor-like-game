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
    this.load.image('hit_flash', '/assets/effects/hit_flash.png');
    this.load.image(
      'bible_orbit_projectile',
      '/assets/effects/bible_orbit_projectile.png',
    );
    this.load.image('axe_projectile', '/assets/images/axe_projectile.png');
    this.load.image('magic_wand_projectile', '/assets/images/magic_wand_projectile.png');
    this.load.image('treasure_chest', '/assets/images/treasure_chest.png');
    this.load.image('boss_lava_beast', '/assets/images/boss_lava_beast.png');
    this.load.image(
      'thousand_edge_projectile',
      '/assets/images/thousand_edge_projectile.png',
    );
    this.load.image('holy_wand_projectile', '/assets/images/holy_wand_projectile.png');
    this.load.image(
      'death_spiral_projectile',
      '/assets/images/death_spiral_projectile.png',
    );
    this.load.image(
      'unholy_vespers_orbit_book',
      '/assets/images/unholy_vespers_orbit_book.png',
    );
    this.load.image('soul_eater_core', '/assets/images/soul_eater_core.png');
    this.load.image('hp_icon', '/assets/ui/hp_icon.png');
    this.load.image('exp_icon', '/assets/ui/exp_icon.png');
    this.load.image('time_icon', '/assets/ui/time_icon.png');
    this.load.image('knife_icon', '/assets/weapons/knife_icon.png');
    this.load.image('garlic_icon', '/assets/weapons/garlic_icon.png');
    this.load.image('bible_icon', '/assets/weapons/bible_icon.png');
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
      'hit_flash',
      'bible_orbit_projectile',
      'axe_projectile',
      'magic_wand_projectile',
      'treasure_chest',
      'boss_lava_beast',
      'thousand_edge_projectile',
      'holy_wand_projectile',
      'death_spiral_projectile',
      'unholy_vespers_orbit_book',
      'soul_eater_core',
      'hp_icon',
      'exp_icon',
      'time_icon',
      'knife_icon',
      'garlic_icon',
      'bible_icon',
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
