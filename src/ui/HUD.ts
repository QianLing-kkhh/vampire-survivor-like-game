import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { I18n } from '../i18n/I18n';
import { MapMechanicDefinition } from '../map/mechanics/MapMechanicDefinition';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { MinimapOverlay } from './minimap/MinimapOverlay';
import { MinimapEnemyPosition, WorldPosition } from './minimap/MinimapTypes';
import { UITheme } from './UITheme';

export interface HUDState {
  currentHp: number;
  maxHp: number;
  level: number;
  currentExp: number;
  requiredExp: number;
  timeSeconds: number;
  targetTimeSeconds: number;
  score: number;
  weaponIds: string[];
  autoMode?: boolean;
  endlessMode?: boolean;
  endlessStarted?: boolean;
  endlessTimeSeconds?: number;
  evolutionCandidateStats?: string;
  weaponHudInfo?: Array<{
    weaponId: string;
    upgradeSummary: string;
  }>;
  weaponBuildHudInfo?: Array<{
    weaponId: string;
    baseWeaponId: string;
    evolvedWeaponId?: string;
    weaponName: string;
    weaponIconKey: string;
    weaponLevel: number;
    weaponLevelMax: number;
    evolved: boolean;
    evolutionReady?: boolean;
    passiveId?: string;
    passiveName?: string;
    passiveIconKey?: string;
    passiveLevel?: number;
    passiveLevelMax?: number;
  }>;
  passiveItems?: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  moveSpeed: number;
  pickupRange: number;
  playerMaxHp?: number;
  worldWidth: number;
  worldHeight: number;
  mapMechanics?: readonly MapMechanicDefinition[];
  playerPosition: WorldPosition;
  enemyPositions: MinimapEnemyPosition[];
  message?: string;
}

type IconEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  visualKey?: string;
};

type BuildEntry = {
  container: Phaser.GameObjects.Container;
  weaponBackground: Phaser.GameObjects.Rectangle;
  passiveBackground: Phaser.GameObjects.Rectangle;
  weaponIcon?: Phaser.GameObjects.Image;
  weaponFallback?: Phaser.GameObjects.Text;
  passiveIcon?: Phaser.GameObjects.Image;
  passiveFallback?: Phaser.GameObjects.Text;
  weaponLevelLabel: Phaser.GameObjects.Text;
  passiveLevelLabel: Phaser.GameObjects.Text;
  visualKey?: string;
};

export class HUD {
  private static readonly SHOW_DEBUG_OVERLAY = false;
  private static readonly BAR_WIDTH = 230;
  private static readonly BAR_HEIGHT = 14;
  private static readonly ICON_SIZE = 28;
  private static readonly BUILD_ICON_SIZE = 56;
  private static readonly BUILD_ROW_HEIGHT = 64;
  private static readonly BUILD_WEAPON_LEVEL_X = 38;
  private static readonly BUILD_PASSIVE_ICON_X = 150;
  private static readonly BUILD_PASSIVE_LEVEL_X = 188;

  private readonly scene: Phaser.Scene;
  private readonly screenManager: ScreenManager;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly statsPanelBg: Phaser.GameObjects.Rectangle;
  private readonly statsPanelImage?: Phaser.GameObjects.Image;
  private readonly buildPanelBg: Phaser.GameObjects.Rectangle;
  private readonly buildPanelImage?: Phaser.GameObjects.Image;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBarFill: Phaser.GameObjects.Rectangle;
  private readonly expText: Phaser.GameObjects.Text;
  private readonly expBarBg: Phaser.GameObjects.Rectangle;
  private readonly expBarFill: Phaser.GameObjects.Rectangle;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly goalText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly shieldText: Phaser.GameObjects.Text;
  private readonly evolutionDebugText: Phaser.GameObjects.Text;
  private readonly buildEntries: BuildEntry[] = [];
  private readonly weaponEntries: IconEntry[] = [];
  private readonly passiveEntries: IconEntry[] = [];
  private readonly minimap: MinimapOverlay;
  private readonly pauseButton: Phaser.GameObjects.Text;
  private barWidth = HUD.BAR_WIDTH;
  private maxIconRows = 6;
  private maxPassiveRows = 3;

