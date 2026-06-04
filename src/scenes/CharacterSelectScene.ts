import Phaser from 'phaser';

import { CharacterManager } from '../character/CharacterManager';
import { I18n } from '../i18n/I18n';
import { SelectionManager } from '../selection/SelectionManager';
import { SelectionListPanel } from '../ui/SelectionListPanel';

export class CharacterSelectScene extends Phaser.Scene {
  private panel?: SelectionListPanel;

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
        SelectionManager.setCharacterId(id);
        this.scene.start('TitleScene');
      },
      onBack: () => this.scene.start('TitleScene'),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private cleanup(): void {
    this.panel?.destroy();
    this.panel = undefined;
  }
}
