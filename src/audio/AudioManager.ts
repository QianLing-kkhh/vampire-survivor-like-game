import Phaser from 'phaser';

import { PlaytestSettings } from '../settings/PlaytestSettings';

export type AudioChannel = 'bgm' | 'sfx' | 'weapon' | 'ui';

export type AudioEventKey =
  | 'enemy_hit'
  | 'enemy_killed'
  | 'player_hit'
  | 'level_up'
  | 'upgrade_selected'
  | 'treasure_open'
  | 'boss_spawn'
  | 'boss_dash'
  | 'victory'
  | 'game_over'
  | 'ui_click'
  | 'ui_hover'
  | 'ui_back'
  | 'ui_confirm'
  | 'title_bgm'
  | 'gameplay_bgm'
  | 'boss_bgm'
  | 'result_bgm'
  | 'knife_attack'
  | 'axe_throw'
  | 'magic_wand_shot'
  | 'bible_orbit_hit'
  | 'garlic_aura_tick'
  | 'thousand_edge_attack'
  | 'holy_wand_shot'
  | 'death_spiral_throw'
  | 'unholy_vespers_hit'
  | 'soul_eater_tick';

interface PlayOptions {
  autoMode?: boolean;
  volume?: number;
  loop?: boolean;
}

export class AudioManager {
  private static readonly SUPPORTED_KEYS: readonly AudioEventKey[] = [
    'title_bgm',
    'gameplay_bgm',
    'boss_bgm',
    'result_bgm',
    'enemy_hit',
    'enemy_killed',
    'player_hit',
    'level_up',
    'upgrade_selected',
    'treasure_open',
    'boss_spawn',
    'boss_dash',
    'victory',
    'game_over',
    'knife_attack',
    'axe_throw',
    'magic_wand_shot',
    'bible_orbit_hit',
    'garlic_aura_tick',
    'thousand_edge_attack',
    'holy_wand_shot',
    'death_spiral_throw',
    'unholy_vespers_hit',
    'soul_eater_tick',
    'ui_click',
    'ui_hover',
    'ui_back',
    'ui_confirm',
  ];
  private static readonly COOLDOWNS_MS: Partial<Record<AudioEventKey, number>> = {
    enemy_hit: 80,
    enemy_killed: 50,
    ui_hover: 120,
    knife_attack: 80,
    thousand_edge_attack: 80,
    axe_throw: 180,
    death_spiral_throw: 140,
    magic_wand_shot: 100,
    holy_wand_shot: 80,
    bible_orbit_hit: 160,
    unholy_vespers_hit: 120,
    garlic_aura_tick: 260,
    soul_eater_tick: 220,
  };
  private static readonly AUTO_MODE_MUTED_KEYS = new Set<AudioEventKey>([
    'enemy_hit',
  ]);
  private static readonly SFX_KEYS = new Set<AudioEventKey>([
    'enemy_hit',
    'enemy_killed',
    'player_hit',
    'level_up',
    'upgrade_selected',
    'treasure_open',
    'boss_spawn',
    'boss_dash',
    'victory',
    'game_over',
  ]);
  private static readonly WEAPON_KEYS = new Set<AudioEventKey>([
    'knife_attack',
    'axe_throw',
    'magic_wand_shot',
    'bible_orbit_hit',
    'garlic_aura_tick',
    'thousand_edge_attack',
    'holy_wand_shot',
    'death_spiral_throw',
    'unholy_vespers_hit',
    'soul_eater_tick',
  ]);
  private static readonly UI_KEYS = new Set<AudioEventKey>([
    'ui_click',
    'ui_hover',
    'ui_back',
    'ui_confirm',
  ]);
  private static readonly lastPlayedAt = new Map<AudioEventKey, number>();
  private static currentBgm?: Phaser.Sound.BaseSound;
  private static currentBgmKey?: string;

  static getSupportedKeys(): readonly AudioEventKey[] {
    return AudioManager.SUPPORTED_KEYS;
  }

