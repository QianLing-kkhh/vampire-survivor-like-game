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

interface PendingBgm {
  scene: Phaser.Scene;
  key: AudioEventKey;
  loop: boolean;
  volume: number;
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
    enemy_hit: 180, // Late-game enemy swarms can trigger hundreds of hits per second.
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
  private static readonly soundScenes = new Set<Phaser.Scene>();
  private static currentBgm?: Phaser.Sound.BaseSound;
  private static currentBgmKey?: string;
  private static currentBgmScene?: Phaser.Scene;
  private static pendingBgm?: PendingBgm;
  private static unsubscribeSettings?: () => void;
  private static lifecycleListenersInstalled = false;
  private static hasAudioGesture = false;
  private static isPageHidden = false;
  private static bgmWasPlayingBeforeHidden = false;
  private static suppressSfxUntilMs = 0;

  static initializeLifecycle(): void {
    AudioManager.ensureLifecycleListeners();
  }

  static getSupportedKeys(): readonly AudioEventKey[] {
    AudioManager.ensureSettingsSubscription();

    return AudioManager.SUPPORTED_KEYS;
  }

  static play(
    scene: Phaser.Scene,
    key: AudioEventKey,
    options: PlayOptions = {},
  ): void {
    AudioManager.ensureSettingsSubscription();

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
    AudioManager.ensureSettingsSubscription();
    AudioManager.playOnChannel(scene, key, 'sfx', options);
  }

  static playWeapon(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.ensureSettingsSubscription();
    AudioManager.playOnChannel(scene, key, 'weapon', options);
  }

  static playUi(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.ensureSettingsSubscription();
    AudioManager.playOnChannel(scene, key, 'ui', options);
  }

  static playBgm(scene: Phaser.Scene, key: AudioEventKey, options: PlayOptions = {}): void {
    AudioManager.ensureSettingsSubscription();
    AudioManager.registerSoundScene(scene);

    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      AudioManager.pendingBgm = undefined;
      AudioManager.stopBgm();
      return;
    }

    if (!AudioManager.canStartAudioNow()) {
      AudioManager.rememberPendingBgm(scene, key, options);
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
    AudioManager.pendingBgm = undefined;
    AudioManager.currentBgmKey = key;
    AudioManager.currentBgmScene = scene;
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
    AudioManager.currentBgmScene = undefined;
  }

  static pauseBgm(): void {
    AudioManager.currentBgm?.pause();
  }

