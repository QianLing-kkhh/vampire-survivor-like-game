import Phaser from 'phaser';

import { CustomStageValidationResult } from '../custom/CustomStageValidationResult';
import { I18n } from '../i18n/I18n';
import { UITheme } from './UITheme';

export class CustomStageValidationPanel {
  private readonly container: Phaser.GameObjects.Container;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
  ) {
    this.container = scene.add.container(x, y);
    this.container.setDepth(1000);
    const background = scene.add.rectangle(0, 0, width, 180, UITheme.panelBgColor, UITheme.panelBgAlpha);
    background.setOrigin(0, 0);
    background.setStrokeStyle(1, UITheme.panelBorderColor, 0.75);
    this.titleText = scene.add.text(12, 10, I18n.t('customStage.invalid'), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      fontStyle: 'bold',
    });
    this.bodyText = scene.add.text(12, 42, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      lineSpacing: 4,
      wordWrap: { width: width - 24 },
    });
    this.bodyText.setMaxLines(7);
    this.container.add([background, this.titleText, this.bodyText]);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  update(
    result: CustomStageValidationResult | null,
    message = '',
  ): void {
    if (!result) {
      this.titleText.setText(message || I18n.t('customStage.invalid'));
      this.titleText.setColor(UITheme.mutedTextColor);
      this.bodyText.setText('');
      return;
    }

    this.titleText.setText(result.valid
      ? I18n.t('customStage.valid')
      : I18n.t('customStage.invalid'));
    this.titleText.setColor(result.valid ? UITheme.successTextColor : UITheme.dangerTextColor);

    const issues = [...result.errors, ...result.warnings];
    const issueLines = issues.slice(0, 5).map((issue) => {
      const path = issue.path ? ` ${issue.path}` : '';

      return `${issue.level.toUpperCase()} ${issue.code}${path}: ${issue.message}`;
    });

    if (issues.length > 5) {
      issueLines.push(`+${issues.length - 5} more`);
    }

    this.bodyText.setText([
      `${I18n.t('customStage.errors')}: ${result.errors.length}`,
      `${I18n.t('customStage.warnings')}: ${result.warnings.length}`,
      ...issueLines,
    ].join('\n'));
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
