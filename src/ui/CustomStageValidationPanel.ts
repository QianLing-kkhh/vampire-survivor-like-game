import Phaser from 'phaser';

import { CustomStageValidationResult } from '../custom/CustomStageValidationResult';
import { I18n } from '../i18n/I18n';
import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class CustomStageValidationPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowObjects: Phaser.GameObjects.GameObject[] = [];
  private title = I18n.t('customStage.invalid');
  private titleColor = UITheme.mutedTextColor;
  private rows: Array<{ label: string; value: string }> = [];
  private width: number;
  private height: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
  ) {
    this.width = width;
    this.height = 180;
    this.container = scene.add.container(x, y);
    this.container.setDepth(1000);
    this.updateLayout(width, this.height);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  updateLayout(width: number, height = this.height): void {
    const compact = width <= 360 || height <= 150;

    this.width = width;
    this.height = height;
    this.frame?.destroy(true);
    this.header?.destroy(true);
    this.frame = PanelFrame.create(this.scene, {
      x: width / 2,
      y: height / 2,
      width,
      height,
      variant: 'card',
    });
    this.container.addAt(this.frame, 0);
    this.header = PanelHeader.create(this.scene, {
      x: width / 2,
      y: compact ? 15 : 18,
      width: width - (compact ? 20 : 24),
      title: this.title,
      titleColor: this.titleColor,
      align: 'left',
      titleFontSize: compact ? UITheme.smallFontSize : UITheme.bodyFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  update(
    result: CustomStageValidationResult | null,
    message = '',
  ): void {
    if (!result) {
      this.title = message || I18n.t('customStage.invalid');
      this.titleColor = UITheme.mutedTextColor;
      this.rows = [];
      this.updateLayout(this.width, this.height);
      return;
    }

    this.title = result.valid
      ? I18n.t('customStage.valid')
      : I18n.t('customStage.invalid');
    this.titleColor = result.valid ? UITheme.successTextColor : UITheme.dangerTextColor;

    const issues = [...result.errors, ...result.warnings];
    const issueRows = issues.slice(0, 5).map((issue) => {
      const path = issue.path ? ` ${issue.path}` : '';

      return {
        label: issue.level.toUpperCase(),
        value: `${issue.code}${path}: ${issue.message}`,
      };
    });

    if (issues.length > 5) {
      issueRows.push({
        label: '',
        value: I18n.t('result.more', { count: issues.length - 5 }),
      });
    }

    this.rows = [
      { label: I18n.t('customStage.errors'), value: `${result.errors.length}` },
      { label: I18n.t('customStage.warnings'), value: `${result.warnings.length}` },
      ...issueRows,
    ];
    this.updateLayout(this.width, this.height);
  }

  destroy(): void {
    this.clearRows();
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 360 || this.height <= 150;
    const paddingX = compact ? 10 : 12;
    const headerGap = compact ? 42 : 52;
    const rowHeight = compact ? 17 : 21;
    const rowGap = compact ? 3 : 5;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - headerGap - 8 + rowGap) / (rowHeight + rowGap)));

    this.rows.slice(0, maxRows).forEach((row, index) => {
      const rowObject = UIStatRow.create(
        this.scene,
        this.width / 2,
        headerGap + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        row.label,
        row.value,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          labelRatio: 0.28,
          backgroundAlpha: 0.28,
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
