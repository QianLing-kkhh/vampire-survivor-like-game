import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { ReplayData } from '../replay/ReplayData';
import { ReplaySerializer } from '../replay/ReplaySerializer';
import { ReplayStorage } from '../replay/ReplayStorage';
import { UIActionBar } from '../ui/components/UIActionBar';
import { SceneHeader } from '../ui/components/SceneHeader';
import { ReplayDetailPanel } from '../ui/ReplayDetailPanel';
import { ReplayImportPanel } from '../ui/ReplayImportPanel';
import { ReplayListPanel } from '../ui/ReplayListPanel';

type ReplayActionId = 'import' | 'export' | 'delete' | 'back';

export class ReplayToolScene extends Phaser.Scene {
  private readonly replayStorage = new ReplayStorage();
  private screenManager?: ScreenManager;
  private titleHeader?: SceneHeader;
  private actionBar?: UIActionBar<ReplayActionId>;
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

    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('replay.title'),
    });

    this.actionBar = new UIActionBar<ReplayActionId>(this, [
      { id: 'import', label: I18n.t('replay.import'), onClick: () => this.importReplay() },
      { id: 'export', label: I18n.t('replay.export'), onClick: () => { void this.exportSelectedReplay(); } },
      { id: 'delete', label: I18n.t('replay.delete'), onClick: () => this.deleteSelectedReplay() },
      { id: 'back', label: I18n.t('replay.back'), onClick: () => this.scene.start('TitleScene') },
    ]);

    this.createOrUpdatePanels();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => {
      this.applyLayout();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const safeMargin = tiny ? 10 : compact ? 12 : 16;
    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      tiny ? 24 : compact ? 30 : 38,
      Math.min(this.screenManager.width - 24, 760),
      { titleFontSize: fonts.title },
    );

    this.layoutActionButtons(compact, tiny, safeMargin);
    this.createOrUpdatePanels();
    this.render();
  }

  private layoutActionButtons(compact: boolean, tiny: boolean, safeMargin: number): void {
    if (!this.screenManager || !this.actionBar) {
      return;
    }

    this.actionBar.layout(
      this.screenManager,
      {
        x: safeMargin,
        y: this.getActionAreaTop(tiny, compact, safeMargin),
        width: this.screenManager.width - safeMargin * 2,
        height: this.getActionAreaHeight(tiny, compact),
      },
      {
        columns: this.screenManager.isPortrait() ? 2 : 4,
        compact,
        minWidth: tiny ? 78 : 98,
        maxWidth: tiny ? 120 : compact ? 150 : 176,
        minHeight: tiny ? 24 : 28,
        maxHeight: tiny ? 28 : compact ? 32 : 36,
        fontSize: tiny ? '9px' : compact ? '10px' : '12px',
      },
    );
  }

  private createOrUpdatePanels(): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const margin = tiny ? 10 : compact ? 12 : 16;
    const top = tiny ? 58 : compact ? 68 : 82;
    const width = this.screenManager.width - margin * 2;
    const bottom = this.getActionAreaTop(tiny, compact, margin) - (tiny ? 8 : 12);
    const importHeight = this.screenManager.isPortrait() ? tiny ? 72 : compact ? 82 : 92 : compact ? 60 : 74;
    const contentHeight = Math.max(tiny ? 150 : 190, bottom - top - importHeight - (tiny ? 8 : 12));
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

  private getActionAreaTop(tiny: boolean, compact: boolean, margin: number): number {
    if (!this.screenManager) {
      return 0;
    }

    return this.screenManager.height - margin - this.getActionAreaHeight(tiny, compact);
  }

  private getActionAreaHeight(tiny: boolean, compact: boolean): number {
    if (!this.screenManager) {
      return 0;
    }

    if (this.screenManager.isPortrait()) {
      return tiny ? 64 : compact ? 72 : 84;
    }

    return tiny ? 30 : compact ? 36 : 42;
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
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
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
