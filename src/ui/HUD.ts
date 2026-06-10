import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { I18n } from '../i18n/I18n';
import { MapMechanicDefinition } from '../map/mechanics/MapMechanicDefinition';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { setTextHitArea, stopPointerEvent } from './input/UIInteraction';
import type { LiveStrategyControlState } from './LiveStrategyControlPanel';
import { MinimapOverlay } from './minimap/MinimapOverlay';
import { MinimapEnemyPosition, MinimapViewport, WorldPosition } from './minimap/MinimapTypes';
import { IconTooltipData } from './tooltip/IconTooltipTypes';
import { attachIconTooltip } from './tooltip/UITooltipManager';
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
  relicCount?: number;
  relics?: Array<{
    id: string;
    name: string;
    rarity: string;
    iconKey?: string;
  }>;
  bossBars?: Array<{
    id: string;
    name: string;
    currentHp: number;
    maxHp: number;
    hpRatio: number;
    finalBoss?: boolean;
    bossLike?: boolean;
  }>;
  characterHudInfo?: {
    characterId: string;
    skinId?: string;
    portraitKey?: string;
    damageReactionCooldown?: HudCooldownStatus;
  };
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
    cooldown?: HudCooldownStatus;
    showCooldownInHud?: boolean;
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
  cameraView?: MinimapViewport;
  message?: string;
  liveStrategy?: LiveStrategyControlState;
}

type HudCooldownStatus = {
  remainingMs: number;
  totalMs: number;
  ready: boolean;
};

type IconEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Text;
  label: Phaser.GameObjects.Text;
  tooltipData?: IconTooltipData;
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
  weaponCooldownOverlay: Phaser.GameObjects.Rectangle;
  weaponCooldownText: Phaser.GameObjects.Text;
  weaponTooltipData?: IconTooltipData;
  passiveTooltipData?: IconTooltipData;
  visualKey?: string;
};

type CharacterPortraitEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  cooldownOverlay: Phaser.GameObjects.Rectangle;
  cooldownText: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Text;
  tooltipData?: IconTooltipData;
  visualKey?: string;
};

type RelicIconEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  icon?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Text;
  tooltipData?: IconTooltipData;
  visualKey?: string;
};

type BossBarEntry = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
};

