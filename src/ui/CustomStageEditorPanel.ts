import Phaser from 'phaser';

import { CustomStagePackage } from '../custom/CustomStageSchema';
import { CustomStageValidationResult } from '../custom/CustomStageValidationResult';
import { I18n } from '../i18n/I18n';

import { UITheme } from './UITheme';

export class CustomStageEditorPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
  ) {
    this.background = scene.add.rectangle(
      x + width / 2,
      y + height / 2,
      width,
      height,
      UITheme.panelBgColor,
      UITheme.panelBgAlpha,
    );
    this.background.setStrokeStyle(2, UITheme.panelBorderColor, 0.7);
    this.titleText = scene.add.text(x + 18, y + 14, I18n.t('customStage.editorTitle'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(x + 18, y + 54, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      lineSpacing: 5,
      wordWrap: { width: width - 36 },
    });
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.titleText.setPosition(x + 18, y + 14);
    this.bodyText.setPosition(x + 18, y + 54);
    this.bodyText.setWordWrapWidth(width - 36);
    this.bodyText.setFixedSize(width - 36, height - 68);
  }

  render(
    stagePackage: CustomStagePackage | undefined,
    validationResult: CustomStageValidationResult | undefined,
  ): void {
    if (!stagePackage) {
      this.bodyText.setText(I18n.t('customStage.invalid'));
      return;
    }

    const validText = validationResult
      ? validationResult.valid ? I18n.t('customStage.valid') : I18n.t('customStage.invalid')
      : 'Not validated';
    const issueLines = validationResult
      ? [
        `Errors: ${validationResult.errors.length}`,
        `Warnings: ${validationResult.warnings.length}`,
        ...[...validationResult.errors, ...validationResult.warnings]
          .slice(0, 5)
          .map((issue) => `${issue.level}: ${issue.path ?? issue.code} ${issue.message}`),
      ]
      : [];

    this.bodyText.setText([
      `ID: ${stagePackage.id}`,
      `Name: ${stagePackage.name}`,
      `${I18n.t('customStage.mapSize')}: ${stagePackage.map.width} x ${stagePackage.map.height}`,
      `Final Boss: ${stagePackage.stage.finalBossId}`,
      `${I18n.t('customStage.bossTime')}: ${stagePackage.stage.finalBossSpawnTime}s / warning ${stagePackage.stage.warningBeforeBoss}s`,
      `Endless: ${stagePackage.stage.allowEndless ? 'ON' : 'OFF'}`,
      `${I18n.t('customStage.waveCount')}: ${stagePackage.waves.length}`,
      `Status: ${validText}`,
      ...issueLines,
    ].join('\n'));
  }

  destroy(): void {
    this.background.destroy();
    this.titleText.destroy();
    this.bodyText.destroy();
  }
}
