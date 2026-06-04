import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { MapManager } from '../map/MapManager';
import { SelectionManager } from '../selection/SelectionManager';
import { StageManager } from '../stage/StageManager';
import { SelectionListPanel } from '../ui/SelectionListPanel';

export class StageSelectScene extends Phaser.Scene {
  private panel?: SelectionListPanel;

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    const stageManager = new StageManager();
    const selection = SelectionManager.getSelection();

    this.cameras.main.setBackgroundColor('#020617');
    this.panel = new SelectionListPanel(this, {
      title: I18n.t('stageSelect.title'),
      items: stageManager.listStages().map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: `${I18n.t('selection.map')}: ${stage.mapId}`,
      })),
      selectedId: selection.stageId,
      onConfirm: (id) => {
        const stage = stageManager.getStage(id);

        if (SelectionManager.setStageId(stage.id)) {
          new MapManager().setSelectedMapId(stage.mapId);
        }

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
