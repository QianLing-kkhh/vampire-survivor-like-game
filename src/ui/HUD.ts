import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { I18n } from '../i18n/I18n';
import { MapMechanicDefinition } from '../map/mechanics/MapMechanicDefinition';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SettingsManager } from '../settings/SettingsManager';
import { UIButton } from './components/UIButton';
import { UICooldownOverlay } from './components/UICooldownOverlay';
import { UIIconFrame } from './components/UIIconFrame';
import { UIIconSlot } from './components/UIIconSlot';
import { UIProgressBar } from './components/UIProgressBar';
import { UITextBlock } from './components/UITextBlock';
import type { LiveStrategyControlState } from './LiveStrategyControlPanel';
import { MinimapOverlay } from './minimap/MinimapOverlay';
import { MinimapEnemyPosition, MinimapViewport, WorldPosition } from './minimap/MinimapTypes';
import { IconTooltipData } from './tooltip/IconTooltipTypes';
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
  slot: UIIconSlot;
  label: Phaser.GameObjects.Text;
  tooltipData?: IconTooltipData;
};

type BuildEntry = {
  container: Phaser.GameObjects.Container;
  weaponSlot: UIIconSlot;
  passiveSlot: UIIconSlot;
  weaponLevelLabel: Phaser.GameObjects.Text;
  passiveLevelLabel: Phaser.GameObjects.Text;
  weaponCooldown: UICooldownOverlay;
  weaponTooltipData?: IconTooltipData;
  passiveTooltipData?: IconTooltipData;
};

type CharacterPortraitEntry = {
  container: Phaser.GameObjects.Container;
  slot: UIIconSlot;
  cooldown: UICooldownOverlay;
  tooltipData?: IconTooltipData;
  size: number;
};

type RelicIconEntry = {
  container: Phaser.GameObjects.Container;
  frame?: Phaser.GameObjects.Container;
  visualKey?: string;
};

type BossBarEntry = {
  container: Phaser.GameObjects.Container;
  progressBar: UIProgressBar;
  nameText: Phaser.GameObjects.Text;
  hpText: Phaser.GameObjects.Text;
};

export class HUD {
  private static readonly SHOW_DEBUG_OVERLAY = false;
  private static readonly BAR_WIDTH = 230;
  private static readonly BAR_HEIGHT = 14;
  private static readonly ICON_SIZE = 28;
  private static readonly BUILD_ICON_SIZE = 56;
  private static readonly BUILD_ROW_HEIGHT = 64;
  private static readonly BUILD_WEAPON_LEVEL_X = 34;
  private static readonly BUILD_PASSIVE_ICON_X = 136;
  private static readonly RELIC_ICON_SIZE = 22;

  private readonly scene: Phaser.Scene;
  private readonly screenManager: ScreenManager;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly hpBar: UIProgressBar;
  private readonly expText: Phaser.GameObjects.Text;
  private readonly expBar: UIProgressBar;
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
  private readonly pauseButton: UIButton;
  private barWidth = HUD.BAR_WIDTH;
  private buildIconSize = HUD.BUILD_ICON_SIZE;
  private buildRowHeight = HUD.BUILD_ROW_HEIGHT;
  private maxIconRows = 6;
  private maxPassiveRows = 3;