  static play(
    scene: Phaser.Scene,
    key: AudioEventKey,
    options: PlayOptions = {},
  ): void {
    if (AudioManager.WEAPON_KEYS.has(key)) {
      AudioManager.playWeapon(scene, key, options);
      return;
    }

    if (AudioManager.UI_KEYS.has(key)) {
      AudioManager.playUi(scene, key, options);
      return;
    }

    if (key.endsWith('_bgm')) {
      AudioManager.playBgm(scene, key, options);
      return;
    }

    AudioManager.playSfx(scene, key, options);
  }

  static playSfx(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.playOnChannel(scene, key, 'sfx', options);
  }

  static playWeapon(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.playOnChannel(scene, key, 'weapon', options);
  }

  static playUi(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.playOnChannel(scene, key, 'ui', options);
  }

  static playBgm(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      AudioManager.stopBgm();
      return;
    }

    if (!scene.cache.audio.exists(key)) {
      return;
    }

    if (AudioManager.currentBgmKey === key && AudioManager.currentBgm?.isPlaying) {
      return;
    }

    AudioManager.stopBgm();
    AudioManager.currentBgmKey = key;
    AudioManager.currentBgm = scene.sound.add(key, {
      loop: options.loop ?? true,
      volume: AudioManager.getChannelVolume('bgm') * (options.volume ?? 1),
    });
    AudioManager.currentBgm.play();
  }

  static stopBgm(): void {
    if (AudioManager.currentBgm) {
      AudioManager.currentBgm.stop();
      AudioManager.currentBgm.destroy();
    }

    AudioManager.currentBgm = undefined;
    AudioManager.currentBgmKey = undefined;
  }

  static pauseBgm(): void {
    AudioManager.currentBgm?.pause();
  }

  static resumeBgm(): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      return;
    }

    AudioManager.currentBgm?.resume();
  }

  static setChannelVolume(channel: AudioChannel, volume: number): void {
    PlaytestSettings.setAudioChannelVolume(channel, volume);

    if (channel === 'bgm' && AudioManager.currentBgm) {
      AudioManager.currentBgm.setVolume(AudioManager.getChannelVolume('bgm'));
    }
  }

  static getChannelVolume(channel: AudioChannel): number {
    const settings = PlaytestSettings.get();

    switch (channel) {
      case 'bgm':
        return settings.bgmVolume;
      case 'sfx':
        return settings.sfxVolume;
      case 'weapon':
        return settings.weaponVolume;
      case 'ui':
        return settings.uiVolume;
      default:
        return 0;
    }
  }

  static isAudioEnabled(): boolean {
    return PlaytestSettings.get().audioEnabled;
  }

  static setAudioEnabled(enabled: boolean): void {
    PlaytestSettings.setAudioEnabled(enabled);

    if (!enabled) {
      AudioManager.stopBgm();
    }
  }

  private static playOnChannel(
    scene: Phaser.Scene,
    key: AudioEventKey,
    channel: AudioChannel,
    options: PlayOptions,
  ): void {
    const volume = AudioManager.getChannelVolume(channel);

    if (!AudioManager.isAudioEnabled() || volume <= 0) {
      return;
    }

    if (options.autoMode && AudioManager.AUTO_MODE_MUTED_KEYS.has(key)) {
      return;
    }

    if (!AudioManager.canPlay(scene, key)) {
      return;
    }

    scene.sound.play(key, {
      volume: volume * (options.volume ?? 1),
    });
    AudioManager.lastPlayedAt.set(key, scene.time.now);
  }

  private static canPlay(scene: Phaser.Scene, key: AudioEventKey): boolean {
    if (!scene.cache.audio.exists(key)) {
      return false;
    }

    const cooldownMs = AudioManager.COOLDOWNS_MS[key] ?? 0;

    if (cooldownMs <= 0) {
      return true;
    }

    const lastPlayedAt = AudioManager.lastPlayedAt.get(key) ?? -Infinity;

    return scene.time.now - lastPlayedAt >= cooldownMs;
  }
}
