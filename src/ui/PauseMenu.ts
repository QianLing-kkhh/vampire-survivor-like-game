import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { PassiveDetailInfo } from '../passive/PassiveManager';
import { WeaponDetailInfo } from '../weapon/WeaponManager';
import { HelpOverlay } from './HelpOverlay';
import { UITheme, getButtonMetrics, toCssColor } from './UITheme';

export interface PauseMenuStatsData {
  character: {
    currentHp: number;
    maxHp: number;
    moveSpeed: number;
    pickupRange: number;
    expMultiplier: number;
    level: number;
    currentExp: number;
    requiredExp: number;
    damageTaken: number;
    killCount: number;
    treasureOpenCount: number;
    bossPhaseDamageTaken: number;
    endlessMode: boolean;
    endlessStarted: boolean;
    endlessTimeSeconds: number;
  };
  weapons: WeaponDetailInfo[];
  passives: PassiveDetailInfo[];
}

type MenuPage = 'main' | 'stats';

export class PauseMenu {
  private readonly container: Phaser.GameObjects.Container;
  private readonly screenManager: ScreenManager;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly panelImage?: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly pageItems: Phaser.GameObjects.GameObject[] = [];
  private unsubscribeResize?: () => void;
  private helpOverlay?: HelpOverlay;
  private page: MenuPage = 'main';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly statsData: PauseMenuStatsData,
    private readonly onResume: () => void,
    private readonly onRestart: () => void,
    private readonly onBackToTitle: () => void,
    _onHelp: () => void,
  ) {
    this.screenManager = new ScreenManager(scene);
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
    this.clearPageItems();
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager.dispose();
    this.container.destroy(true);
  }

  private renderMainPage(): void {
    this.page = 'main';
    this.clearPageItems();
    this.title.setText(I18n.t('pause.title'));
    const settings = PlaytestSettings.get();
    const buttons = [
      { label: I18n.t('pause.resume'), action: this.onResume },
      { label: I18n.t('pause.restart'), action: this.onRestart },
      { label: I18n.t('pause.returnToTitle'), action: this.onBackToTitle },
      {
        label: `${I18n.t('common.autoMode')}: ${settings.autoMode ? I18n.t('common.on') : I18n.t('common.off')}`,
        action: () => {
          PlaytestSettings.toggleAutoMode();
          this.renderMainPage();
        },
      },
      {
        label: `${I18n.t('common.fastMode')}: ${settings.fastMode ? I18n.t('common.on') : I18n.t('common.off')}`,
        action: () => {
          PlaytestSettings.toggleFastMode();
          this.renderMainPage();
        },
      },
      {
        label: `Endless Mode: ${settings.endlessMode ? I18n.t('common.on') : I18n.t('common.off')}`,
        action: () => {
          PlaytestSettings.toggleEndlessMode();
          this.renderMainPage();
        },
      },
      {
        label: `${I18n.t('common.sound')}: ${settings.soundEnabled ? I18n.t('common.on') : I18n.t('common.off')}`,
        action: () => {
          PlaytestSettings.toggleSoundEnabled();
          this.renderMainPage();
        },
      },
      {
        label: `${I18n.t('common.language')}: ${I18n.getLocaleDisplayName()}`,
        action: () => {
          I18n.cycleLocale();
          this.renderMainPage();
        },
      },
      {
        label: I18n.t('common.help'),
        action: () => this.showHelpOverlay(),
      },
      {
        label: 'Stats / Build',
        action: () => this.renderStatsPage(),
      },
    ];

    for (const button of buttons) {
      this.pageItems.push(this.createButton(button.label, button.action));
    }

    this.applyLayout();
  }

  private renderStatsPage(): void {
    this.page = 'stats';
    this.clearPageItems();
    this.title.setText('Stats / Build');
    this.addSectionTitle('Character Stats');
    this.addStatRow('HP', `${this.formatInteger(this.statsData.character.currentHp)} / ${this.formatInteger(this.statsData.character.maxHp)}`, 'hp_icon');
    this.addStatRow('Move Speed', this.statsData.character.moveSpeed.toFixed(1));
    this.addStatRow('Pickup Range', this.statsData.character.pickupRange.toFixed(1));
    this.addStatRow('EXP Multiplier', this.statsData.character.expMultiplier.toFixed(2), 'exp_icon');
    this.addStatRow('Level', `${this.statsData.character.level}`, 'exp_icon');
    this.addStatRow('EXP', `${Math.floor(this.statsData.character.currentExp)} / ${Math.floor(this.statsData.character.requiredExp)}`, 'exp_icon');
    this.addStatRow('Damage Taken', this.formatInteger(this.statsData.character.damageTaken));
    this.addStatRow('Kill Count', `${this.statsData.character.killCount}`);
    this.addStatRow('Treasure Opens', `${this.statsData.character.treasureOpenCount}`);
    this.addStatRow('Boss Phase Damage', this.formatInteger(this.statsData.character.bossPhaseDamageTaken));

    if (this.statsData.character.endlessMode || this.statsData.character.endlessStarted) {
      this.addStatRow('Endless Time', this.formatTime(this.statsData.character.endlessTimeSeconds), 'time_icon');
    }

    this.addSectionTitle('Weapons');
    for (const weapon of this.statsData.weapons.slice(0, 4)) {
      this.addWeaponBlock(weapon);
    }

    if (this.statsData.weapons.length > 4) {
      this.addMutedText(`+${this.statsData.weapons.length - 4} more weapons`);
    }

    this.addSectionTitle('Passives');
    for (const passive of this.statsData.passives.slice(0, 5)) {
      this.addPassiveBlock(passive);
    }

    if (this.statsData.passives.length > 5) {
      this.addMutedText(`+${this.statsData.passives.length - 5} more passives`);
    }

    this.pageItems.push(this.createButton('Back', () => this.renderMainPage()));
    this.applyLayout();
  }

  private addWeaponBlock(weapon: WeaponDetailInfo): void {
    this.addIconText(
      weapon.iconKey,
      this.getInitials(weapon.displayWeaponId),
      `${weapon.displayName} Lv.${weapon.level} / ${weapon.maxLevel}${weapon.evolved ? '  Evolved' : ''}`,
    );

    if (weapon.evolved) {
      this.addMutedText(`From: ${this.formatName(weapon.baseWeaponId)}`);
    }

    if (weapon.requiredPassiveId) {
      this.addIconText(
        weapon.requiredPassiveIconKey,
        this.getInitials(weapon.requiredPassiveId),
        `Evolves with: ${weapon.requiredPassiveName ?? this.formatName(weapon.requiredPassiveId)} Lv.${weapon.passiveLevel ?? 0} / ${weapon.requiredPassiveLevel ?? 5}`,
      );
    }

    for (const [label, value] of Object.entries(weapon.stats)) {
      this.addStatRow(label, this.formatNumber(value));
    }

    this.addStatRow('Total Damage', this.formatInteger(weapon.runtimeStats.damageDealt));
    this.addStatRow('Hits', `${weapon.runtimeStats.hits}`);
    this.addStatRow('Kills', `${weapon.runtimeStats.kills}`);
  }

  private addPassiveBlock(passive: PassiveDetailInfo): void {
    this.addIconText(
      passive.iconKey,
      this.getInitials(passive.passiveId),
      `${passive.displayName} Lv.${passive.level} / ${passive.maxLevel}`,
    );
    this.addStatRow(passive.effectLabel, passive.effectValue);

    if (passive.relatedWeaponIds.length > 0) {
      this.addMutedText(`Related: ${passive.relatedWeaponIds.map((id) => this.formatName(id)).join(', ')}`);
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
      this.addIconText(iconKey, label.charAt(0), `${label}: ${value}`);
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

  private addIconText(
    iconKey: string | undefined,
    fallback: string,
    label: string,
  ): void {
    const group = this.scene.add.container(0, 0);
    const bg = this.scene.add.rectangle(0, 0, 22, 22, UITheme.iconBgColor, 0.82);
    bg.setStrokeStyle(1, UITheme.panelBorderColor, 0.45);
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
    button.on('pointerdown', () => {
      AudioManager.play(this.scene, 'ui_click');
      onClick();
    });
    this.container.add(button);

    return button;
  }

  private applyLayout(): void {
    const layout = LayoutConfig.getPauseMenuLayout(this.screenManager);

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
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
    });
  }

  private layoutStatsItems(layout: ReturnType<typeof LayoutConfig.getPauseMenuLayout>): void {
    const left = layout.panelCenter.x - layout.panelWidth / 2 + 24;
    let y = layout.panelCenter.y - layout.panelHeight / 2 + 72;
    const rowGap = this.screenManager.isPortrait() ? 13 : 14;
    const fontSize = this.screenManager.isPortrait() ? '10px' : '11px';

    for (const item of this.pageItems) {
      if (item instanceof Phaser.GameObjects.Text) {
        item.setPosition(left, y);
        item.setFontSize(item.text === 'Back' ? '14px' : fontSize);
        y += item.text === 'Back' ? 34 : rowGap;
        continue;
      }

      if (item instanceof Phaser.GameObjects.Container) {
        item.setPosition(left + 12, y + 8);
        y += rowGap;
      }
    }
  }

  private clearPageItems(): void {
    for (const item of this.pageItems) {
      item.destroy();
    }

    this.pageItems.length = 0;
  }

  private showHelpOverlay(): void {
    this.helpOverlay?.destroy();
    this.helpOverlay = new HelpOverlay(this.scene, () => {
      this.helpOverlay = undefined;
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

  private formatName(value: string): string {
    return value
      .split('_')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