export class HUD {
  private static readonly SHOW_DEBUG_OVERLAY = false;
  private static readonly BAR_WIDTH = 230;
  private static readonly BAR_HEIGHT = 14;
  private static readonly STATS_PANEL_HEIGHT = 230;
  private static readonly ICON_SIZE = 28;
  private static readonly BUILD_ICON_SIZE = 56;
  private static readonly BUILD_ROW_HEIGHT = 64;
  private static readonly BUILD_WEAPON_LEVEL_X = 38;
  private static readonly BUILD_PASSIVE_ICON_X = 150;
  private static readonly BUILD_PASSIVE_LEVEL_X = 188;
  private static readonly RELIC_ICON_SIZE = 26;

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
  private readonly relicText: Phaser.GameObjects.Text;
  private readonly goalText: Phaser.GameObjects.Text;
  private readonly messageText: Phaser.GameObjects.Text;
  private readonly shieldText: Phaser.GameObjects.Text;
  private readonly evolutionDebugText: Phaser.GameObjects.Text;
  private readonly characterPortraitEntry: CharacterPortraitEntry;
  private readonly relicEntries: RelicIconEntry[] = [];
  private readonly bossBarEntries: BossBarEntry[] = [];
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
    this.statsPanelBg = this.createPanelBackground(12, 8, 250, HUD.STATS_PANEL_HEIGHT);
    this.statsPanelBg.setVisible(false);
    this.statsPanelImage = undefined;
    this.buildPanelBg = this.createPanelBackground(12, 248, 330, 214);
    this.buildPanelBg.setVisible(false);
    this.buildPanelImage = undefined;
    this.characterPortraitEntry = this.createCharacterPortraitEntry();
    this.hpText = this.createText(16, 12, UITheme.smallFontSize);
    this.hpBarBg = this.createBarBackground(16, 34, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.hpBarFill = this.createBarFill(16, 34, UITheme.hpBarColor);
    this.expText = this.createText(16, 54, UITheme.smallFontSize);
    this.expBarBg = this.createBarBackground(16, 76, HUD.BAR_WIDTH, HUD.BAR_HEIGHT);
    this.expBarFill = this.createBarFill(16, 76, UITheme.expBarColor);
    this.timeText = this.createText(16, 100, '24px');
    this.timeText.setStyle({ fontStyle: 'bold' });
    this.timeText.setStroke('#000000', 4);
    this.scoreText = this.createText(16, 128, '22px', '#facc15');
    this.scoreText.setStyle({ fontStyle: 'bold' });
    this.scoreText.setStroke('#111827', 3);
    this.relicText = this.createText(16, 154, UITheme.smallFontSize, UITheme.mutedTextColor);
    this.goalText = this.createText(16, 178, UITheme.smallFontSize, UITheme.mutedTextColor);
    this.messageText = this.createText(16, 172, UITheme.smallFontSize, UITheme.successTextColor);
    this.shieldText = this.createText(16, 226, UITheme.smallFontSize, UITheme.successTextColor);
    this.evolutionDebugText = this.createText(16, 520, '12px', UITheme.mutedTextColor);
    this.minimap = new MinimapOverlay(scene);

    this.pauseButton = scene.add.text(0, 0, I18n.t('ui.pause'), {
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
    this.pauseButton.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
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
      relicCount: 0,
      relics: [],
      bossBars: [],
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
    this.relicText.destroy();
    this.goalText.destroy();
    this.messageText.destroy();
    this.shieldText.destroy();
    this.evolutionDebugText.destroy();
    this.characterPortraitEntry.container.destroy(true);
    this.relicEntries.forEach((entry) => {
      entry.container.destroy(true);
    });
    this.bossBarEntries.forEach((entry) => {
      entry.container.destroy(true);
    });
    this.bossBarEntries.length = 0;
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
    const layout = this.applyLayout();
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
    this.relicText.setText(`${I18n.t('hud.relics')}: ${state.relicCount ?? 0}`);
    this.updateRelicIconList(state, layout);
    this.goalText.setText(this.getGoalText(state));
    this.updateBossBars(state, layout);
    this.updateHudMessage(state.message, layout);
    this.updateCharacterPortrait(state);
    this.updateShieldText();
    this.updateIconList(
      this.passiveEntries,
      this.getOtherPassiveIconItems(state),
      layout.passivesPosition.x,
      layout.passivesPosition.y,
    );
    this.updateBuildList(
      this.getBuildItems(state),
      layout.weaponsPosition.x,
      layout.weaponsPosition.y,
    );
    this.evolutionDebugText.setText(this.getEvolutionDebugText(state));
    const showMinimap = SettingsManager.getDisplay().minimapScale > 0;

    this.minimap.setVisible(showMinimap);
    if (showMinimap) {
      this.minimap.update({
        worldWidth: state.worldWidth,
        worldHeight: state.worldHeight,
        mapMechanics: state.mapMechanics,
        playerPosition: state.playerPosition,
        enemyPositions: state.enemyPositions,
        cameraView: state.cameraView,
      });
    }
  }

  private updateIconList(
    entries: IconEntry[],
    items: Array<{ id: string; textureKey?: string; label: string; fallback: string; tooltip?: IconTooltipData }>,
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
      entry.tooltipData = item.tooltip;
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
    background.setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(HUD.BUILD_ICON_SIZE / 2 + 10, -12, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '18px',
      fontStyle: 'bold',
    });

    container.add([background, label]);
    const entry: IconEntry = { container, background, label };
    attachIconTooltip(this.scene, background, () => container.visible ? entry.tooltipData : undefined);
    return entry;
  }

  private updateRelicIconList(state: HUDState, layout: ReturnType<typeof LayoutConfig.getHudLayout>): void {
    const items = this.getVisibleRelicItems(state);
    const iconSize = HUD.RELIC_ICON_SIZE;
    const gap = 4;
    const labelWidth = layout.density === 'compact' ? 64 : 82;
    const startX = this.relicText.x + labelWidth + iconSize / 2;
    const y = this.relicText.y + 10;

    while (this.relicEntries.length < items.length) {
      this.relicEntries.push(this.createRelicIconEntry());
    }

    this.relicEntries.forEach((entry, index) => {
      const item = items[index];

      if (!item) {
        entry.container.setVisible(false);
        return;
      }

      entry.container.setPosition(startX + index * (iconSize + gap), y);
      entry.container.setVisible(true);
      entry.background.setStrokeStyle(1, this.getRelicRarityColor(item.rarity), 0.82);
      entry.tooltipData = item.tooltip;
      const textureKey = item.iconKey && this.scene.textures.exists(item.iconKey)
        ? item.iconKey
        : undefined;
      const visualKey = textureKey
        ? `texture:${textureKey}`
        : `fallback:${item.fallback}`;

      if (entry.visualKey === visualKey) {
        return;
      }

      entry.icon?.destroy();
      entry.fallback?.destroy();
      entry.icon = undefined;
      entry.fallback = undefined;
      entry.visualKey = visualKey;

      if (textureKey) {
        entry.icon = this.scene.add.image(0, 0, textureKey);
        entry.icon.setDisplaySize(iconSize - 6, iconSize - 6);
        entry.container.addAt(entry.icon, 1);
        return;
      }

      entry.fallback = this.scene.add.text(0, 0, item.fallback, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: item.id === 'more' ? '12px' : '11px',
        fontStyle: 'bold',
      });
      entry.fallback.setOrigin(0.5);
      entry.container.addAt(entry.fallback, 1);
    });
  }

