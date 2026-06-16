import Phaser from 'phaser';

import { ChallengeDefinition } from '../challenge/ChallengeDefinition';
import { ChallengeRules } from '../challenge/ChallengeRules';
import { I18n } from '../i18n/I18n';

import { PanelFrame } from './components/PanelFrame';
import { PanelHeader } from './components/PanelHeader';
import { UIStatRow } from './components/UIStatRow';
import { UITheme } from './UITheme';

export class ChallengeSummaryPanel {
  private readonly container: Phaser.GameObjects.Container;
  private frame?: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private readonly rowContainers: Phaser.GameObjects.Container[] = [];
  private challenge?: ChallengeDefinition;

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
    const compact = width <= 420 || height <= 280;

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
      y: y + (compact ? 24 : 30),
      width: width - (compact ? 18 : 26),
      title: I18n.t('dailyChallenge.today'),
      align: 'left',
      titleFontSize: compact ? UITheme.bodyFontSize : UITheme.headerFontSize,
    });
    this.container.add(this.header);
    this.renderRows();
  }

  render(challenge: ChallengeDefinition | undefined): void {
    this.challenge = challenge;
    this.renderRows();
  }

  destroy(): void {
    this.clearRows();
    this.container.destroy(true);
  }

  private renderRows(): void {
    this.clearRows();
    const compact = this.width <= 420 || this.height <= 280;
    const paddingX = compact ? 12 : 18;
    const top = this.y + (compact ? 48 : 62);
    const rowHeight = compact ? 20 : 24;
    const rowGap = compact ? 3 : 5;
    const rowWidth = this.width - paddingX * 2;
    const maxRows = Math.max(1, Math.floor((this.height - (top - this.y) - 12) / (rowHeight + rowGap)));
    const rows = this.getRows(this.challenge).slice(0, maxRows);

    rows.forEach((row, index) => {
      const rowContainer = UIStatRow.create(
        this.scene,
        this.x + this.width / 2,
        top + rowHeight / 2 + index * (rowHeight + rowGap),
        rowWidth,
        row.label,
        row.value,
        {
          height: rowHeight,
          fontSize: compact ? UITheme.smallFontSize : UITheme.bodyFontSize,
          backgroundAlpha: 0.28,
          borderAlpha: 0.16,
          labelRatio: 0.36,
        },
      );
      this.rowContainers.push(rowContainer);
      this.container.add(rowContainer);
    });
  }

  private getRows(challenge: ChallengeDefinition | undefined): Array<{ label: string; value: string }> {
    if (!challenge) {
      return [
        {
          label: I18n.t('dailyChallenge.title'),
          value: I18n.t('dailyChallenge.noChallenge'),
        },
      ];
    }

    const name = this.translateOrFallback(challenge.nameKey, challenge.id);
    const rules = this.formatRules(challenge);
    const mode = ChallengeRules.isEndlessEnabled(challenge)
      ? I18n.t('dailyChallenge.endless')
      : I18n.t('dailyChallenge.normal');

    return [
      { label: I18n.t('dailyChallenge.today'), value: name },
      { label: I18n.t('dailyChallenge.date'), value: challenge.dateKey ?? '-' },
      { label: I18n.t('dailyChallenge.seed'), value: this.shorten(challenge.seed, 16) },
      { label: I18n.t('dailyChallenge.character'), value: challenge.characterId },
      { label: I18n.t('dailyChallenge.stage'), value: challenge.stageId },
      { label: I18n.t('dailyChallenge.map'), value: challenge.mapId },
      { label: I18n.t('dailyChallenge.difficulty'), value: challenge.difficultyId ?? 'normal' },
      { label: I18n.t('dailyChallenge.rules'), value: rules },
      { label: I18n.t('dailyChallenge.mode'), value: mode },
    ];
  }

  private formatRules(challenge: ChallengeDefinition): string {
    const mutators = challenge.mutators ?? [];

    if (mutators.length === 0) {
      return I18n.t('dailyChallenge.none');
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

  private clearRows(): void {
    this.rowContainers.forEach((row) => row.destroy(true));
    this.rowContainers.length = 0;
  }
}
