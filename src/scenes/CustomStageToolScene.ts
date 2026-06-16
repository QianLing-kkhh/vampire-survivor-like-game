import Phaser from 'phaser';

import { CustomStagePackage } from '../custom/CustomStageSchema';
import { CustomStageSerializer } from '../custom/CustomStageSerializer';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import {
  CustomStageValidationResult,
  createCustomStageValidationResult,
} from '../custom/CustomStageValidationResult';
import { CustomStageValidator } from '../custom/CustomStageValidator';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { CustomStageValidationPanel } from '../ui/CustomStageValidationPanel';
import { SceneHeader } from '../ui/components/SceneHeader';
import { UIActionBar, UIActionBarAction } from '../ui/components/UIActionBar';
import { UIListRow, UIListRowTone } from '../ui/components/UIListRow';
import { UITextBlock } from '../ui/components/UITextBlock';

type StoredStageRow = {
  label: string;
  status?: string;
  tone?: UIListRowTone;
  selected?: boolean;
  stageId?: string;
};

type CustomStageToolActionId = 'paste' | 'validate' | 'save' | 'export' | 'editor' | 'back';

export class CustomStageToolScene extends Phaser.Scene {
  private readonly storage = new CustomStageStorage();
  private readonly validator = new CustomStageValidator();
  private screenManager?: ScreenManager;
  private panel?: CustomStageValidationPanel;
  private titleHeader?: SceneHeader;
  private inputText?: Phaser.GameObjects.Text;
  private readonly storedRowObjects: Phaser.GameObjects.Container[] = [];
  private storedRows: StoredStageRow[] = [];
  private storedListLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
    compact: boolean;
  };
  private actionBar?: UIActionBar<CustomStageToolActionId>;
  private draftPackage?: CustomStagePackage;
  private validationResult?: CustomStageValidationResult;
  private selectedStoredId?: string;
  private unsubscribeResize?: () => void;

  constructor() {
    super('CustomStageToolScene');
  }

  create(): void {
    this.screenManager = new ScreenManager(this);
    this.cameras.main.setBackgroundColor('#020617');
    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('customStage.title'),
    });
    this.inputText = new UITextBlock(this, {
      x: 0,
      y: 0,
      text: I18n.t('customStage.pasteJson'),
      tone: 'muted',
      fontSize: '13px',
      align: 'center',
      width: 560,
    }).text;
    this.panel = new CustomStageValidationPanel(this, 0, 0, 560);
    this.actionBar = new UIActionBar<CustomStageToolActionId>(this, this.getActions());
    this.refreshStoredList();
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private promptForJson(): void {
    const text = globalThis.prompt?.(I18n.t('customStage.pasteJson'), '');

    if (text === null || text === undefined) {
      return;
    }

    this.draftPackage = CustomStageSerializer.parseJson(text) ?? undefined;
    this.validationResult = this.draftPackage
      ? this.validator.validate(this.draftPackage)
      : createCustomStageValidationResult([{
        level: 'error',
        code: 'invalid_json',
        message: 'Input is not valid JSON.',
      }]);
    this.inputText?.setText(this.draftPackage
      ? `${this.draftPackage.id}  ${this.draftPackage.name}`
      : I18n.t('customStage.invalid'));
    this.panel?.update(this.validationResult);
  }

  private validateDraft(): void {
    if (!this.draftPackage) {
      this.validationResult = createCustomStageValidationResult([{
        level: 'error',
        code: 'missing_package',
        message: 'Paste JSON before validating.',
      }]);
      this.panel?.update(this.validationResult);
      return;
    }

    this.validationResult = this.validator.validate(this.draftPackage);
    this.panel?.update(this.validationResult);
  }

  private saveDraft(): void {
    if (!this.draftPackage || !this.validationResult?.valid) {
      this.validateDraft();
      return;
    }

    this.storage.save(this.draftPackage);
    this.selectedStoredId = this.draftPackage.id;
    this.refreshStoredList();
  }

  private exportSelected(): void {
    const selectedId = this.selectedStoredId ?? this.storage.list()[0]?.id;
    const stagePackage = selectedId ? this.storage.get(selectedId) : undefined;

    if (!stagePackage) {
      console.log('No custom stage selected for export.');
      return;
    }

    const serialized = CustomStageSerializer.serialize(stagePackage);
    const clipboard = globalThis.navigator?.clipboard;

    if (clipboard) {
      void clipboard.writeText(serialized).catch(() => console.log(serialized));
      return;
    }

    console.log(serialized);
  }

  private refreshStoredList(): void {
    const packages = this.storage.list();

    if (!this.selectedStoredId && packages[0]) {
      this.selectedStoredId = packages[0].id;
    }

    this.storedRows = packages.length === 0
      ? [
        {
          label: I18n.t('common.none'),
          status: '-',
          tone: 'muted',
        },
      ]
      : packages.slice(0, 6).map((stagePackage, index) => ({
        label: stagePackage.id,
        status: `#${index + 1}`,
        selected: stagePackage.id === this.selectedStoredId,
        tone: stagePackage.id === this.selectedStoredId ? 'normal' : 'muted',
        stageId: stagePackage.id,
      }));

    if (packages.length > 6) {
      this.storedRows.push({
        label: `+${packages.length - 6}`,
        tone: 'muted',
      });
    }

    this.renderStoredRows();
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: this.screenManager.isPortrait() ? 320 : tiny ? 460 : compact ? 540 : 620,
      maxHeight: this.screenManager.isPortrait() ? compact ? 560 : 620 : tiny ? 280 : compact ? 390 : 500,
      padding: compact ? 16 : 22,
    });
    const actionAreaHeight = this.screenManager.isPortrait()
      ? tiny ? 160 : 174
      : tiny ? 56 : compact ? 78 : 86;
    const buttonArea = {
      x: panel.content.x,
      y: panel.y + panel.height - actionAreaHeight - (this.screenManager.isPortrait() ? tiny ? 14 : 16 : tiny ? 10 : compact ? 14 : 18),
      width: panel.content.width,
      height: actionAreaHeight,
    };
    this.actionBar?.layout(this.screenManager, buttonArea, {
      columns: this.screenManager.isPortrait() ? 2 : 3,
      compact,
      minWidth: 96,
      maxWidth: tiny ? 138 : compact ? 160 : 184,
      minHeight: tiny ? 22 : 26,
      maxHeight: tiny ? 28 : compact ? 32 : 36,
      fontSize: tiny ? '9px' : compact ? '10px' : '11px',
    });

    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      panel.y + (tiny ? 22 : compact ? 26 : 32),
      Math.min(panel.width - 24, 720),
      { titleFontSize: LayoutConfig.getResponsiveFontSizes(this.screenManager).header },
    );
    this.inputText?.setPosition(this.screenManager.centerX, panel.y + (tiny ? 52 : compact ? 60 : 72));
    this.inputText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.inputText?.setWordWrapWidth(panel.content.width);
    const validationWidth = panel.content.width;
    const validationHeight = tiny
      ? this.screenManager.isPortrait() ? 142 : 96
      : compact ? 150 : 164;
    const validationX = panel.content.x;
    const validationY = panel.y + (tiny ? this.screenManager.isPortrait() ? 78 : 58 : compact ? 88 : 104);
    this.panel?.setPosition(validationX, validationY);
    this.panel?.updateLayout(validationWidth, validationHeight);
    const storedTop = validationY + validationHeight + (tiny ? 8 : 12);
    this.storedListLayout = {
      x: panel.content.x,
      y: storedTop,
      width: panel.content.width,
      height: Math.max(1, buttonArea.y - storedTop - (tiny ? 6 : 10)),
      compact,
    };
    this.renderStoredRows();

  }

  private renderStoredRows(): void {
    this.clearStoredRows();
    if (!this.storedListLayout) {
      return;
    }

    const { x, y, width, height, compact } = this.storedListLayout;
    const titleHeight = compact ? 20 : 24;
    const rowHeight = compact ? 20 : 24;
    const rowGap = compact ? 4 : 5;
    const maxRows = Math.max(1, Math.floor((height - titleHeight - rowGap) / (rowHeight + rowGap)));

    const titleRow = UIListRow.create(this, {
      x: x + width / 2,
      y: y + titleHeight / 2,
      width,
      height: titleHeight,
      label: I18n.t('customStage.storedStages'),
      tone: 'section',
      compact,
    });
    this.storedRowObjects.push(titleRow);

    this.storedRows.slice(0, maxRows).forEach((row, index) => {
      const rowObject = UIListRow.create(this, {
        x: x + width / 2,
        y: y + titleHeight + rowGap + rowHeight / 2 + index * (rowHeight + rowGap),
        width,
        height: rowHeight,
        label: row.label,
        status: row.status,
        tone: row.tone,
        selected: row.selected,
        disabled: !row.stageId,
        compact,
        onClick: row.stageId ? () => {
          this.selectedStoredId = row.stageId;
          this.refreshStoredList();
        } : undefined,
      });
      this.storedRowObjects.push(rowObject);
    });
  }

  private clearStoredRows(): void {
    this.storedRowObjects.forEach((row) => row.destroy(true));
    this.storedRowObjects.length = 0;
  }

  private getActions(): Array<UIActionBarAction<CustomStageToolActionId>> {
    return [
      { id: 'paste', label: I18n.t('customStage.pasteJson'), onClick: () => this.promptForJson() },
      { id: 'validate', label: I18n.t('customStage.validate'), onClick: () => this.validateDraft() },
      { id: 'save', label: I18n.t('customStage.save'), onClick: () => this.saveDraft() },
      { id: 'export', label: I18n.t('customStage.export'), onClick: () => this.exportSelected() },
      { id: 'editor', label: I18n.t('customStage.editorTitle'), onClick: () => this.scene.start('CustomStageEditorLiteScene') },
      { id: 'back', label: I18n.t('customStage.back'), onClick: () => this.scene.start('TitleScene') },
    ];
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.panel?.destroy();
    this.panel = undefined;
    this.inputText?.destroy();
    this.inputText = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
    this.clearStoredRows();
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