  constructor(scene: Phaser.Scene, private readonly onPause?: () => void) {
    this.scene = scene;
    this.screenManager = new ScreenManager(scene);
    this.statsPanelBg = this.createPanelBackground(12, 8, 250, 126);
    this.statsPanelBg.setVisible(false);
    this.statsPanelImage = undefined;
    this.buildPanelBg = this.createPanelBackground(12, 148, 330, 214);
    this.buildPanelBg.setVisible(false);
    this.buildPanelImage = undefined;
    this.hpText = this.createText(16, 12, UITheme.smallFontSize);
    this.hpBarBg = this.createBarBackground(16, 34, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.hpBarFill = this.createBarFill(16, 34, UITheme.hpBarColor);
    this.expText = this.createText(16, 54, UITheme.smallFontSize);
    this.expBarBg = this.createBarBackground(16, 76, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.expBarFill = this.createBarFill(16, 76, UITheme.expBarColor);
    this.timeText = this.createText(16, 98, '24px');
    this.timeText.setStyle({ fontStyle: 'bold' });
    this.timeText.setStroke('#000000', 4);
    this.scoreText = this.createText(16, 124, '22px', '#facc15');
    this.scoreText.setStyle({ fontStyle: 'bold' });
    this.scoreText.setStroke('#111827', 3);
    this.goalText = this.createText(16, 150, UITheme.smallFontSize, UITheme.mutedTextColor);
    this.messageText = this.createText(16, 172, UITheme.smallFontSize, UITheme.successTextColor);
    this.shieldText = this.createText(16, 192, UITheme.smallFontSize, UITheme.successTextColor);
    this.evolutionDebugText = this.createText(16, 520, '12px', UITheme.mutedTextColor);
    this.minimap = new MinimapOverlay(scene);

    this.pauseButton = scene.add.text(0, 0, 'Pause', {
      backgroundColor: '#111827',
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '14px',
      padding: {
        x: 14,
        y: 9,
      },
    });
    this.pauseButton.setOrigin(0.5);
    this.pauseButton.setDepth(1200);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation();
      this.onPause?.();
    });

    this.update({
      currentHp: 0,
      maxHp: 0,
      level: 1,
      currentExp: 0,
      requiredExp: 5,
      timeSeconds: 0,
      targetTimeSeconds: 300,
      score: 0,
      weaponIds: [],
      autoMode: false,
      weaponHudInfo: [],
      passiveItems: [],
      moveSpeed: 0,
      pickupRange: 0,
      playerMaxHp: 0,
      worldWidth: 1,
      worldHeight: 1,
      playerPosition: { x: 0, y: 0 },
      enemyPositions: [],
    });
  }

  destroy(): void {
    this.screenManager.dispose();
    this.hpText.destroy();
    this.statsPanelBg.destroy();
    this.statsPanelImage?.destroy();
    this.buildPanelBg.destroy();
    this.buildPanelImage?.destroy();
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.expText.destroy();
    this.expBarBg.destroy();
    this.expBarFill.destroy();
    this.timeText.destroy();
    this.scoreText.destroy();
    this.goalText.destroy();
    this.messageText.destroy();
    this.shieldText.destroy();
    this.evolutionDebugText.destroy();
    this.minimap.destroy();
    this.pauseButton.destroy();
    this.buildEntries.forEach((entry) => {
      entry.container.destroy(true);
    });
    this.weaponEntries.forEach((entry) => {
      entry.container.destroy(true);
    });
    this.passiveEntries.forEach((entry) => {
      entry.container.destroy(true);
    });
  }

