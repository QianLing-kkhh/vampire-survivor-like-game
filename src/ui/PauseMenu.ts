import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { AudioManager } from '../audio/AudioManager';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { PassiveDetailInfo } from '../passive/PassiveManager';
import { WeaponDetailInfo } from '../weapon/WeaponManager';
import { HelpOverlay } from './HelpOverlay';
import { SettingsMenu } from './SettingsMenu';
import {
  createModalBlocker,
  setRectangleHitArea,
  setTextHitArea,
  stopPointerEvent,
} from './input/UIInteraction';
import { StatsBuildPanel } from './stats/StatsBuildPanel';
import { StatsBuildSnapshot } from './stats/StatsBuildSnapshot';
import { IconTooltipData } from './tooltip/IconTooltipTypes';
import { attachIconTooltip } from './tooltip/UITooltipManager';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

export type PauseMenuStatsData = StatsBuildSnapshot;

type MenuPage = 'main' | 'stats';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly blocker: Phaser.GameObjects.Rectangle;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly pageItems: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeResize?: () => void;
  private helpOverlay?: HelpOverlay;
  private settingsMenu?: SettingsMenu;
  private statsBuildPanel?: StatsBuildPanel;
  private page: MenuPage = 'main';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly statsData: PauseMenuStatsData,
    private readonly onResume: () => void,
    private readonly onRestart: () => void,
    private readonly onBackToTitle: () => void,
    _onHelp: () => void,
    _onOpenDeveloperScene?: (sceneKey: string) => void,
  ) {
    this.screenManager = new ScreenManager(scene);
    this.blocker = createModalBlocker(scene, 1199);
    this.background = scene.add.rectangle(
      this.screenManager.centerX,
      this.screenManager.centerY,
      440,
      650,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.8);
    this.background.setAlpha(scene.textures.exists('art_ui_pause_panel_bg') ? 0.25 : UITheme.panelBgAlpha);
    this.panelImage = scene.textures.exists('art_ui_pause_panel_bg')
      ? scene.add.image(this.screenManager.centerX, this.screenManager.centerY, 'art_ui_pause_panel_bg')
      : undefined;
    this.panelImage?.setAlpha(UITheme.pausePanelAlpha);

    this.title = scene.add.text(
      this.screenManager.centerX,
      this.screenManager.centerY,
      '',
      {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '34px',
        fontStyle: 'bold',
      },
    );
    this.title.setOrigin(0.5);

    this.container = scene.add.container(0, 0, [
      this.background,
      ...(this.panelImage ? [this.panelImage] : []),
      this.title,
    ]);
    this.container.setDepth(1200);
    this.renderMainPage();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
  }

  destroy(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = undefined;
    this.settingsMenu?.destroy();
    this.settingsMenu = undefined;
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = undefined;
    this.clearPageItems();
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.blocker.destroy();
    this.container.destroy(true);
  }

  private renderMainPage(): void {
    this.page = 'main';
    this.clearPageItems();
    this.title.setText(I18n.t('pause.title'));
    const buttons = [
      { label: I18n.t('pause.resume'), action: this.onResume },
      { label: I18n.t('pause.restart'), action: this.onRestart },
      { label: I18n.t('pause.returnToTitle'), action: this.onBackToTitle },
      {
        label: I18n.t('pause.statsBuild'),
        action: () => this.showStatsBuildPanel(),
      },
      {
        label: I18n.t('pause.settings'),
        action: () => this.showSettingsMenu(),
      },
      {
        label: I18n.t('common.help'),
        action: () => this.showHelpOverlay(),
      },
    ];

    for (const button of buttons) {
      this.pageItems.push(this.createButton(button.label, button.action));
    }

    this.applyLayout();
  }

  private showStatsBuildPanel(): void {
    this.statsBuildPanel?.destroy();
    this.statsBuildPanel = new StatsBuildPanel(this.scene, {
      snapshot: this.statsData,
      onClose: () => {
        this.statsBuildPanel?.destroy();
        this.statsBuildPanel = undefined;
      },
    });
  }

  private addWeaponBlock(weapon: WeaponDetailInfo): void {
    const weaponLevelText = `Lv.${weapon.level} / ${weapon.maxLevel}`;
    this.addIconText(
      this.resolveWeaponIconKey(weapon.displayWeaponId, weapon.iconKey),
      this.getInitials(weapon.displayWeaponId),
      `${weaponLevelText}${weapon.evolved ? ` ${I18n.t('hud.evolved')}` : ''}`,
      { kind: 'weapon', id: weapon.displayWeaponId, title: weapon.displayName },
    );

    if (weapon.evolved) {
      this.addMutedText(I18n.t('pause.weaponEvolvedFrom'));
    }

    if (weapon.requiredPassiveId) {
      const passiveLevelText = `Lv.${weapon.passiveLevel ?? 0} / ${weapon.requiredPassiveLevel ?? 5}`;
      this.addIconText(
        this.resolvePassiveIconKey(weapon.requiredPassiveId, weapon.requiredPassiveIconKey),
        this.getInitials(weapon.requiredPassiveName ?? weapon.requiredPassiveId),
        `${I18n.t('pause.requires')}: ${passiveLevelText}`,
        { kind: 'passive', id: weapon.requiredPassiveId, title: weapon.requiredPassiveName },
      );
    }

    for (const [label, value] of Object.entries(weapon.stats)) {
      this.addStatRow(this.getWeaponStatLabel(label), this.formatNumber(value));
    }

    this.addStatRow(I18n.t('pause.weaponTotalDamage'), this.formatInteger(weapon.runtimeStats.damageDealt));
    this.addStatRow(I18n.t('pause.hits'), `${weapon.runtimeStats.hits}`);
    this.addStatRow(I18n.t('pause.kills'), `${weapon.runtimeStats.kills}`);
  }

  private addPassiveBlock(passive: PassiveDetailInfo): void {
    this.addIconText(
      this.resolvePassiveIconKey(passive.passiveId, passive.iconKey),
      this.getInitials(passive.passiveId),
      `Lv.${passive.level} / ${passive.maxLevel}`,
      { kind: 'passive', id: passive.passiveId, title: passive.displayName },
    );
    this.addStatRow(passive.effectLabel, passive.effectValue);

    if (passive.relatedWeaponIds.length > 0) {
      for (const weaponId of passive.relatedWeaponIds) {
        this.addIconText(
          this.resolveWeaponIconKey(weaponId),
          this.getInitials(weaponId),
          this.getInitials(weaponId),
          { kind: 'weapon', id: weaponId },
        );
      }
    }
  }

  private addSectionTitle(label: string): void {
    const text = this.scene.add.text(0, 0, label, {
      color: UITheme.successTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '17px',
      fontStyle: 'bold',
    });
    this.pageItems.push(text);
    this.container.add(text);
  }

  private addStatRow(label: string, value: string, iconKey?: string): void {
    if (iconKey) {
      this.addIconText(iconKey, label.charAt(0), `${label}: ${value}`, {
        kind: 'generic',
        id: label,
        title: label,
      });
      return;
    }

    const text = this.scene.add.text(0, 0, `${label}: ${value}`, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '13px',
    });
    this.pageItems.push(text);
    this.container.add(text);
  }

  private addMutedText(label: string): void {
    const text = this.scene.add.text(0, 0, label, {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '12px',
    });
    this.pageItems.push(text);
    this.container.add(text);
  }

  private resolveWeaponIconKey(weaponId: string, fallbackKey?: string): string | undefined {
    return AssetKeyResolver.getWeaponIconKey(this.scene, weaponId)
      ?? (fallbackKey && this.scene.textures.exists(fallbackKey) ? fallbackKey : undefined);
  }

  private resolvePassiveIconKey(passiveId: string, fallbackKey?: string): string | undefined {
    return AssetKeyResolver.getPassiveIconKey(this.scene, passiveId)
      ?? (fallbackKey && this.scene.textures.exists(fallbackKey) ? fallbackKey : undefined);
  }

  private addIconText(
    iconKey: string | undefined,
    fallback: string,
    label: string,
    tooltip?: IconTooltipData,
  ): void {
    const group = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 22, 22, UITheme.iconBgColor, 0.82);
    bg.setStrokeStyle(1, UITheme.panelBorderColor, 0.45);
    bg.setInteractive({ useHandCursor: tooltip !== undefined });
    attachIconTooltip(this.scene, bg, tooltip);
    group.add(bg);

    if (iconKey && this.scene.textures.exists(iconKey)) {
      const icon = this.scene.add.image(0, 0, iconKey);
      icon.setDisplaySize(18, 18);
      group.add(icon);
    } else {
      const fallbackText = this.scene.add.text(0, 0, fallback, {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: '10px',
        fontStyle: 'bold',
      });
      fallbackText.setOrigin(0.5);
      group.add(fallbackText);
    }

    const text = this.scene.add.text(18, -8, label, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: '13px',
    });
    group.add(text);
    this.pageItems.push(group);
    this.container.add(group);
  }

  private createButton(
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const button = this.scene.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: getButtonMetrics(this.screenManager.width, this.screenManager.height).fontSize,
      align: 'center',
      fixedWidth: getButtonMetrics(this.screenManager.width, this.screenManager.height).width,
      fixedHeight: getButtonMetrics(this.screenManager.width, this.screenManager.height).height,
      padding: {
        x: 0,
        y: Math.max(0, Math.floor((getButtonMetrics(this.screenManager.width, this.screenManager.height).height - 22) / 2)),
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor));
    });
    button.on('pointerout', () => {
      button.setBackgroundColor(toCssColor(UITheme.buttonBgColor));
    });
    button.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      AudioManager.playUi(this.scene, 'ui_click');
      onClick();
    });
    this.container.add(button);

    return button;
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getPauseMenuLayout(this.screenManager);

    setRectangleHitArea(this.blocker, this.screenManager.width, this.screenManager.height);
    this.background.setPosition(layout.panelCenter.x, layout.panelCenter.y);
    this.background.setSize(layout.panelWidth, layout.panelHeight);
    this.panelImage?.setPosition(layout.panelCenter.x, layout.panelCenter.y);
    this.coverImage(this.panelImage, layout.panelWidth, layout.panelHeight);
    this.title.setPosition(layout.panelCenter.x, layout.panelCenter.y - layout.panelHeight / 2 + 34);
    this.title.setFontSize(this.screenManager.isPortrait() ? '24px' : '30px');

    if (this.page === 'main') {
      this.layoutMainButtons(layout);
      return;
    }

    this.layoutStatsItems(layout);
  }

  private layoutMainButtons(layout: ReturnType<typeof LayoutConfig.getPauseMenuLayout>): void {
    const buttonLayout = LayoutConfig.getButtonLayout(this.screenManager, this.pageItems.length, {
      centerX: layout.panelCenter.x,
      startY: layout.panelCenter.y + 44,
      mode: 'vertical',
      maxColumns: 1,
    });

    this.pageItems.forEach((item, index) => {
      if (!('setPosition' in item)) {
        return;
      }

      const button = item as Phaser.GameObjects.Text;
      const position = buttonLayout.positions[index];
      button.setPosition(position.x, position.y);
      button.setFontSize(buttonLayout.fontSize);
      setTextHitArea(button, buttonLayout.width, buttonLayout.height);
    });
  }

  private layoutStatsItems(layout: ReturnType<typeof LayoutConfig.getPauseMenuLayout>): void {
    const left = layout.panelCenter.x - layout.panelWidth / 2 + 24;
    let y = layout.panelCenter.y - layout.panelHeight / 2 + 72;
    const backButton = this.pageItems[this.pageItems.length - 1] as Phaser.GameObjects.Text | undefined;
    const bottomLimit = layout.panelCenter.y + layout.panelHeight / 2 - 76;
    const textRowGap = this.screenManager.isPortrait() ? 17 : 18;
    const iconRowGap = this.screenManager.isPortrait() ? 25 : 26;
    const fontSize = this.screenManager.isPortrait() ? '10px' : '12px';
    let hiddenCount = 0;

    for (const item of this.pageItems.slice(0, -1)) {
      const itemHeight = item instanceof Phaser.GameObjects.Container ? iconRowGap : textRowGap;

      if (y + itemHeight > bottomLimit) {
        this.setPageItemVisible(item, false);
        hiddenCount += 1;
        continue;
      }

      this.setPageItemVisible(item, true);

      if (item instanceof Phaser.GameObjects.Text) {
        item.setPosition(left, y);
        item.setFontSize(fontSize);
        y += textRowGap;
        continue;
      }

      if (item instanceof Phaser.GameObjects.Container) {
        item.setPosition(left + 12, y + 8);
        y += iconRowGap;
      }
    }

    void hiddenCount;

    if (backButton) {
      const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
      backButton.setVisible(true);
      backButton.setPosition(layout.panelCenter.x, layout.panelCenter.y + layout.panelHeight / 2 - 38);
      backButton.setFontSize(metrics.fontSize);
      setTextHitArea(backButton, metrics.width, metrics.height);
    }
  }

  private clearPageItems(): void {
    for (const item of this.pageItems) {
      item.destroy();
    }

    this.pageItems.length = 0;
  }

  private setPageItemVisible(item: Phaser.GameObjects.GameObject, visible: boolean): void {
    if (item instanceof Phaser.GameObjects.Text || item instanceof Phaser.GameObjects.Container) {
      item.setVisible(visible);
    }
  }

  private showHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this.scene, () => {
      this.helpOverlay = undefined;
    });
  }

  private showSettingsMenu(): void {
    this.settingsMenu?.destroy();
    this.settingsMenu = new SettingsMenu(this.scene, () => {
      this.settingsMenu?.destroy();
      this.settingsMenu = undefined;
      this.renderMainPage();
    }, () => {
      if (this.page === 'main') {
        this.renderMainPage();
      }
    });
  }

  private coverImage(
    image: Phaser.GameObjects.Image | undefined,
    width: number,
    height: number,
  ): void {
    if (!image) {
      return;
    }

    const frame = image.texture.get();
    image.setScale(Math.max(width / frame.width, height / frame.height));
  }

  private formatInteger(value: number): string {
    return Math.round(value).toString();
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2).replace(/\.?0+$/, '');
  }

  private getWeaponStatLabel(label: string): string {
    const key = `pause.weaponStat.${label.toLowerCase().replace(/\\s+/g, '')}`;
    const translated = I18n.t(key);

    return translated === key ? label : translated;
  }

  private formatTime(timeSeconds: number): string {
    const totalSeconds = Math.floor(timeSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }
}
