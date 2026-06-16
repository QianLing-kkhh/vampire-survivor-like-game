import Phaser from 'phaser';

import type {
  AudioChannel,
  AudioPort,
  MusicPlaybackOptions,
  SoundPlaybackOptions,
} from '../core/ports/AudioPort';
import { AudioManager, type AudioEventKey } from './AudioManager';

export class PhaserAudioAdapter implements AudioPort {
  constructor(private readonly scene: Phaser.Scene) {}

  playSound(id: string, options: SoundPlaybackOptions = {}): void {
    AudioManager.play(this.scene, id as AudioEventKey, {
      volume: options.volume,
      loop: options.loop,
    });
  }

  playMusic(id: string, options: MusicPlaybackOptions = {}): void {
    AudioManager.playBgm(this.scene, id as AudioEventKey, {
      volume: options.volume,
      loop: options.loop,
    });
  }

  stopMusic(): void {
    AudioManager.stopBgm();
  }

  setVolume(channel: AudioChannel, volume: number): void {
    AudioManager.setChannelVolume(this.toPhaserChannel(channel), volume);
  }

  private toPhaserChannel(channel: AudioChannel): 'bgm' | 'sfx' | 'weapon' | 'ui' {
    switch (channel) {
      case 'music':
        return 'bgm';
      case 'master':
        return 'sfx';
      case 'bgm':
      case 'sfx':
      case 'weapon':
      case 'ui':
        return channel;
      default:
        return 'sfx';
    }
  }
}