  update(state: HUDState): void {
    this.applyLayout();
    const currentHp = this.formatInteger(state.currentHp);
    const maxHp = this.formatInteger(state.playerMaxHp ?? state.maxHp);
    const exp = Math.floor(state.currentExp);
    const requiredExp = Math.max(1, Math.floor(state.requiredExp));

    this.hpText.setText(`${I18n.t('hud.hp')} ${currentHp} / ${maxHp}`);
    this.setBarRatio(this.hpBarFill, state.currentHp / Math.max(state.playerMaxHp ?? state.maxHp, 1));
    this.expText.setText(`${I18n.t('hud.level')}.${state.level}  ${I18n.t('hud.exp')} ${exp} / ${requiredExp}`);
    this.setBarRatio(this.expBarFill, state.currentExp / requiredExp);
    this.timeText.setText(`${I18n.t('hud.time')} ${this.formatTime(state.timeSeconds)}`);
    this.scoreText.setText(`${I18n.t('hud.score')} ${this.formatInteger(state.score)}`);
    this.goalText.setText(this.getGoalText(state));
    this.updateHudMessage(state.message);
    this.updateShieldText();
    this.updateIconList(
      this.passiveEntries,
      this.getOtherPassiveIconItems(state),
      LayoutConfig.getHudLayout(this.screenManager).passivesPosition.x,
      LayoutConfig.getHudLayout(this.screenManager).passivesPosition.y,
    );
    this.updateBuildList(
      this.getBuildItems(state),
      LayoutConfig.getHudLayout(this.screenManager).weaponsPosition.x,
      LayoutConfig.getHudLayout(this.screenManager).weaponsPosition.y,
    );
    this.evolutionDebugText.setText(this.getEvolutionDebugText(state));
    this.minimap.update({
      worldWidth: state.worldWidth,
      worldHeight: state.worldHeight,
      mapMechanics: state.mapMechanics,
      playerPosition: state.playerPosition,
      enemyPositions: state.enemyPositions,
    });
  }