  private createRelicIconEntry(): RelicIconEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(902);
    container.setScrollFactor(0);
    const background = this.scene.add.rectangle(
      0,
      0,
      HUD.RELIC_ICON_SIZE,
      HUD.RELIC_ICON_SIZE,
      UITheme.iconBgColor,
      0.86,
    );
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.7);
    background.setInteractive({ useHandCursor: true });
    container.add(background);
    const entry: RelicIconEntry = { container, background };
    attachIconTooltip(this.scene, background, () => container.visible ? entry.tooltipData : undefined);
    return entry;
  }

  private createCharacterPortraitEntry(): CharacterPortraitEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const background = this.scene.add.rectangle(0, 0, 56, 56, UITheme.iconBgColor, 0.86);
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.72);
    background.setInteractive({ useHandCursor: true });
    const cooldownOverlay = this.scene.add.rectangle(0, 0, 56, 56, 0x020617, 0.58);
    const cooldownText = this.scene.add.text(0, 0, '', {
      color: '#f8fafc',
      fontFamily: UITheme.fontFamily,
      fontSize: '16px',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 4,
    });
    cooldownText.setOrigin(0.5);
    cooldownOverlay.setVisible(false);
    cooldownText.setVisible(false);
    container.add([background, cooldownOverlay, cooldownText]);

    const entry: CharacterPortraitEntry = {
      container,
      background,
      cooldownOverlay,
      cooldownText,
    };
    attachIconTooltip(this.scene, background, () => container.visible ? entry.tooltipData : undefined);
    return entry;
  }

  private updateCharacterPortrait(state: HUDState): void {
    const info = state.characterHudInfo;
    const entry = this.characterPortraitEntry;

    if (!info) {
      entry.container.setVisible(false);
      return;
    }

    entry.container.setVisible(true);
    entry.tooltipData = {
      kind: 'character',
      id: info.characterId,
    };
    const textureKey = info.portraitKey
      ?? AssetKeyResolver.getPlayerPortraitKey(this.scene, info.skinId, info.characterId)
      ?? undefined;
    const fallback = this.getInitials(info.characterId);
    const visualKey = textureKey && this.scene.textures.exists(textureKey)
      ? `portrait:${textureKey}`
      : `fallback:${fallback}`;

    if (entry.visualKey !== visualKey) {
      entry.icon?.destroy();
      entry.fallback?.destroy();
      entry.icon = undefined;
      entry.fallback = undefined;
      entry.visualKey = visualKey;

      if (textureKey && this.scene.textures.exists(textureKey)) {
        entry.icon = this.scene.add.image(0, 0, textureKey);
        entry.icon.setDisplaySize(
          entry.background.width - 8,
          entry.background.height - 8,
        );
        entry.container.addAt(entry.icon, 1);
      } else {
        entry.fallback = this.scene.add.text(0, 0, fallback, {
          color: UITheme.textColor,
          fontFamily: UITheme.fontFamily,
          fontSize: '18px',
          fontStyle: 'bold',
        });
        entry.fallback.setOrigin(0.5);
        entry.container.addAt(entry.fallback, 1);
      }
    }

    this.updateCooldownOverlay(
      entry.cooldownOverlay,
      entry.cooldownText,
      info.damageReactionCooldown,
      entry.background.height,
    );
  }

  private updateCooldownOverlay(
    overlay: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text,
    cooldown: HudCooldownStatus | undefined,
    iconSize: number,
  ): void {
    const visible = cooldown !== undefined
      && !cooldown.ready
      && cooldown.remainingMs > 0
      && cooldown.totalMs > 0;

    overlay.setVisible(visible);
    text.setVisible(visible);

    if (!visible || !cooldown) {
      text.setText('');
      return;
    }

    const ratio = Phaser.Math.Clamp(cooldown.remainingMs / cooldown.totalMs, 0, 1);
    const height = Math.max(1, iconSize * ratio);
    overlay.setSize(iconSize, height);
    overlay.setPosition(0, -iconSize / 2 + height / 2);

    const showText = SettingsManager.getGameplay().showDetailedCooldownTime;
    text.setVisible(showText);
    text.setText(showText ? this.formatCooldown(cooldown.remainingMs) : '');
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
      cooldown?: HudCooldownStatus;
      showCooldownInHud?: boolean;
      weaponTooltip?: IconTooltipData;
      passiveTooltip?: IconTooltipData;
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
      entry.weaponTooltipData = item.weaponTooltip;
      entry.passiveTooltipData = item.passiveTooltip;
      this.updateCooldownOverlay(
        entry.weaponCooldownOverlay,
        entry.weaponCooldownText,
        item.showCooldownInHud === false ? undefined : item.cooldown,
        HUD.BUILD_ICON_SIZE,
      );

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
    weaponBackground.setInteractive({ useHandCursor: true });
    const passiveBackground = this.scene.add.rectangle(HUD.BUILD_PASSIVE_ICON_X, 0, HUD.BUILD_ICON_SIZE, HUD.BUILD_ICON_SIZE, UITheme.iconBgColor, 0);
    passiveBackground.setStrokeStyle(1, UITheme.panelBorderColor, 0.4);
    passiveBackground.setInteractive({ useHandCursor: true });
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
    const weaponCooldownOverlay = this.scene.add.rectangle(0, 0, HUD.BUILD_ICON_SIZE, HUD.BUILD_ICON_SIZE, 0x020617, 0.58);
    const weaponCooldownText = this.scene.add.text(0, 0, '', {
      color: '#f8fafc',
      fontFamily: UITheme.fontFamily,
      fontSize: '16px',
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 4,
    });
    weaponCooldownText.setOrigin(0.5);
    weaponCooldownOverlay.setVisible(false);
    weaponCooldownText.setVisible(false);

    container.add([
      weaponBackground,
      passiveBackground,
      weaponLevelLabel,
      passiveLevelLabel,
      weaponCooldownOverlay,
      weaponCooldownText,
    ]);
    const entry: BuildEntry = {
      container,
      weaponBackground,
      passiveBackground,
      weaponLevelLabel,
      passiveLevelLabel,
      weaponCooldownOverlay,
      weaponCooldownText,
    };
    attachIconTooltip(this.scene, weaponBackground, () => container.visible ? entry.weaponTooltipData : undefined);
    attachIconTooltip(this.scene, passiveBackground, () => (
      container.visible && passiveBackground.visible ? entry.passiveTooltipData : undefined
    ));
    return entry;
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
    tooltip?: IconTooltipData;
  }> {
    const weaponHudInfo = state.weaponHudInfo && state.weaponHudInfo.length > 0
      ? state.weaponHudInfo
      : state.weaponIds.map((weaponId) => ({ weaponId, upgradeSummary: 'Base' }));

    return weaponHudInfo.map((weapon) => ({
      id: weapon.weaponId,
      textureKey: AssetKeyResolver.getWeaponIconKey(this.scene, weapon.weaponId) ?? undefined,
      label: this.getCompactWeaponLabel(weapon),
      fallback: this.getInitials(weapon.weaponId),
      tooltip: {
        kind: 'weapon',
        id: weapon.weaponId,
      },
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
    cooldown?: HudCooldownStatus;
    showCooldownInHud?: boolean;
    weaponTooltip?: IconTooltipData;
    passiveTooltip?: IconTooltipData;
  }> {
    if (!state.weaponBuildHudInfo || state.weaponBuildHudInfo.length === 0) {
      return this.getWeaponIconItems(state).map((weapon) => ({
        id: weapon.id,
        weaponIconKey: weapon.textureKey,
        weaponFallback: weapon.fallback,
        weaponLevelLabel: weapon.label,
        weaponTooltip: weapon.tooltip,
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
      cooldown: info.cooldown,
      showCooldownInHud: info.showCooldownInHud,
      weaponTooltip: {
        kind: 'weapon',
        id: info.weaponId,
        title: info.weaponName,
      },
      passiveTooltip: info.passiveId ? {
        kind: 'passive',
        id: info.passiveId,
        title: info.passiveName,
      } : undefined,
    }));
  }

  private getLevelLabel(level: number, maxLevel: number): string {
    const safeLevel = Math.max(0, Math.floor(level));
    const safeMax = Math.max(0, Math.floor(maxLevel));

    return `Lv.${safeLevel}${safeMax > 0 && safeLevel >= safeMax ? I18n.t('ui.max') : ''}`;
  }

  private getOtherPassiveIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
    tooltip?: IconTooltipData;
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
        label: `Lv.${passive.level}`,
        fallback: this.getInitials(passive.id),
        tooltip: {
          kind: 'passive',
          id: passive.id,
          title: passive.name,
        },
      }));
  }

  private getPassiveIconItems(state: HUDState): Array<{
    id: string;
    textureKey?: string;
    label: string;
    fallback: string;
    tooltip?: IconTooltipData;
  }> {
    return (state.passiveItems ?? []).map((passive) => ({
      id: passive.id,
      textureKey: AssetKeyResolver.getPassiveIconKey(this.scene, passive.id) ?? undefined,
      label: `Lv.${passive.level}`,
      fallback: this.getInitials(passive.id),
      tooltip: {
        kind: 'passive',
        id: passive.id,
        title: passive.name,
      },
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
        return `${I18n.t('hud.endless')} ${this.formatTime(state.endlessTimeSeconds ?? 0)}`;
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

  private applyLayout(): ReturnType<typeof LayoutConfig.getHudLayout> {
    const layout = LayoutConfig.getHudLayout(this.screenManager);
    const stats = layout.statsPosition;
    const contentY = stats.y + layout.statsContentOffsetY;
    const compact = layout.density === 'compact';

    this.barWidth = layout.barWidth;
    this.maxIconRows = layout.maxIconRows;
    this.maxPassiveRows = layout.maxPassiveRows;

    this.characterPortraitEntry.container.setPosition(
      layout.characterPortraitPosition.x,
      layout.characterPortraitPosition.y,
    );
    this.characterPortraitEntry.background.setSize(
      layout.characterPortraitSize,
      layout.characterPortraitSize,
    );
    this.characterPortraitEntry.cooldownOverlay.setSize(
      layout.characterPortraitSize,
      layout.characterPortraitSize,
    );
    this.characterPortraitEntry.icon?.setDisplaySize(
      layout.characterPortraitSize - 8,
      layout.characterPortraitSize - 8,
    );

    this.hpText.setPosition(stats.x, contentY);
    this.hpText.setFontSize(layout.fontSize);
    this.hpBarBg.setPosition(stats.x, contentY + 22);
    this.hpBarBg.setSize(this.barWidth, HUD.BAR_HEIGHT);
    this.hpBarFill.setPosition(stats.x, contentY + 22);
    this.expText.setPosition(stats.x, contentY + 42);
    this.expText.setFontSize(layout.fontSize);
    this.expBarBg.setPosition(stats.x, contentY + 64);
    this.expBarBg.setSize(this.barWidth, HUD.BAR_HEIGHT);
    this.expBarFill.setPosition(stats.x, contentY + 64);
    this.timeText.setPosition(stats.x, contentY + 90);
    this.timeText.setFontSize(compact ? '22px' : '26px');
    this.scoreText.setPosition(stats.x, contentY + 118);
    this.scoreText.setFontSize(compact ? '20px' : '22px');
    this.relicText.setPosition(stats.x, contentY + 150);
    this.relicText.setFontSize(layout.fontSize);
    this.goalText.setPosition(stats.x, contentY + 174);
    this.goalText.setFontSize(layout.fontSize);
    this.messageText.setPosition(layout.bossTextPosition.x, layout.bossTextPosition.y);
    this.messageText.setOrigin(0.5);
    this.shieldText.setPosition(stats.x, contentY + 198);
    this.shieldText.setFontSize(layout.fontSize);
    this.evolutionDebugText.setPosition(stats.x, this.screenManager.height - 96);
    this.evolutionDebugText.setVisible(HUD.SHOW_DEBUG_OVERLAY);
    this.minimap.setPosition(layout.minimapPosition.x, layout.minimapPosition.y);
    this.minimap.setSize(layout.minimapSize.width, layout.minimapSize.height);
    this.pauseButton.setPosition(
      layout.pauseButtonPosition.x,
      layout.pauseButtonPosition.y,
    );
    this.pauseButton.setText(
      this.screenManager.isPortrait()
        ? this.getPauseIconText()
        : I18n.t('ui.pause'),
    );
    this.pauseButton.setFontSize(layout.fontSize);
    setTextHitArea(this.pauseButton, layout.pauseButtonRect.width, layout.pauseButtonRect.height);

    return layout;
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

  private getPauseIconText(): string {
    const iconText = I18n.t('ui.pauseIcon').trim();

    return iconText.length > 0 && !/�/.test(iconText)
      ? iconText
      : 'II';
  }

  private updateHudMessage(
    message: string | undefined,
    layout: ReturnType<typeof LayoutConfig.getHudLayout>,
  ): void {
    this.messageText.setText(message ?? '');
    this.messageText.setPosition(layout.bossTextPosition.x, layout.bossTextPosition.y);

    if (this.isBossHudMessage(message)) {
      this.messageText.setColor('#facc15');
      this.messageText.setFontSize(
        layout.density === 'compact'
          ? '22px'
          : '34px',
      );
      this.messageText.setStyle({ fontStyle: 'bold' });
      this.messageText.setStroke('#7f1d1d', 5);
      return;
    }

    this.messageText.setColor(UITheme.successTextColor);
    this.messageText.setFontSize(layout.fontSize);
    this.messageText.setStyle({ fontStyle: '' });
    this.messageText.setStroke('#000000', 0);
  }

  private isBossHudMessage(message: string | undefined): boolean {
    return message !== undefined && /boss|incoming|warning/i.test(message);
  }

  private updateBossBars(
    state: HUDState,
    layout: ReturnType<typeof LayoutConfig.getHudLayout>,
  ): void {
    const maxBars = this.screenManager.isPortrait() ? 3 : 4;
    const visibleBosses = (state.bossBars ?? []).slice(0, maxBars);

    while (this.bossBarEntries.length < visibleBosses.length) {
      this.bossBarEntries.push(this.createBossBarEntry());
    }

    this.bossBarEntries.forEach((entry, index) => {
      const boss = visibleBosses[index];

      if (!boss) {
        entry.container.setVisible(false);
        return;
      }

      const barLayout = this.getBossBarLayout(index, layout);
      const fillWidth = Math.max(0, (barLayout.width - 4) * Phaser.Math.Clamp(boss.hpRatio, 0, 1));
      const hpPercent = Math.round(Phaser.Math.Clamp(boss.hpRatio, 0, 1) * 100);

      entry.container.setVisible(true);
      entry.container.setPosition(barLayout.x, barLayout.y);
      entry.background.setSize(barLayout.width, barLayout.height);
      entry.border.setSize(barLayout.width, barLayout.height);
      entry.fill.setSize(fillWidth, barLayout.height - 4);
      entry.fill.setPosition(-barLayout.width / 2 + 2 + fillWidth / 2, 0);
      entry.fill.setFillStyle(this.getBossBarFillColor(boss.hpRatio));
      entry.nameText.setText(boss.name);
      entry.nameText.setPosition(-barLayout.width / 2 + 10, -barLayout.height / 2 - 18);
      entry.nameText.setFontSize(this.screenManager.isPortrait() ? '12px' : '14px');
      entry.hpText.setText(`${hpPercent}%`);
      entry.hpText.setPosition(barLayout.width / 2 - 10, -barLayout.height / 2 - 18);
      entry.hpText.setFontSize(this.screenManager.isPortrait() ? '11px' : '13px');
    });
  }

  private createBossBarEntry(): BossBarEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(950);
    container.setScrollFactor(0);

    const background = this.scene.add.rectangle(0, 0, 420, 14, UITheme.barBgColor, 0.82);
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.7);

    const fill = this.scene.add.rectangle(-208, 0, 416, 10, 0xdc2626, 0.95);
    fill.setOrigin(0.5);

    const border = this.scene.add.rectangle(0, 0, 420, 14, 0x000000, 0);
    border.setStrokeStyle(1, 0xfacc15, 0.65);

    const nameText = this.scene.add.text(0, 0, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '14px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    const hpText = this.scene.add.text(0, 0, '', {
      align: 'right',
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '13px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    hpText.setOrigin(1, 0);

    container.add([background, fill, border, nameText, hpText]);

    return { container, background, fill, border, nameText, hpText };
  }

  private getBossBarLayout(
    index: number,
    hudLayout: ReturnType<typeof LayoutConfig.getHudLayout>,
  ): { x: number; y: number; width: number; height: number } {
    const zone = hudLayout.hudZones.topCenter;
    const compact = hudLayout.density === 'compact';
    const width = Math.min(zone.width, compact ? 340 : 420);
    const height = compact ? 12 : 14;
    const gap = compact ? 26 : 32;
    const y = zone.y + (compact ? 24 : 28) + index * gap;

    return {
      x: zone.x + zone.width / 2,
      y,
      width,
      height,
    };
  }

  private getBossBarFillColor(hpRatio: number): number {
    if (hpRatio <= 0.25) {
      return 0xef4444;
    }

    if (hpRatio <= 0.5) {
      return 0xf97316;
    }

    return 0xdc2626;
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
    items: Array<{ id: string; textureKey?: string; label: string; fallback: string; tooltip?: IconTooltipData }>,
    maxRows = this.maxIconRows,
  ): Array<{ id: string; textureKey?: string; label: string; fallback: string; tooltip?: IconTooltipData }> {
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

  private getVisibleRelicItems(state: HUDState): Array<{
    id: string;
    name: string;
    rarity: string;
    iconKey?: string;
    fallback: string;
    tooltip?: IconTooltipData;
  }> {
    const relics = state.relics ?? [];
    const stride = HUD.RELIC_ICON_SIZE + 4;
    const maxByWidth = Math.max(1, Math.floor((this.barWidth - 74) / stride));
    const compact = this.screenManager.isPortrait() || this.screenManager.width <= 900 || this.screenManager.height <= 430;
    const maxItems = Math.max(1, compact
      ? Math.min(this.screenManager.isPortrait() ? 3 : 4, maxByWidth)
      : Math.min(6, maxByWidth));
    const items = relics.map((relic) => ({
      id: relic.id,
      name: relic.name,
      rarity: relic.rarity,
      iconKey: relic.iconKey,
      fallback: this.getInitials(relic.id),
      tooltip: {
        kind: 'relic' as const,
        id: relic.id,
        title: relic.name,
      },
    }));

    if (items.length <= maxItems) {
      return items;
    }

    return [
      ...items.slice(0, Math.max(0, maxItems - 1)),
      {
        id: 'more',
        name: I18n.t('hud.moreRelics', { count: items.length - maxItems + 1 }),
        rarity: 'common',
        fallback: I18n.t('hud.moreRelics', { count: items.length - maxItems + 1 }),
        tooltip: undefined,
      },
    ];
  }

  private getRelicRarityColor(rarity: string): number {
    switch (rarity) {
      case 'legendary':
        return 0xf97316;
      case 'epic':
        return 0xa78bfa;
      case 'rare':
        return 0x60a5fa;
      case 'common':
      default:
        return 0x94a3b8;
    }
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
      cooldown?: HudCooldownStatus;
      showCooldownInHud?: boolean;
      weaponTooltip?: IconTooltipData;
      passiveTooltip?: IconTooltipData;
    }>,
  ): Array<{
    id: string;
    weaponIconKey?: string;
    weaponFallback: string;
    passiveIconKey?: string;
    passiveFallback?: string;
    weaponLevelLabel: string;
    passiveLevelLabel?: string;
    cooldown?: HudCooldownStatus;
    showCooldownInHud?: boolean;
    weaponTooltip?: IconTooltipData;
    passiveTooltip?: IconTooltipData;
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
    this.shieldText.setText(shield.stacks > 0
      ? `${I18n.t('hud.shield')}: ${shield.stacks}${shield.maxStacks ? ` / ${shield.maxStacks}` : ''}`
      : '');
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private formatCooldown(remainingMs: number): string {
    const seconds = Math.max(0, remainingMs / 1000);

    if (seconds >= 10) {
      return `${Math.ceil(seconds)}s`;
    }

    if (seconds >= 1) {
      return `${Math.ceil(seconds * 10) / 10}s`;
    }

    return `${Math.max(0.1, Math.ceil(seconds * 10) / 10)}s`;
  }
}
