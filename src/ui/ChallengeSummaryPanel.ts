import Phaser from 'phaser';

import { ChallengeDefinition } from '../challenge/ChallengeDefinition';
import { ChallengeRules } from '../challenge/ChallengeRules';
import { I18n } from '../i18n/I18n';

import { UITheme } from './UITheme';

export class ChallengeSummaryPanel {
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

    this.titleText = scene.add.text(x + 20, y + 18, I18n.t('dailyChallenge.today'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });

    this.bodyText = scene.add.text(x + 20, y + 66, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
      lineSpacing: 8,
      wordWrap: { width: width - 40 },
    });
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.titleText.setPosition(x + 20, y + 18);
    this.bodyText.setPosition(x + 20, y + 66);
    this.bodyText.setWordWrapWidth(width - 40);
    this.bodyText.setFixedSize(width - 40, height - 84);
  }

  render(challenge: ChallengeDefinition | undefined): void {
    if (!challenge) {
      this.titleText.setText(I18n.t('dailyChallenge.title'));
      this.bodyText.setText(I18n.t('dailyChallenge.noChallenge'));
      return;
    }

    const name = this.translateOrFallback(challenge.nameKey, challenge.id);
    const rules = this.formatRules(challenge);
    const mode = ChallengeRules.isEndlessEnabled(challenge) ? 'Endless' : 'Normal';
    const lines = [
      `${I18n.t('dailyChallenge.today')}: ${name}`,
      `Date: ${challenge.dateKey ?? ''}`,
      `${I18n.t('dailyChallenge.seed')}: ${this.shorten(challenge.seed, 16)}`,
      `Character: ${challenge.characterId}`,
      `Stage: ${challenge.stageId}`,
      `Map: ${challenge.mapId}`,
      `Difficulty: ${challenge.difficultyId ?? 'normal'}`,
      `${I18n.t('dailyChallenge.rules')}: ${rules}`,
      `${I18n.t('dailyChallenge.mode')}: ${mode}`,
    ];

    this.titleText.setText(I18n.t('dailyChallenge.today'));
    this.bodyText.setText(lines.join('\n'));
  }

  destroy(): void {
    this.background.destroy();
    this.titleText.destroy();
    this.bodyText.destroy();
  }

  private formatRules(challenge: ChallengeDefinition): string {
    const mutators = challenge.mutators ?? [];

    if (mutators.length === 0) {
      return 'None';
    }

    const ids = mutators.map((mutator, index) => mutator.id ?? `${mutator.type}:${index}`);

    return ids.length <= 3 ? ids.join(', ') : `${ids.slice(0, 3).join(', ')} +${ids.length - 3}`;
  }

  private shorten(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  }

  private translateOrFallback(key: string, fallback: string): string {
    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
