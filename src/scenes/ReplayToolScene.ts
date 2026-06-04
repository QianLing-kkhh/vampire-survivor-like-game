import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { ReplayData } from '../replay/ReplayData';
import { ReplaySerializer } from '../replay/ReplaySerializer';
import { ReplayStorage } from '../replay/ReplayStorage';
import { ReplayDetailPanel } from '../ui/ReplayDetailPanel';
import { ReplayImportPanel } from '../ui/ReplayImportPanel';
import { ReplayListPanel } from '../ui/ReplayListPanel';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

export class ReplayToolScene extends Phaser.Scene {
  private readonly replayStorage = new ReplayStorage();
  private screenManager?: ScreenManager;
  private titleText?: Phaser.GameObjects.Text;
  private importButton?: Phaser.GameObjects.Text;
  private exportButton?: Phaser.GameObjects.Text;
  private deleteButton?: Phaser.GameObjects.Text;
  private backButton?: Phaser.GameObjects.Text;
  private listPanel?: ReplayListPanel;
  private detailPanel?: ReplayDetailPanel;
  private importPanel?: ReplayImportPanel;
  private replays: ReplayData[] = [];
  private selectedRunId?: string;
  private unsubscribeResize?: () => void;

  constructor() {
    super('ReplayToolScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);
    this.replays = this.replayStorage.list();
    this.selectedRunId = this.replays[0]?.runId;

    this.titleText = this.add.text(this.screenManager.centerX, 38, I18n.t('replay.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.titleFontSize,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    this.importButton = this.createButton(I18n.t('replay.import'), () => this.importReplay());
    this.exportButton = this.createButton(I18n.t('replay.export'), () => {
      void this.exportSelectedReplay();
    });
    this.deleteButton = this.createButton(I18n.t('replay.delete'), () => this.deleteSelectedReplay());
    this.backButton = this.createButton(I18n.t('replay.back'), () => this.scene.start('TitleScene'));

    this.createOrUpdatePanels();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private createButton(
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.scale.width, this.scale.height);
    const button = this.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      align: 'center',
      fixedWidth: metrics.width,
      fixedHeight: metrics.height,
      padding: {
        x: 0,
        y: Math.max(0, Math.floor((metrics.height - 22) / 2)),
      },
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor)));
    button.on('pointerout', () => button.setBackgroundColor(toCssColor(UITheme.buttonBgColor)));
    button.on('pointerdown', onClick);

    return button;
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    this.titleText?.setPosition(this.screenManager.centerX, 38);
    this.titleText?.setFontSize(fonts.title);

    const buttons = [
      this.importButton,
      this.exportButton,
      this.deleteButton,
      this.backButton,
    ].filter((button): button is Phaser.GameObjects.Text => button !== undefined);
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: buttons.length,
      startY: this.screenManager.isPortrait() ? 92 : 86,
      mode: this.screenManager.isPortrait() ? 'vertical' : 'twoColumn',
      gap: this.screenManager.isPortrait() ? 42 : 44,
    });

    buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
      button.setPosition(position.x, position.y);
    });

    this.createOrUpdatePanels();
    this.render();
  }

  private createOrUpdatePanels(): void {
    if (!this.screenManager) {
      return;
    }

    const top = this.screenManager.isPortrait() ? 260 : 164;
    const margin = 16;
    const width = this.screenManager.width - margin * 2;
    const bottom = this.screenManager.height - 18;
    const importHeight = this.screenManager.isPortrait() ? 92 : 74;
    const contentHeight = Math.max(220, bottom - top - importHeight - 12);
    const listWidth = this.screenManager.isPortrait()
      ? width
      : Math.min(410, width * 0.42);
    const detailWidth = this.screenManager.isPortrait()
      ? width
      : width - listWidth - 12;
    const detailX = this.screenManager.isPortrait()
      ? margin
      : margin + listWidth + 12;
    const detailY = this.screenManager.isPortrait()
      ? top + Math.floor(contentHeight * 0.48) + 10
      : top;
    const listHeight = this.screenManager.isPortrait()
      ? Math.floor(contentHeight * 0.48)
      : contentHeight;
    const detailHeight = this.screenManager.isPortrait()
      ? contentHeight - listHeight - 10
      : contentHeight;

    if (!this.listPanel) {
      this.listPanel = new ReplayListPanel(this, margin, top, listWidth, listHeight);
      this.detailPanel = new ReplayDetailPanel(this, detailX, detailY, detailWidth, detailHeight);
      this.importPanel = new ReplayImportPanel(
        this,
        margin,
        top + contentHeight + 12,
        width,
        importHeight,
      );
      return;
    }

    this.listPanel.updateLayout(margin, top, listWidth, listHeight);
    this.detailPanel?.updateLayout(detailX, detailY, detailWidth, detailHeight);
    this.importPanel?.updateLayout(margin, top + contentHeight + 12, width, importHeight);
  }

  private render(): void {
    this.listPanel?.render(this.replays, this.selectedRunId, (replay) => {
      this.selectedRunId = replay.runId;
      this.render();
    });
    this.detailPanel?.render(this.getSelectedReplay());

    if (!this.importPanel) {
      return;
    }

    if (this.replays.length === 0) {
      this.importPanel.setMessage([I18n.t('replay.empty')]);
    }
  }

  private importReplay(): void {
    const rawJson = globalThis.prompt?.(I18n.t('replay.import')) ?? '';

    if (!rawJson.trim()) {
      return;
    }

    const replay = ReplaySerializer.parse(rawJson);

    if (!replay) {
      this.importPanel?.setMessage([I18n.t('replay.invalid'), 'Invalid JSON']);
      return;
    }

    const validation = ReplaySerializer.validate(replay);
    const lines = [
      validation.valid ? I18n.t('replay.compatible') : I18n.t('replay.invalid'),
      ...validation.errors.slice(0, 4),
      ...validation.warnings.slice(0, 4).map((warning) => `${I18n.t('replay.warning')}: ${warning}`),
    ];

    if (!validation.valid) {
      this.importPanel?.setMessage(lines);
      return;
    }

    this.replayStorage.save(replay);
    this.replays = this.replayStorage.list();
    this.selectedRunId = replay.runId;
    this.importPanel?.setMessage(lines.length > 1 ? lines : [I18n.t('replay.compatible')]);
    this.render();
  }

  private async exportSelectedReplay(): Promise<void> {
    const replay = this.getSelectedReplay();

    if (!replay) {
      this.importPanel?.setMessage([I18n.t('replay.empty')]);
      return;
    }

    const serializedReplay = ReplaySerializer.serialize(replay);

    try {
      await globalThis.navigator?.clipboard?.writeText(serializedReplay);
      this.importPanel?.setMessage([I18n.t('replay.export'), replay.runId]);
    } catch {
      console.log(serializedReplay);
      this.importPanel?.setMessage([I18n.t('replay.export'), 'Clipboard unavailable; JSON logged to console.']);
    }
  }

  private deleteSelectedReplay(): void {
    const replay = this.getSelectedReplay();

    if (!replay) {
      this.importPanel?.setMessage([I18n.t('replay.empty')]);
      return;
    }

    this.replayStorage.remove(replay.runId);
    this.replays = this.replayStorage.list();
    this.selectedRunId = this.replays[0]?.runId;
    this.importPanel?.setMessage([I18n.t('replay.delete'), replay.runId]);
    this.render();
  }

  private getSelectedReplay(): ReplayData | undefined {
    return this.replays.find((replay) => replay.runId === this.selectedRunId);
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.listPanel?.destroy();
    this.listPanel = undefined;
    this.detailPanel?.destroy();
    this.detailPanel = undefined;
    this.importPanel?.destroy();
    this.importPanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
