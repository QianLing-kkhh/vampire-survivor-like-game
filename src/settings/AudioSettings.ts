export interface AudioSettingsData {
  audioEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
  weaponVolume: number;
  uiVolume: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettingsData = {
  audioEnabled: false,
  bgmVolume: 0,
  sfxVolume: 0,
  weaponVolume: 0,
  uiVolume: 0,
};
