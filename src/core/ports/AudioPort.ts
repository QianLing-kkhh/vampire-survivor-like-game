export type AudioChannel = 'master' | 'music' | 'sfx' | string;

export interface SoundPlaybackOptions {
  volume?: number;
  rate?: number;
  loop?: boolean;
}

export interface MusicPlaybackOptions extends SoundPlaybackOptions {
  fadeInMs?: number;
  restart?: boolean;
}

export interface AudioPort {
  playSound(id: string, options?: SoundPlaybackOptions): void;
  playMusic(id: string, options?: MusicPlaybackOptions): void;
  stopMusic(options?: { fadeOutMs?: number }): void;
  setVolume(channel: AudioChannel, volume: number): void;
}