  private updateIconList(
    entries: IconEntry[],
    items: Array<{ id: string; textureKey?: string; label: string; fallback: string }>,
    x: number,
    y: number,
  ): void {
    const visibleItems = this.getVisibleIconItems(items, this.maxPassiveRows);

    while (entries.length < visibleItems.length) {
      entries.push(this.createIconEntry());
    }

    entries.forEach((entry, index) => {
      const item = visibleItems[index];

      if (!item) {
        entry.container.setVisible(false);
        return;
      }

      entry.container.setPosition(x, y + index * HUD.BUILD_ROW_HEIGHT);
      entry.container.setVisible(true);
      entry.label.setText(item.label);
      const visualKey = item.textureKey && this.scene.textures.exists(item.textureKey)
        ? `texture:${item.textureKey}`
        : `fallback:${item.fallback}`;

      if (entry.visualKey === visualKey) {
        return;
      }

      entry.icon?.destroy();
      entry.fallback?.destroy();
      entry.icon = undefined;
      entry.fallback = undefined;
      entry.visualKey = visualKey;

      if (item.textureKey && this.scene.textures.exists(item.textureKey)) {
        entry.icon = this.scene.add.image(0, 0, item.textureKey);
        entry.icon.setDisplaySize(HUD.BUILD_ICON_SIZE - 8, HUD.BUILD_ICON_SIZE - 8);
        entry.container.addAt(entry.icon, 1);
        return;
      }

      entry.fallback = this.scene.add.text(0, 0, item.fallback, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '18px',
        fontStyle: 'bold',
      });
      entry.fallback.setOrigin(0.5);
      entry.container.addAt(entry.fallback, 1);
    });
  }

  private createIconEntry(): IconEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const background = this.scene.add.rectangle(
      0,
      0,
      HUD.BUILD_ICON_SIZE,
      HUD.BUILD_ICON_SIZE,
      UITheme.iconBgColor,
      0,
    );
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);
    const label = this.scene.add.text(HUD.BUILD_ICON_SIZE / 2 + 10, -12, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '18px',
      fontStyle: 'bold',
    });

    container.add([background, label]);
    return { container, background, label };
  }

  private updateBuildList(
    items: Array<{
      id: string;
      weaponIconKey?: string;
      weaponFallback: string;
      passiveIconKey?: string;
      passiveFallback?: string;
      weaponLevelLabel: string;
      passiveLevelLabel?: string;
    }>,
    x: number,
    y: number,
  ): void {
    const visibleItems = this.getVisibleBuildItems(items);

    while (this.buildEntries.length < visibleItems.length) {
      this.buildEntries.push(this.createBuildEntry());
    }

    this.buildEntries.forEach((entry, index) => {
      const item = visibleItems[index];

      if (!item) {
        entry.container.setVisible(false);
        return;
      }

      entry.container.setPosition(x, y + index * HUD.BUILD_ROW_HEIGHT);
      entry.container.setVisible(true);
      entry.weaponLevelLabel.setText(item.weaponLevelLabel);
      entry.passiveLevelLabel.setText(item.passiveLevelLabel ?? '');
      entry.passiveBackground.setVisible(item.passiveIconKey !== undefined || item.passiveFallback !== undefined);
      entry.passiveLevelLabel.setVisible(item.passiveLevelLabel !== undefined);

      const visualKey = [
        item.weaponIconKey && this.scene.textures.exists(item.weaponIconKey)
          ? `w:${item.weaponIconKey}`
          : `wf:${item.weaponFallback}`,
        item.passiveIconKey && this.scene.textures.exists(item.passiveIconKey)
          ? `p:${item.passiveIconKey}`
          : `pf:${item.passiveFallback ?? ''}`,
      ].join('|');

      if (entry.visualKey === visualKey) {
        return;
      }

      entry.weaponIcon?.destroy();
      entry.weaponFallback?.destroy();
      entry.passiveIcon?.destroy();
      entry.passiveFallback?.destroy();
      entry.weaponIcon = undefined;
      entry.weaponFallback = undefined;
      entry.passiveIcon = undefined;
      entry.passiveFallback = undefined;
      entry.visualKey = visualKey;
      this.addBuildIcon(entry, item.weaponIconKey, item.weaponFallback, 0);

      if (item.passiveIconKey || item.passiveFallback) {
        this.addBuildIcon(
          entry,
          item.passiveIconKey,
          item.passiveFallback ?? '',
          HUD.BUILD_PASSIVE_ICON_X,
          true,
        );
      }
    });
  }

  private createBuildEntry(): BuildEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const weaponBackground = this.scene.add.rectangle(0, 0, HUD.BUILD_ICON_SIZE, HUD.BUILD_ICON_SIZE, UITheme.iconBgColor, 0);
    weaponBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);
    const passiveBackground = this.scene.add.rectangle(HUD.BUILD_PASSIVE_ICON_X, 0, HUD.BUILD_ICON_SIZE, HUD.BUILD_ICON_SIZE, UITheme.iconBgColor, 0);
    passiveBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.4);
    const weaponLevelLabel = this.scene.add.text(HUD.BUILD_WEAPON_LEVEL_X, -14, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 3,
    });
    const passiveLevelLabel = this.scene.add.text(HUD.BUILD_PASSIVE_LEVEL_X, -14, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 3,
    });

    container.add([weaponBackground, passiveBackground, weaponLevelLabel, passiveLevelLabel]);
    return {
      container,
      weaponBackground,
      passiveBackground,
      weaponLevelLabel,
      passiveLevelLabel,
    };
  }

  private addBuildIcon(
    entry: BuildEntry,
    textureKey: string | undefined,
    fallback: string,
    x: number,
    isPassive = false,
  ): void {
    if (textureKey && this.scene.textures.exists(textureKey)) {
      const icon = this.scene.add.image(x, 0, textureKey);
      icon.setDisplaySize(HUD.BUILD_ICON_SIZE - 8, HUD.BUILD_ICON_SIZE - 8);
      entry.container.addAt(icon, isPassive ? 4 : 2);

      if (isPassive) {
        entry.passiveIcon = icon;
      } else {
        entry.weaponIcon = icon;
      }
      return;
    }

    const fallbackText = this.scene.add.text(x, 0, fallback, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '18px',
      fontStyle: 'bold',
    });
    fallbackText.setOrigin(0.5);
    entry.container.addAt(fallbackText, isPassive ? 4 : 2);

    if (isPassive) {
      entry.passiveFallback = fallbackText;
    } else {
      entry.weaponFallback = fallbackText;
    }
  }

  private getWeaponIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
  }> {
    const weaponHudInfo = state.weaponHudInfo && state.weaponHudInfo.length > 0
      ? state.weaponHudInfo
      : state.weaponIds.map((weaponId) => ({ weaponId, upgradeSummary: 'Base' }));

    return weaponHudInfo.map((weapon) => ({
      id: weapon.weaponId,
      textureKey: AssetKeyResolver.getWeaponIconKey(this.scene, weapon.weaponId) ?? undefined,
      label: this.getCompactWeaponLabel(weapon),
      fallback: this.getInitials(weapon.weaponId),
    }));
  }

  private getBuildItems(state: HUDState): Array<{
    id: string;
    weaponIconKey?: string;
    weaponFallback: string;
    passiveIconKey?: string;
    passiveFallback?: string;
    weaponLevelLabel: string;
    passiveLevelLabel?: string;
  }> {
    if (!state.weaponBuildHudInfo || state.weaponBuildHudInfo.length === 0) {
      return this.getWeaponIconItems(state).map((weapon) => ({
        id: weapon.id,
        weaponIconKey: weapon.textureKey,
        weaponFallback: weapon.fallback,
        weaponLevelLabel: weapon.label,
      }));
    }

    return state.weaponBuildHudInfo.map((info) => ({
      id: info.weaponId,
      weaponIconKey: AssetKeyResolver.getWeaponIconKey(this.scene, info.weaponId)
        ?? info.weaponIconKey,
      weaponFallback: this.getInitials(info.weaponId),
      passiveIconKey: info.passiveId
        ? AssetKeyResolver.getPassiveIconKey(this.scene, info.passiveId) ?? info.passiveIconKey
        : info.passiveIconKey,
      passiveFallback: info.passiveId ? this.getInitials(info.passiveId) : undefined,
      weaponLevelLabel: this.getLevelLabel(info.weaponLevel, info.weaponLevelMax),
      passiveLevelLabel: info.passiveId
        ? this.getLevelLabel(info.passiveLevel ?? 0, info.passiveLevelMax ?? 5)
        : undefined,
    }));
  }

  private getLevelLabel(level: number, maxLevel: number): string {
    const safeLevel = Math.max(0, Math.floor(level));
    const safeMax = Math.max(0, Math.floor(maxLevel));

    return `Lv.${safeLevel}${safeMax > 0 && safeLevel >= safeMax ? 'Max' : ''}`;
  }

  private getOtherPassiveIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
  }> {
    const matchedPassiveIds = new Set(
      (state.weaponBuildHudInfo ?? [])
        .map((info) => info.passiveId)
        .filter((passiveId): passiveId is string => passiveId !== undefined),
    );

    return (state.passiveItems ?? [])
      .filter((passive) => !matchedPassiveIds.has(passive.id))
      .map((passive) => ({
        id: passive.id,
        textureKey: AssetKeyResolver.getPassiveIconKey(this.scene, passive.id) ?? undefined,
        label: `Other ${passive.name} Lv.${passive.level}`,
        fallback: this.getInitials(passive.id),
      }));
  }

  private getPassiveIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
  }> {
    return (state.passiveItems ?? []).map((passive) => ({
      id: passive.id,
      textureKey: AssetKeyResolver.getPassiveIconKey(this.scene, passive.id) ?? undefined,
      label: `Lv.${passive.level}`,
      fallback: this.getInitials(passive.id),
    }));
  }

  private getCompactWeaponLabel(weapon: { weaponId: string; upgradeSummary: string }): string {
    if (weapon.upgradeSummary === 'Evolved') {
      return I18n.t('hud.evolved');
    }

    const match = /Total Lv\.(\d+) \/ (\d+)/.exec(weapon.upgradeSummary);

    if (!match) {
      return 'Lv.0';
    }

    return `Lv.${match[1]}/${match[2]}`;
  }

  private getEvolutionDebugText(state: HUDState): string {
    if (!HUD.SHOW_DEBUG_OVERLAY || !state.autoMode || !state.evolutionCandidateStats) {
      return '';
    }

    return [
      I18n.t('hud.evolutionDebug'),
      ...state.evolutionCandidateStats
        .split('|')
        .slice(0, 5)
        .map((candidate) => candidate
          .replace(/;/g, ' ')
          .replace(/true/g, 'Y')
          .replace(/false/g, 'N')),
    ].join('\n');
  }

  private getGoalText(state: HUDState): string {
    if (state.timeSeconds >= state.targetTimeSeconds) {
      if (state.endlessStarted) {
        return `Endless ${this.formatTime(state.endlessTimeSeconds ?? 0)}`;
      }

      return I18n.t('hud.goalDefeatBoss');
    }

    return I18n.t('hud.bossIn', {
      time: this.formatTime(Math.max(0, state.targetTimeSeconds - state.timeSeconds)),
    });
  }

  private createText(
    x: number,
    y: number,
    fontSize: string,
    color = UITheme.textColor,
  ): Phaser.GameObjects.Text {
    const text = this.scene.add.text(x, y, '', {
      color,
      fontFamily: UITheme.fontFamily,
      fontSize,
    });
    text.setDepth(900);
    text.setScrollFactor(0);
    return text;
  }

  private createBarBackground(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    const bar = this.scene.add.rectangle(x, y, width, height, UITheme.barBgColor, 0.82);
    bar.setOrigin(0, 0);
    bar.setStrokeStyle(1, UITheme.panelBorderColor, 0.45);
    bar.setDepth(900);
    bar.setScrollFactor(0);
    return bar;
  }

  private createBarFill(
    x: number,
    y: number,
    color: number,
  ): Phaser.GameObjects.Rectangle {
    const bar = this.scene.add.rectangle(x, y, this.barWidth, HUD.BAR_HEIGHT, color, 0.92);
    bar.setOrigin(0, 0);
    bar.setDepth(901);
    bar.setScrollFactor(0);
    return bar;
  }

  private setBarRatio(bar: Phaser.GameObjects.Rectangle, ratio: number): void {
    bar.displayWidth = this.barWidth * Phaser.Math.Clamp(ratio, 0, 1);
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getHudLayout(this.screenManager);
    const stats = layout.statsPosition;

    this.barWidth = layout.barWidth;
    this.maxIconRows = layout.maxIconRows;
    this.maxPassiveRows = layout.maxPassiveRows;

    this.hpText.setPosition(stats.x, stats.y);
    this.hpText.setFontSize(layout.fontSize);
    this.hpBarBg.setPosition(stats.x, stats.y + 22);
    this.hpBarBg.setSize(this.barWidth, HUD.BAR_HEIGHT);
    this.hpBarFill.setPosition(stats.x, stats.y + 22);
    this.expText.setPosition(stats.x, stats.y + 42);
    this.expText.setFontSize(layout.fontSize);
    this.expBarBg.setPosition(stats.x, stats.y + 64);
    this.expBarBg.setSize(this.barWidth, HUD.BAR_HEIGHT);
    this.expBarFill.setPosition(stats.x, stats.y + 64);
    this.timeText.setPosition(stats.x, stats.y + 86);
    this.timeText.setFontSize(this.screenManager.isPortrait() ? '22px' : '26px');
    this.scoreText.setPosition(stats.x, stats.y + 116);
    this.scoreText.setFontSize(this.screenManager.isPortrait() ? '20px' : '22px');
    this.goalText.setPosition(stats.x, stats.y + 142);
    this.goalText.setFontSize(layout.fontSize);
    this.messageText.setPosition(layout.bossTextPosition.x, layout.bossTextPosition.y);
    this.messageText.setOrigin(0.5);
    this.shieldText.setPosition(stats.x, stats.y + 162);
    this.shieldText.setFontSize(layout.fontSize);
    this.evolutionDebugText.setPosition(stats.x, this.screenManager.height - 96);
    this.evolutionDebugText.setVisible(HUD.SHOW_DEBUG_OVERLAY);
    this.minimap.setPosition(layout.minimapPosition.x, layout.minimapPosition.y);
    this.minimap.setSize(layout.minimapSize.width, layout.minimapSize.height);
    this.pauseButton.setPosition(
      layout.pauseButtonPosition.x,
      layout.pauseButtonPosition.y,
    );
    this.pauseButton.setText(this.screenManager.isPortrait() ? 'II' : 'Pause');
    this.pauseButton.setFontSize(layout.fontSize);
    this.pauseButton.setInteractive(
      new Phaser.Geom.Rectangle(
        -layout.pauseButtonRect.width / 2,
        -layout.pauseButtonRect.height / 2,
        layout.pauseButtonRect.width,
        layout.pauseButtonRect.height,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
  }

  private createPanelBackground(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    const panel = this.scene.add.rectangle(x, y, width, height, UITheme.panelBgColor, UITheme.hudPanelAlpha);
    panel.setOrigin(0, 0);
    panel.setStrokeStyle(1, UITheme.panelBorderColor, 0.35);
    panel.setDepth(890);
    panel.setScrollFactor(0);
    return panel;
  }

  private updateHudMessage(message: string | undefined): void {
    this.messageText.setText(message ?? '');

    if (this.isBossHudMessage(message)) {
      this.messageText.setColor('#facc15');
      this.messageText.setFontSize(
        this.screenManager.width <= 430
          ? '22px'
          : this.screenManager.isPortrait() ? '26px' : '34px',
      );
      this.messageText.setStyle({ fontStyle: 'bold' });
      this.messageText.setStroke('#7f1d1d', 5);
      return;
    }

    this.messageText.setColor(UITheme.successTextColor);
    this.messageText.setFontSize(LayoutConfig.getHudLayout(this.screenManager).fontSize);
    this.messageText.setStyle({ fontStyle: '' });
    this.messageText.setStroke('#000000', 0);
  }

  private isBossHudMessage(message: string | undefined): boolean {
    return message !== undefined && /boss|incoming|warning/i.test(message);
  }

  private createPanelImage(): Phaser.GameObjects.Image | undefined {
    if (!this.scene.textures.exists('art_ui_hud_panel_bg')) {
      return undefined;
    }

    const image = this.scene.add.image(0, 0, 'art_ui_hud_panel_bg');
    image.setOrigin(0, 0);
    image.setDepth(891);
    image.setScrollFactor(0);
    image.setAlpha(UITheme.hudPanelAlpha);
    return image;
  }

  private layoutPanelBackground(
    rectangle: Phaser.GameObjects.Rectangle,
    image: Phaser.GameObjects.Image | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    rectangle.setPosition(x, y);
    rectangle.setSize(width, height);

    if (!image) {
      return;
    }

    const frame = image.texture.get();
    image.setPosition(x, y);
    image.setScale(Math.max(width / frame.width, height / frame.height));
    image.setDepth(rectangle.depth + 0.1);
  }

  private getVisibleIconItems(
    items: Array<{ id: string; textureKey?: string; label: string; fallback: string }>,
    maxRows = this.maxIconRows,
  ): Array<{ id: string; textureKey?: string; label: string; fallback: string }> {
    if (maxRows <= 0) {
      return [];
    }

    if (items.length <= maxRows) {
      return items;
    }

    return [
      ...items.slice(0, Math.max(0, maxRows - 1)),
      {
        id: 'more',
        label: `+${items.length - maxRows + 1}`,
        fallback: '+',
      },
    ];
  }

  private getVisibleBuildItems(
    items: Array<{
      id: string;
      weaponIconKey?: string;
      weaponFallback: string;
      passiveIconKey?: string;
      passiveFallback?: string;
      weaponLevelLabel: string;
      passiveLevelLabel?: string;
    }>,
  ): Array<{
    id: string;
    weaponIconKey?: string;
    weaponFallback: string;
    passiveIconKey?: string;
    passiveFallback?: string;
    weaponLevelLabel: string;
    passiveLevelLabel?: string;
  }> {
    if (items.length <= this.maxIconRows) {
      return items;
    }

    return [
      ...items.slice(0, Math.max(0, this.maxIconRows - 1)),
      {
        id: 'more',
        weaponFallback: '+',
        weaponLevelLabel: `+${items.length - this.maxIconRows + 1}`,
      },
    ];
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  private formatInteger(value: number): string {
    return Math.round(value).toString();
  }

  private updateShieldText(): void {
    const shield = EndlessRewardManager.getGlobalShieldStatus();

    this.shieldText.setVisible(shield.stacks > 0);
    this.shieldText.setText(shield.stacks > 0 ? `Shield x${shield.stacks}` : '');
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
