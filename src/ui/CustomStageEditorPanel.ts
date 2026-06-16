import Phaser from 'phaser';

import { CustomStagePackage } from '../custom/CustomStageSchema';
import { CustomStageValidationResult } from '../custom/CustomStageValidationResult';
import { I18n } from '../i18n/I18n';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class CustomStageEditorPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];
  private rows: Array<{ label: string; value: string }> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    this.container = scene.add.container(0, 0);
    this.updateLayout(x, y, width, height);
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    const compact = width <= 360 || height <= 260;
    const paddingX = compact ? 12 : 18;
    const paddingTop = compact ? 10 : 14;

    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.frame?.destroy(true);
    this.header?.destroy(true);
    this.frame = PanelFrame.create(this.scene, {
      x: x + width / 2,
      y: y + height / 2,
      width,
      height,
      variant: 'card',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: x + width / 2,
      y: y + paddingTop + (compact ? 7 : 10),
      width: width - paddingX * 2,
      title: I18n.t('customStage.editorTitle'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  render(
    stagePackage: CustomStagePackage | undefined,
    validationResult: CustomStageValidationResult | undefined,
  ): void {
    if (!stagePackage) {
      this.rows = [{ label: I18n.t('customStage.status'), value: I18n.t('customStage.invalid') }];
      this.renderRows();
      return;
    }

    const validText = validationResult
      ? validationResult.valid ? I18n.t('customStage.valid') : I18n.t('customStage.invalid')
      : I18n.t('customStage.notValidated');
    const issueLines = validationResult
      ? [
        { label: I18n.t('customStage.errors'), value: `${validationResult.errors.length}` },
        { label: I18n.t('customStage.warnings'), value: `${validationResult.warnings.length}` },
        ...[...validationResult.errors, ...validationResult.warnings]
          .slice(0, 5)
          .map((issue) => ({
            label: issue.level.toUpperCase(),
            value: `${issue.path ?? issue.code} ${issue.message}`,
          })),
      ]
      : [];

    this.rows = [
      { label: I18n.t('customStage.id'), value: stagePackage.id },
      { label: I18n.t('customStage.name'), value: stagePackage.name },
      { label: I18n.t('customStage.mapSize'), value: `${stagePackage.map.width} x ${stagePackage.map.height}` },
      { label: I18n.t('customStage.finalBoss'), value: stagePackage.stage.finalBossId },
      { label: I18n.t('customStage.bossTime'), value: `${stagePackage.stage.finalBossSpawnTime}s / ${stagePackage.stage.warningBeforeBoss}s` },
      { label: I18n.t('customStage.endless'), value: stagePackage.stage.allowEndless ? I18n.t('common.on') : I18n.t('common.off') },
      { label: I18n.t('customStage.waveCount'), value: `${stagePackage.waves.length}` },
      { label: I18n.t('customStage.status'), value: validText },
      ...issueLines,
    ];
    this.renderRows();
  }

  destroy(): void {
    this.clearRows();
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 360 || this.height <= 260;
    const paddingX = compact ? 12 : 18;
    const paddingTop = compact ? 10 : 14;
    const headerGap = compact ? 40 : 54;
    const rowHeight = compact ? 18 : 23;
    const rowGap = compact ? 4 : 5;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - paddingTop - headerGap - 10 + rowGap) / (rowHeight + rowGap)));

    this.rows.slice(0, maxRows).forEach((row, index) => {
      const rowObject = UIStatRow.create(
        this.scene,
        this.x + this.width / 2,
        this.y + paddingTop + headerGap + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        row.label,
        row.value,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          labelRatio: 0.34,
          backgroundAlpha: 0.3,
        },
      );
      this.rowObjects.push(rowObject);
      this.container.add(rowObject);
    });
  }

  private clearRows(): void {
    this.rowObjects.forEach((row) => row.destroy(true));
    this.rowObjects.length = 0;
  }
}
