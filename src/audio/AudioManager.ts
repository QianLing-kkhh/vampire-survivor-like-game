import Phaser from 'phaser';

import { PlaytestSettings } from '../settings/PlaytestSettings';

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
  | 'ui_click';

interface PlayOptions {
  autoMode?: boolean;
  volume?: number;
}

export class AudioManager {
  private static readonly SUPPORTED_KEYS: readonly AudioEventKey[] = [
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
    'ui_click',
  ];
  private static readonly COOLDOWNS_MS: Partial<Record<AudioEventKey, number>> = {
    enemy_hit: 80,
    enemy_killed: 50,
  };
  private static readonly AUTO_MODE_MUTED_KEYS = new Set<AudioEventKey>([
    'enemy_hit',
  ]);
  private static readonly lastPlayedAt = new Map<AudioEventKey, number>();

  static getSupportedKeys(): readonly AudioEventKey[] {
    return AudioManager.SUPPORTED_KEYS;
  }

  static play(
    scene: Phaser.Scene,
    key: AudioEventKey,
    options: PlayOptions = {},
  ): void {
    if (!PlaytestSettings.get().soundEnabled) {
      return;
    }

    if (options.autoMode && AudioManager.AUTO_MODE_MUTED_KEYS.has(key)) {
      return;
    }

    if (!AudioManager.canPlay(scene, key)) {
      return;
    }

    scene.sound.play(key, {
      volume: options.volume ?? 0.7,
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