  static resumeBgm(): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      return;
    }

    if (!AudioManager.canStartAudioNow()) {
      return;
    }

    AudioManager.currentBgm?.resume();
  }

  static setChannelVolume(channel: AudioChannel, volume: number): void {
    AudioManager.ensureSettingsSubscription();
    PlaytestSettings.setAudioChannelVolume(channel, volume);

    if (channel === 'bgm' && AudioManager.currentBgm) {
      AudioManager.applyCurrentBgmVolume();
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
    AudioManager.ensureSettingsSubscription();
    PlaytestSettings.setAudioEnabled(enabled);

    if (!enabled) {
      AudioManager.stopBgm();
    }
  }

  static getCurrentBgmKey(): string | undefined {
    return AudioManager.currentBgmKey ?? AudioManager.pendingBgm?.key;
  }

  private static playOnChannel(
    scene: Phaser.Scene,
    key: AudioEventKey,
    channel: AudioChannel,
    options: PlayOptions,
  ): void {
    AudioManager.registerSoundScene(scene);

    const volume = AudioManager.getChannelVolume(channel);

    if (!AudioManager.isAudioEnabled() || volume <= 0) {
      return;
    }

    if (!AudioManager.canStartAudioNow() || AudioManager.isSfxSuppressed()) {
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

  private static ensureSettingsSubscription(): void {
    AudioManager.ensureLifecycleListeners();

    if (AudioManager.unsubscribeSettings) {
      return;
    }

    AudioManager.unsubscribeSettings = PlaytestSettings.subscribe((settingName) => {
      if (settingName === 'audioEnabled' && !AudioManager.isAudioEnabled()) {
        AudioManager.stopBgm();
        return;
      }

      if (settingName === 'bgmVolume') {
        if (AudioManager.getChannelVolume('bgm') <= 0) {
          AudioManager.applyCurrentBgmVolume();
          return;
        }

        AudioManager.applyCurrentBgmVolume();
      }
    });
  }

  private static applyCurrentBgmVolume(): void {
    if (!AudioManager.currentBgm) {
      return;
    }

    const bgm = AudioManager.currentBgm as Phaser.Sound.BaseSound & {
      setVolume?: (volume: number) => Phaser.Sound.BaseSound;
      volume?: number;
    };
    const bgmVolume = AudioManager.getChannelVolume('bgm');

    if (bgm.setVolume) {
      bgm.setVolume(bgmVolume);
    } else {
      bgm.volume = bgmVolume;
    }
  }

  private static ensureLifecycleListeners(): void {
    if (AudioManager.lifecycleListenersInstalled) {
      return;
    }

    AudioManager.lifecycleListenersInstalled = true;
    AudioManager.isPageHidden = !AudioManager.hasForegroundFocus();

    const documentRef = globalThis.document;
    const windowRef = globalThis.window;

    documentRef?.addEventListener?.('visibilitychange', () => {
      if (AudioManager.isDocumentHidden()) {
        AudioManager.handleAudioHidden();
      } else {
        AudioManager.handleAudioVisible();
      }
    });
    windowRef?.addEventListener?.('blur', () => AudioManager.handleAudioHidden());
    windowRef?.addEventListener?.('focus', () => AudioManager.handleAudioVisible());
    windowRef?.addEventListener?.('pointerdown', () => AudioManager.handleAudioGesture(), {
      capture: true,
    });
    windowRef?.addEventListener?.('keydown', () => AudioManager.handleAudioGesture(), {
      capture: true,
    });
    windowRef?.addEventListener?.('touchstart', () => AudioManager.handleAudioGesture(), {
      capture: true,
      passive: true,
    });
  }

  private static handleAudioHidden(): void {
    if (AudioManager.isPageHidden) {
      AudioManager.suppressSfxBriefly();
      return;
    }

    AudioManager.isPageHidden = true;
    AudioManager.bgmWasPlayingBeforeHidden = AudioManager.currentBgm?.isPlaying === true;
    AudioManager.suppressSfxBriefly();

    if (AudioManager.currentBgmKey && AudioManager.currentBgmScene) {
      AudioManager.pendingBgm = {
        scene: AudioManager.currentBgmScene,
        key: AudioManager.currentBgmKey as AudioEventKey,
        loop: true,
        volume: 1,
      };
    }

    AudioManager.stopAllSceneSounds();
    AudioManager.stopBgm();
    AudioManager.lastPlayedAt.clear();
  }

  private static handleAudioVisible(): void {
    if (!AudioManager.isPageHidden) {
      AudioManager.suppressSfxBriefly();
      return;
    }

    AudioManager.isPageHidden = false;
    AudioManager.suppressSfxBriefly();

    if (!AudioManager.bgmWasPlayingBeforeHidden && !AudioManager.pendingBgm) {
      return;
    }

    AudioManager.bgmWasPlayingBeforeHidden = false;
    if (!AudioManager.hasAudioGesture) {
      return;
    }

    globalThis.setTimeout?.(() => {
      AudioManager.resumePendingBgm();
    }, 150);
  }

  private static handleAudioGesture(): void {
    AudioManager.hasAudioGesture = true;

    if (AudioManager.isPageHidden || !AudioManager.isForegroundAudioAllowed()) {
      return;
    }

    AudioManager.suppressSfxBriefly();
    globalThis.setTimeout?.(() => {
      AudioManager.resumePendingBgm();
    }, 150);
  }

  private static canStartAudioNow(): boolean {
    return AudioManager.hasAudioGesture && AudioManager.isForegroundAudioAllowed();
  }

  private static isForegroundAudioAllowed(): boolean {
    return !AudioManager.isPageHidden && AudioManager.hasForegroundFocus();
  }

  private static isDocumentHidden(): boolean {
    return globalThis.document?.hidden === true;
  }

  private static hasForegroundFocus(): boolean {
    const documentRef = globalThis.document;

    if (documentRef?.hidden === true) {
      return false;
    }

    if (documentRef?.hasFocus && !documentRef.hasFocus()) {
      return false;
    }

    return true;
  }

  private static suppressSfxBriefly(): void {
    AudioManager.suppressSfxUntilMs = AudioManager.getNowMs() + 700;
  }

  private static isSfxSuppressed(): boolean {
    return AudioManager.getNowMs() < AudioManager.suppressSfxUntilMs;
  }

  private static getNowMs(): number {
    return globalThis.performance?.now?.() ?? Date.now();
  }

  private static rememberPendingBgm(
    scene: Phaser.Scene,
    key: AudioEventKey,
    options: PlayOptions,
  ): void {
    if (!key.endsWith('_bgm') || !scene.cache.audio.exists(key)) {
      return;
    }

    AudioManager.pendingBgm = {
      scene,
      key,
      loop: options.loop ?? true,
      volume: options.volume ?? 1,
    };
  }

  private static resumePendingBgm(): void {
    if (!AudioManager.isAudioEnabled() || AudioManager.getChannelVolume('bgm') <= 0) {
      AudioManager.pendingBgm = undefined;
      return;
    }

    if (!AudioManager.canStartAudioNow()) {
      return;
    }

    const pending = AudioManager.pendingBgm;

    if (!pending || !AudioManager.isSceneUsable(pending.scene)) {
      AudioManager.pendingBgm = undefined;
      return;
    }

    AudioManager.pendingBgm = undefined;
    AudioManager.playBgm(pending.scene, pending.key, {
      loop: pending.loop,
      volume: pending.volume,
    });
  }

  private static registerSoundScene(scene: Phaser.Scene): void {
    AudioManager.soundScenes.add(scene);
  }

  private static stopAllSceneSounds(): void {
    for (const scene of AudioManager.soundScenes) {
      if (!AudioManager.isSceneUsable(scene)) {
        AudioManager.soundScenes.delete(scene);
        continue;
      }

      scene.sound.stopAll();
    }
  }

  private static isSceneUsable(scene: Phaser.Scene): boolean {
    return scene.sys?.settings?.status !== Phaser.Scenes.DESTROYED;
  }
}
