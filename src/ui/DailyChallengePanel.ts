import Phaser from 'phaser';

import { ChallengeDefinition } from '../challenge/ChallengeDefinition';
import { ChallengeRules } from '../challenge/ChallengeRules';
import { I18n } from '../i18n/I18n';
import { createChallengeLeaderboardKey, serializeLeaderboardKey } from '../leaderboard/LeaderboardKey';

import { UITheme } from './UITheme';

export class DailyChallengePanel {
  private readonly background: Phaser.GameObjects.Rectangle;
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
      0.72,
    );
    this.background.setStrokeStyle(1, UITheme.panelBorderColor, 0.55);

    this.bodyText = scene.add.text(x + 16, y + 14, '', {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      lineSpacing: 5,
      wordWrap: { width: width - 32 },
    });
  }

  updateLayout(x: number, y: number, width: number, height: number): void {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.background.setPosition(x + width / 2, y + height / 2);
    this.background.setSize(width, height);
    this.bodyText.setPosition(x + 16, y + 14);
    this.bodyText.setWordWrapWidth(width - 32);
    this.bodyText.setFixedSize(width - 32, height - 20);
  }

  render(challenge: ChallengeDefinition | undefined): void {
    if (!challenge) {
      this.bodyText.setText(I18n.t('dailyChallenge.noChallenge'));
      return;
    }

    const leaderboardKey = serializeLeaderboardKey(createChallengeLeaderboardKey({
      challengeId: challenge.id,
      seed: challenge.seed,
      characterId: challenge.characterId,
      stageId: challenge.stageId,
      mapId: challenge.mapId,
      difficultyId: challenge.difficultyId,
      rulesetId: ChallengeRules.getRulesetId(challenge),
    }));

    this.bodyText.setText([
      `Challenge ID: ${challenge.id}`,
      `Ruleset: ${ChallengeRules.getRulesetId(challenge)}`,
      `Leaderboard: ${this.shorten(leaderboardKey, 72)}`,
    ].join('\n'));
  }

  setMessage(lines: readonly string[]): void {
    this.bodyText.setText(lines.join('\n'));
  }

  destroy(): void {
    this.background.destroy();
    this.bodyText.destroy();
  }

  private shorten(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  }
}
