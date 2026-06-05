import Phaser from 'phaser';

import { CharacterManager } from '../character/CharacterManager';
import { I18n } from '../i18n/I18n';
import { SelectionManager } from '../selection/SelectionManager';
import { SelectionListPanel } from '../ui/SelectionListPanel';

export class CharacterSelectScene extends Phaser.Scene {
  private panel?: SelectionListPanel;
  private failureMessage?: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    const characterManager = new CharacterManager();
    const selection = SelectionManager.getSelection();

    this.cameras.main.setBackgroundColor('#020617');
    this.panel = new SelectionListPanel(this, {
      title: I18n.t('characterSelect.title'),
      items: characterManager.listCharacters().map((character) => ({
        id: character.id,
        name: character.name,
        description: character.id,
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
    this.failureMessage?.destroy();
    this.failureMessage = undefined;
    this.panel?.destroy();
    this.panel = undefined;
  }

  private showSelectionFailedMessage(): void {
    this.failureMessage?.destroy();
    this.failureMessage = this.add.text(
      this.scale.width / 2,
      this.scale.height - 40,
      'Character is locked or unavailable',
      {
        color: '#fca5a5',
        fontFamily: 'Arial',
        fontSize: '16px',
      },
    );
    this.failureMessage.setOrigin(0.5);
    this.failureMessage.setDepth(100);
  }
}
