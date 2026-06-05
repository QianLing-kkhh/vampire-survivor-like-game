import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { SelectionManager } from '../selection/SelectionManager';
import { RANDOM_UNLOCKED_STAGE_ID, StageManager } from '../stage/StageManager';
import { SelectionListPanel } from '../ui/SelectionListPanel';

export class StageSelectScene extends Phaser.Scene {
  private panel?: SelectionListPanel;

  constructor() {
    super('StageSelectScene');
  }

  create(): void {
    const stageManager = new StageManager();
    const selection = SelectionManager.getSelection();
    const selectableStages = stageManager.listSelectableStages()
      .filter((stage) => stage.source === 'builtin' || stage.valid);

    this.cameras.main.setBackgroundColor('#020617');
    this.panel = new SelectionListPanel(this, {
      title: I18n.t('stageSelect.title'),
      items: selectableStages.map((stage) => ({
        id: stage.id,
        name: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.name')
          : stage.name,
        description: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.description')
          : [
            stage.source === 'custom' ? 'Custom' : 'Built-in',
            `${I18n.t('selection.map')}: ${stage.mapId}`,
            stage.warnings && stage.warnings.length > 0 ? `${stage.warnings.length} warnings` : '',
          ].filter(Boolean).join(' / '),
      })),
      selectedId: selection.customStageId ?? selection.stageId,
      onConfirm: (id) => {
        const selectedStage = selectableStages.find((stage) => stage.id === id);

        if (selectedStage?.source === 'custom' && selectedStage.customStageId) {
          SelectionManager.setCustomStageId(selectedStage.customStageId);
        } else if (selectedStage?.source === 'builtin') {
          SelectionManager.setStageId(selectedStage.id);
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