  constructor(scene: Phaser.Scene, private readonly onPause?: () => void) {
    this.scene = scene;
    this.screenManager = new ScreenManager(scene);
    this.characterPortraitEntry = this.createCharacterPortraitEntry();
    this.hpText = this.createText(16, 12, UITheme.smallFontSize);
    this.hpBar = new UIProgressBar(scene, {
      x: 16,
      y: 34,
      width: HUD.BAR_WIDTH,
      height: HUD.BAR_HEIGHT,
      variant: 'hp',
      compact: true,
    });
    this.hpBar.container.setDepth(900);
    this.hpBar.container.setScrollFactor(0);
    this.expText = this.createText(16, 54, UITheme.smallFontSize);
    this.expBar = new UIProgressBar(scene, {
      x: 16,
      y: 76,
      width: HUD.BAR_WIDTH,
      height: HUD.BAR_HEIGHT,
      variant: 'exp',
      compact: true,
    });
    this.expBar.container.setDepth(900);
    this.expBar.container.setScrollFactor(0);
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

    this.pauseButton = new UIButton(scene, {
      x: 0,
      y: 0,
      width: 92,
      height: 40,
      size: 'small',
      label: I18n.t('ui.pause'),
      onClick: () => {
        this.onPause?.();
      },
    });
    this.pauseButton.container.setDepth(1200);
    this.pauseButton.container.setScrollFactor(0);

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
    this.hpBar.destroy();
    this.expText.destroy();
    this.expBar.destroy();
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
    const showRelics = this.shouldShowRelics(state);
    const layout = this.applyLayout(showRelics);
    const currentHp = this.formatInteger(state.currentHp);
    const maxHp = this.formatInteger(state.playerMaxHp ?? state.maxHp);
    const exp = Math.floor(state.currentExp);
    const requiredExp = Math.max(1, Math.floor(state.requiredExp));

    this.hpText.setText(`${I18n.t('hud.hp')} ${currentHp} / ${maxHp}`);
    this.hpBar.setRatio(state.currentHp / Math.max(state.playerMaxHp ?? state.maxHp, 1));
    this.expText.setText(`${I18n.t('hud.level')}.${state.level}  ${I18n.t('hud.exp')} ${exp} / ${requiredExp}`);
    this.expBar.setRatio(state.currentExp / requiredExp);
    this.timeText.setText(`${I18n.t('hud.time')} ${this.formatTime(state.timeSeconds)}`);
    this.scoreText.setText(`${I18n.t('hud.score')} ${this.formatInteger(state.score)}`);
    this.relicText.setVisible(showRelics);
    this.relicText.setText(showRelics ? `${I18n.t('hud.relics')}: ${state.relicCount ?? 0}` : '');
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

      this.layoutIconEntry(entry);
      entry.container.setPosition(x, y + index * this.buildRowHeight);
      entry.container.setVisible(true);
      entry.label.setText(item.label);
      entry.tooltipData = item.tooltip;
      entry.slot.setVisual(item.textureKey, item.fallback);
    });
  }

  private createIconEntry(): IconEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const slot = new UIIconSlot(this.scene, {
      x: 0,
      y: 0,
      size: this.buildIconSize,
      fillAlpha: 0,
      borderAlpha: 0.55,
    });
    const label = new UITextBlock(this.scene, {
      x: this.buildIconSize / 2 + 10,
      y: -12,
      fontSize: this.getBuildLevelFontSize(),
      fontStyle: 'bold',
      align: 'left',
    }).text;

    container.add([slot.container, label]);
    const entry: IconEntry = { container, slot, label };
    slot.setTooltip(() => container.visible ? entry.tooltipData : undefined);
    return entry;
  }

  private layoutIconEntry(entry: IconEntry): void {
    entry.slot.setSize(this.buildIconSize);
    entry.label.setPosition(this.buildIconSize / 2 + 10, this.getBuildLevelY());
    entry.label.setFontSize(this.getBuildLevelFontSize());
  }

  private updateRelicIconList(state: HUDState, layout: ReturnType<typeof LayoutConfig.getHudLayout>): void {
    const items = this.getVisibleRelicItems(state);
    if (items.length === 0) {
      this.relicEntries.forEach((entry) => {
        entry.container.setVisible(false);
      });
      return;
    }

    const tiny = layout.density === 'tiny';
    const compact = layout.density === 'compact' || tiny;
    const iconSize = tiny ? 18 : compact ? 20 : HUD.RELIC_ICON_SIZE;
    const gap = tiny ? 3 : 4;
    const labelWidth = tiny ? 44 : compact ? 50 : 68;
    const startX = this.relicText.x + labelWidth + iconSize / 2;
    const y = this.relicText.y + (tiny ? 8 : 9);

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
      const textureKey = item.iconKey && this.scene.textures.exists(item.iconKey)
        ? item.iconKey
        : undefined;
      const visualKey = textureKey
        ? `texture:${textureKey}:${item.rarity}`
        : `fallback:${item.fallback}:${item.rarity}`;

      if (entry.visualKey === visualKey) {
        return;
      }

      entry.frame?.destroy(true);
      entry.frame = undefined;
      entry.visualKey = visualKey;

      entry.frame = UIIconFrame.create(this.scene, {
        x: 0,
        y: 0,
        size: iconSize,
        textureKey,
        fallback: item.fallback,
        tooltip: item.tooltip,
        tooltipLockOnClick: false,
        fillAlpha: 0.86,
        borderColor: this.getRelicRarityColor(item.rarity),
        borderAlpha: 0.82,
      });
      entry.container.add(entry.frame);
    });
  }

  private createRelicIconEntry(): RelicIconEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(902);
    container.setScrollFactor(0);
    return { container };
  }

  private createCharacterPortraitEntry(): CharacterPortraitEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const slot = new UIIconSlot(this.scene, {
      x: 0,
      y: 0,
      size: 56,
      fillAlpha: 0.86,
      borderAlpha: 0.72,
    });
    const cooldown = new UICooldownOverlay(this.scene, {
      size: 56,
      textFontSize: '16px',
    });
    container.add([slot.container, cooldown.container]);

    const entry: CharacterPortraitEntry = {
      container,
      slot,
      cooldown,
      size: 56,
    };
    slot.setTooltip(() => container.visible ? entry.tooltipData : undefined);
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
    entry.slot.setVisual(textureKey, fallback);

    this.updateCooldownOverlay(entry.cooldown, info.damageReactionCooldown);
  }

  private updateCooldownOverlay(
    overlay: UICooldownOverlay,
    cooldown: HudCooldownStatus | undefined,
  ): void {
    const showText = SettingsManager.getGameplay().showDetailedCooldownTime;
    overlay.update(
      cooldown
        ? {
          ...cooldown,
          label: this.formatCooldown(cooldown.remainingMs),
        }
        : undefined,
      showText,
    );
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

      this.layoutBuildEntry(entry);
      entry.container.setPosition(x, y + index * this.buildRowHeight);
      entry.container.setVisible(true);
      entry.weaponLevelLabel.setText(item.weaponLevelLabel);
      entry.passiveLevelLabel.setText(item.passiveLevelLabel ?? '');
      entry.passiveSlot.container.setVisible(item.passiveIconKey !== undefined || item.passiveFallback !== undefined);
      entry.passiveLevelLabel.setVisible(item.passiveLevelLabel !== undefined);
      entry.weaponTooltipData = item.weaponTooltip;
      entry.passiveTooltipData = item.passiveTooltip;
      this.updateCooldownOverlay(
        entry.weaponCooldown,
        item.showCooldownInHud === false ? undefined : item.cooldown,
      );
      entry.weaponSlot.setVisual(item.weaponIconKey, item.weaponFallback);
      entry.passiveSlot.setVisual(item.passiveIconKey, item.passiveFallback ?? '');
    });
  }

  private createBuildEntry(): BuildEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(900);
    container.setScrollFactor(0);
    const weaponSlot = new UIIconSlot(this.scene, {
      x: 0,
      y: 0,
      size: this.buildIconSize,
      fillAlpha: 0,
      borderAlpha: 0.55,
    });
    const passiveSlot = new UIIconSlot(this.scene, {
      x: this.getBuildPassiveIconX(),
      y: 0,
      size: this.buildIconSize,
      fillAlpha: 0,
      borderAlpha: 0.4,
    });
    const weaponLevelLabel = new UITextBlock(this.scene, {
      x: this.getBuildWeaponLevelX(),
      y: this.getBuildLevelY(),
      fontSize: this.getBuildLevelFontSize(),
      fontStyle: 'bold',
      align: 'left',
    }).text;
    weaponLevelLabel.setStroke('#111827', 3);
    const passiveLevelLabel = new UITextBlock(this.scene, {
      x: this.getBuildPassiveLevelX(),
      y: this.getBuildLevelY(),
      fontSize: this.getBuildLevelFontSize(),
      fontStyle: 'bold',
      align: 'left',
    }).text;
    passiveLevelLabel.setStroke('#111827', 3);
    const weaponCooldown = new UICooldownOverlay(this.scene, {
      size: this.buildIconSize,
      textFontSize: this.getBuildCooldownFontSize(),
    });

    container.add([
      weaponSlot.container,
      passiveSlot.container,
      weaponLevelLabel,
      passiveLevelLabel,
      weaponCooldown.container,
    ]);
    const entry: BuildEntry = {
      container,
      weaponSlot,
      passiveSlot,
      weaponLevelLabel,
      passiveLevelLabel,
      weaponCooldown,
    };
    weaponSlot.setTooltip(() => container.visible ? entry.weaponTooltipData : undefined);
    passiveSlot.setTooltip(() => (
      container.visible && passiveSlot.container.visible ? entry.passiveTooltipData : undefined
    ));
    return entry;
  }

  private layoutBuildEntry(entry: BuildEntry): void {
    const passiveX = this.getBuildPassiveIconX();
    entry.weaponSlot.setSize(this.buildIconSize);
    entry.passiveSlot.setSize(this.buildIconSize);
    entry.passiveSlot.container.setPosition(passiveX, 0);
    entry.weaponLevelLabel.setPosition(this.getBuildWeaponLevelX(), this.getBuildLevelY());
    entry.weaponLevelLabel.setFontSize(this.getBuildLevelFontSize());
    entry.passiveLevelLabel.setPosition(this.getBuildPassiveLevelX(), this.getBuildLevelY());
    entry.passiveLevelLabel.setFontSize(this.getBuildLevelFontSize());
    entry.weaponCooldown.setSize(this.buildIconSize);
    entry.weaponCooldown.setFontSize(this.getBuildCooldownFontSize());
  }

  private getBuildScale(): number {
    return this.buildIconSize / HUD.BUILD_ICON_SIZE;
  }

  private getBuildWeaponLevelX(): number {
    return Math.max(
      this.buildIconSize / 2 + 8,
      Math.round(HUD.BUILD_WEAPON_LEVEL_X * this.getBuildScale()),
    );
  }

  private getBuildPassiveIconX(): number {
    return Math.round(HUD.BUILD_PASSIVE_ICON_X * this.getBuildScale());
  }

  private getBuildPassiveLevelX(): number {
    return this.getBuildPassiveIconX() + this.buildIconSize / 2 + 8;
  }

  private getBuildLevelY(): number {
    return -Math.max(10, Math.round(this.buildIconSize * 0.25));
  }

  private getBuildLevelFontSize(): string {
    if (this.buildIconSize <= 44) {
      return '13px';
    }
    if (this.buildIconSize <= 50) {
      return '15px';
    }
    return '17px';
  }

  private getBuildCooldownFontSize(): string {
    if (this.buildIconSize <= 44) {
      return '12px';
    }
    if (this.buildIconSize <= 50) {
      return '14px';
    }
    return '16px';
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
      textureKey: AssetKeyResolver.getWeaponIconKey(
        this.scene,
        weapon.weaponId,
        this.getTierInputFromWeaponSummary(weapon.upgradeSummary),
      ) ?? undefined,
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
      weaponIconKey: AssetKeyResolver.getWeaponIconKey(this.scene, info.weaponId, {
        level: info.weaponLevel,
        maxLevel: info.weaponLevelMax,
        evolved: info.evolved,
      })
        ?? info.weaponIconKey,
      weaponFallback: this.getInitials(info.weaponId),
      passiveIconKey: info.passiveId
        ? AssetKeyResolver.getPassiveIconKey(this.scene, info.passiveId, {
          level: info.passiveLevel,
          maxLevel: info.passiveLevelMax,
        }) ?? info.passiveIconKey
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
        textureKey: AssetKeyResolver.getPassiveIconKey(this.scene, passive.id, {
          level: passive.level,
          maxLevel: 5,
        }) ?? undefined,
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
      textureKey: AssetKeyResolver.getPassiveIconKey(this.scene, passive.id, {
        level: passive.level,
        maxLevel: 5,
      }) ?? undefined,
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

  private getTierInputFromWeaponSummary(
    upgradeSummary: string,
  ): { level?: number; maxLevel?: number; evolved?: boolean } {
    const match = /Total Lv\.(\d+) \/ (\d+)/.exec(upgradeSummary);

    return {
      level: match ? Number(match[1]) : undefined,
      maxLevel: match ? Number(match[2]) : undefined,
      evolved: upgradeSummary === 'Evolved' || /\bEvolved\b/i.test(upgradeSummary),
    };
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
    const text = new UITextBlock(this.scene, {
      x,
      y,
      fontSize,
      align: 'left',
    }).text;
    text.setColor(color);
    text.setDepth(900);
    text.setScrollFactor(0);
    return text;
  }

  private applyLayout(showRelics = true): ReturnType<typeof LayoutConfig.getHudLayout> {
    const layout = LayoutConfig.getHudLayout(this.screenManager);
    const stats = layout.statsPosition;
    const contentY = stats.y + layout.statsContentOffsetY;
    const tiny = layout.density === 'tiny';
    const compact = layout.density === 'compact' || tiny;
    const statGap = tiny ? 13 : compact ? 15 : 17;

    this.barWidth = layout.barWidth;
    this.buildIconSize = layout.buildIconSize;
    this.buildRowHeight = layout.buildRowHeight;
    this.maxIconRows = layout.maxIconRows;
    this.maxPassiveRows = layout.maxPassiveRows;

    this.characterPortraitEntry.container.setPosition(
      layout.characterPortraitPosition.x,
      layout.characterPortraitPosition.y,
    );
    this.characterPortraitEntry.size = layout.characterPortraitSize;
    this.characterPortraitEntry.slot.setSize(layout.characterPortraitSize);
    this.characterPortraitEntry.cooldown.setSize(layout.characterPortraitSize);

    this.hpText.setPosition(stats.x, contentY);
    this.hpText.setFontSize(layout.fontSize);
    this.hpBar.container.setPosition(stats.x, contentY + statGap);
    this.hpBar.resize(this.barWidth, tiny ? 8 : compact ? 10 : 12);
    this.expText.setPosition(stats.x, contentY + statGap + (tiny ? 11 : compact ? 13 : 15));
    this.expText.setFontSize(layout.fontSize);
    this.expBar.container.setPosition(stats.x, contentY + statGap + (tiny ? 24 : compact ? 29 : 33));
    this.expBar.resize(this.barWidth, tiny ? 8 : compact ? 10 : 12);
    this.timeText.setPosition(stats.x, contentY + (tiny ? 50 : compact ? 58 : 66));
    this.timeText.setFontSize(tiny ? '15px' : compact ? '17px' : '20px');
    this.scoreText.setPosition(stats.x, contentY + (tiny ? 70 : compact ? 80 : 90));
    this.scoreText.setFontSize(tiny ? '13px' : compact ? '15px' : '17px');
    const relicY = contentY + (tiny ? 90 : compact ? 100 : 112);
    const goalY = showRelics
      ? contentY + (tiny ? 106 : compact ? 118 : 132)
      : relicY;
    const shieldY = showRelics
      ? contentY + (tiny ? 122 : compact ? 136 : 150)
      : goalY + (tiny ? 16 : compact ? 18 : 20);

    this.relicText.setPosition(stats.x, relicY);
    this.relicText.setFontSize(layout.fontSize);
    this.goalText.setPosition(stats.x, goalY);
    this.goalText.setFontSize(layout.fontSize);
    this.messageText.setPosition(layout.bossTextPosition.x, layout.bossTextPosition.y);
    this.messageText.setOrigin(0.5);
    this.shieldText.setPosition(stats.x, shieldY);
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
    this.pauseButton.setSize(layout.pauseButtonRect.width, layout.pauseButtonRect.height);

    return layout;
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
        layout.density === 'tiny'
          ? '20px'
          : layout.density === 'compact'
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
      const hpPercent = Math.round(Phaser.Math.Clamp(boss.hpRatio, 0, 1) * 100);

      entry.container.setVisible(true);
      entry.container.setPosition(barLayout.x, barLayout.y);
      entry.progressBar.container.setPosition(-barLayout.width / 2, -barLayout.height / 2);
      entry.progressBar.resize(barLayout.width, barLayout.height);
      entry.progressBar.setRatio(boss.hpRatio);
      entry.progressBar.setFillColor(this.getBossBarFillColor(boss.hpRatio));
      entry.nameText.setText(boss.name);
      const labelOffsetY = layout.density === 'tiny' ? 14 : layout.density === 'compact' ? 16 : 18;
      entry.nameText.setPosition(-barLayout.width / 2 + 8, -barLayout.height / 2 - labelOffsetY);
      entry.nameText.setFontSize(layout.density === 'tiny' ? '10px' : layout.density === 'compact' ? '11px' : '13px');
      entry.hpText.setText(`${hpPercent}%`);
      entry.hpText.setPosition(barLayout.width / 2 - 8, -barLayout.height / 2 - labelOffsetY);
      entry.hpText.setFontSize(layout.density === 'tiny' ? '9px' : layout.density === 'compact' ? '10px' : '12px');
    });
  }

  private createBossBarEntry(): BossBarEntry {
    const container = this.scene.add.container(0, 0);
    container.setDepth(950);
    container.setScrollFactor(0);

    const progressBar = new UIProgressBar(this.scene, {
      x: -210,
      y: -7,
      width: 420,
      height: 14,
      variant: 'boss',
      compact: true,
    });

    const nameText = new UITextBlock(this.scene, {
      x: 0,
      y: 0,
      fontSize: '14px',
      fontStyle: 'bold',
      align: 'left',
    }).text;
    nameText.setStroke('#000000', 3);

    const hpText = new UITextBlock(this.scene, {
      x: 0,
      y: 0,
      align: 'right',
      fontSize: '13px',
      fontStyle: 'bold',
      tone: 'muted',
    }).text;
    hpText.setStroke('#000000', 3);

    container.add([progressBar.container, nameText, hpText]);

    return { container, progressBar, nameText, hpText };
  }

  private getBossBarLayout(
    index: number,
    hudLayout: ReturnType<typeof LayoutConfig.getHudLayout>,
  ): { x: number; y: number; width: number; height: number } {
    const zone = hudLayout.hudZones.topCenter;
    const tiny = hudLayout.density === 'tiny';
    const compact = hudLayout.density === 'compact' || tiny;
    const width = Math.min(zone.width, tiny ? 220 : compact ? 280 : hudLayout.density === 'spacious' ? 420 : 360);
    const height = tiny ? 8 : compact ? 10 : 12;
    const gap = tiny ? 18 : compact ? 22 : 28;
    const y = zone.y + (tiny ? 14 : compact ? 20 : 24) + index * gap;

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
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const iconSize = density === 'tiny' ? 18 : density === 'compact' ? 20 : HUD.RELIC_ICON_SIZE;
    const stride = iconSize + (density === 'tiny' ? 3 : 4);
    const maxByWidth = Math.max(1, Math.floor((this.barWidth - (density === 'tiny' ? 50 : 64)) / stride));
    const compact = density === 'compact' || density === 'tiny';
    const maxItems = Math.max(1, compact
      ? Math.min(density === 'tiny' ? 2 : this.screenManager.isPortrait() ? 3 : 4, maxByWidth)
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

  private shouldShowRelics(state: HUDState): boolean {
    return (state.relicCount ?? 0) > 0 || (state.relics?.length ?? 0) > 0;
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
