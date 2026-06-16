import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { CharacterManager } from '../character/CharacterManager';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { SelectionManager } from '../selection/SelectionManager';
import { SelectionListPanel } from '../ui/SelectionListPanel';
import { UITextBlock } from '../ui/components/UITextBlock';
import { UITheme } from '../ui/UITheme';

export class CharacterSelectScene extends Phaser.Scene {
  private panel?: SelectionListPanel;
  private failureMessage?: Phaser.GameObjects.Text;
  private screenManager?: ScreenManager;
  private unsubscribeResize?: () => void;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const characterManager = new CharacterManager();
    const selection = SelectionManager.getSelection();

    this.screenManager = new ScreenManager(this);
    this.unsubscribeResize = this.screenManager.onResize(() => this.layoutFailureMessage());
    this.cameras.main.setBackgroundColor('#020617');
    this.panel = new SelectionListPanel(this, {
      title: I18n.t('characterSelect.title'),
      items: characterManager.listSelectableCharacters().map((character) => ({
        id: character.id,
        kind: 'character',
        name: I18n.t(character.nameKey),
        description: character.id === 'random_unlocked'
          ? I18n.t('characterSelection.randomUnlocked')
          : I18n.t(character.descriptionKey),
        startingWeaponId: character.id === 'random_unlocked' ? undefined : character.startingWeaponId,
        startingWeaponIconKey: character.id === 'random_unlocked'
          ? undefined
          : (AssetKeyResolver.getWeaponIconKey(this, character.startingWeaponId) ?? undefined),
        damageReactionSkill: character.damageReactionSkill?.type,
        portraitKey: character.id === 'random_unlocked'
          ? undefined
          : AssetKeyResolver.getPlayerPortraitKey(this, character.skinId, character.id),
      })),
      selectedId: selection.characterId,
      onConfirm: (id) => {
        if (SelectionManager.setCharacterId(id)) {
          this.scene.start('TitleScene');
          return;
        }

        console.warn(`Character selection failed: ${id}`);
        this.showSelectionFailedMessage();
      },
      onBack: () => this.scene.start('TitleScene'),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
    this.failureMessage?.destroy();
    this.failureMessage = undefined;
    this.panel?.destroy();
    this.panel = undefined;
  }

  private showSelectionFailedMessage(): void {
    this.failureMessage?.destroy();
    const fontSize = this.screenManager
      ? LayoutConfig.getResponsiveFontSizes(this.screenManager).body
      : '16px';
    this.failureMessage = new UITextBlock(this, {
      x: 0,
      y: 0,
      text: I18n.t('characterSelection.locked'),
      fontSize,
      fontStyle: 'bold',
    }).text;
    this.failureMessage.setColor(UITheme.dangerTextColor);
    this.failureMessage.setStroke('#000000', 3);
    this.failureMessage.setDepth(100);
    this.layoutFailureMessage();
  }

  private layoutFailureMessage(): void {
    if (!this.failureMessage || !this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    this.failureMessage.setFontSize(fonts.body);
    this.failureMessage.setPosition(
      this.screenManager.centerX,
      this.screenManager.height - (this.screenManager.isPortrait() ? 34 : 40),
    );
  }
}
