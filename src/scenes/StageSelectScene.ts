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
        kind: 'stage',
        name: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.name')
          : stage.name,
        badges: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? [I18n.t('ui.random')]
          : [stage.source === 'custom' ? I18n.t('stage.custom') : I18n.t('stage.builtIn')],
        description: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? I18n.t('stage.random.description')
          : [
            stage.source === 'custom' ? I18n.t('stage.custom') : I18n.t('stage.builtIn'),
            `${I18n.t('selection.map')}: ${stage.mapId}`,
            stage.warnings && stage.warnings.length > 0
              ? I18n.t('stage.warningsCount', { count: stage.warnings.length })
              : '',
          ].filter(Boolean).join(' / '),
        detailRows: stage.id === RANDOM_UNLOCKED_STAGE_ID
          ? [
            { label: I18n.t('ui.random'), value: I18n.t('stage.random.description') },
            { label: I18n.t('selection.stage'), value: I18n.t('stage.random.name') },
          ]
          : [
            {
              label: I18n.t('selection.stage'),
              value: stage.source === 'custom' ? I18n.t('stage.custom') : I18n.t('stage.builtIn'),
            },
            { label: I18n.t('selection.map'), value: stage.mapId },
            {
              label: I18n.t('ui.summary'),
              value: stage.warnings && stage.warnings.length > 0
                ? I18n.t('stage.warningsCount', { count: stage.warnings.length })
                : I18n.t('common.none'),
            },
          ],
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
