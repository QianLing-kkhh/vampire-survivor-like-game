import Phaser from 'phaser';

import { ChallengeDefinition } from '../challenge/ChallengeDefinition';
import { ChallengeRules } from '../challenge/ChallengeRules';
import { I18n } from '../i18n/I18n';
import { createChallengeLeaderboardKey, serializeLeaderboardKey } from '../leaderboard/LeaderboardKey';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class DailyChallengePanel {
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
    const compact = width <= 360 || height <= 220;
    const paddingX = compact ? 12 : 16;
    const paddingY = compact ? 10 : 14;

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
      y: y + paddingY + (compact ? 7 : 10),
      width: width - paddingX * 2,
      title: I18n.t('dailyChallenge.status'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  render(challenge: ChallengeDefinition | undefined): void {
    if (!challenge) {
      this.setMessage([I18n.t('dailyChallenge.noChallenge')]);
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

    this.rows = [
      { label: I18n.t('dailyChallenge.challengeId'), value: challenge.id },
      { label: I18n.t('dailyChallenge.ruleset'), value: ChallengeRules.getRulesetId(challenge) },
      { label: I18n.t('dailyChallenge.leaderboard'), value: this.shorten(leaderboardKey, 72) },
    ];
    this.renderRows();
  }

  setMessage(lines: readonly string[]): void {
    this.rows = lines.map((line, index) => ({
      label: index === 0 ? I18n.t('dailyChallenge.status') : '',
      value: line,
    }));
    this.renderRows();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private shorten(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 360 || this.height <= 220;
    const paddingX = compact ? 12 : 16;
    const paddingY = compact ? 10 : 14;
    const headerGap = compact ? 34 : 42;
    const rowHeight = compact ? 18 : 22;
    const rowGap = compact ? 4 : 6;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - paddingY - headerGap - 6 + rowGap) / (rowHeight + rowGap)));
    const visibleRows = this.rows.slice(0, maxRows);

    visibleRows.forEach((row, index) => {
      const rowObject = UIStatRow.create(
        this.scene,
        this.x + this.width / 2,
        this.y + paddingY + headerGap + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        row.label,
        row.value,
        {
          height: rowHeight,
          fontSize: compact ? '10px' : UITheme.smallFontSize,
          labelRatio: compact ? 0.32 : 0.28,
          backgroundAlpha: 0.32,
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
