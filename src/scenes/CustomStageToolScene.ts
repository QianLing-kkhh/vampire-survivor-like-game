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
import {
  UITheme,
  getButtonMetrics,
  toCssColor,
} from '../ui/UITheme';

export class CustomStageToolScene extends Phaser.Scene {
  private readonly storage = new CustomStageStorage();
  private readonly validator = new CustomStageValidator();
  private screenManager?: ScreenManager;
  private panel?: CustomStageValidationPanel;
  private titleText?: Phaser.GameObjects.Text;
  private inputText?: Phaser.GameObjects.Text;
  private storedText?: Phaser.GameObjects.Text;
  private buttons: Phaser.GameObjects.Text[] = [];
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
    this.titleText = this.add.text(0, 0, I18n.t('customStage.title'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.inputText = this.add.text(0, 0, I18n.t('customStage.pasteJson'), {
      color: UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      align: 'center',
      wordWrap: { width: 560 },
    });
    this.inputText.setOrigin(0.5);
    this.storedText = this.add.text(0, 0, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.smallFontSize,
      lineSpacing: 4,
      wordWrap: { width: 560 },
    });
    this.panel = new CustomStageValidationPanel(this, 0, 0, 560);
    this.buttons = [
      this.createButton(I18n.t('customStage.pasteJson'), () => this.promptForJson()),
      this.createButton(I18n.t('customStage.validate'), () => this.validateDraft()),
      this.createButton(I18n.t('customStage.save'), () => this.saveDraft()),
      this.createButton(I18n.t('customStage.export'), () => this.exportSelected()),
      this.createButton(I18n.t('customStage.editorTitle'), () => this.scene.start('CustomStageEditorLiteScene')),
      this.createButton(I18n.t('customStage.back'), () => this.scene.start('TitleScene')),
    ];
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

    const lines = packages.length === 0
      ? [I18n.t('customStage.storedStages'), I18n.t('common.none')]
      : [
        I18n.t('customStage.storedStages'),
        ...packages.slice(0, 6).map((stagePackage) => (
          `${stagePackage.id === this.selectedStoredId ? '>' : ' '} ${stagePackage.id}`
        )),
      ];

    if (packages.length > 6) {
      lines.push(`+${packages.length - 6} more`);
    }

    this.storedText?.setText(lines.join('\n'));
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const panel = LayoutConfig.getPanelLayout(this.screenManager, {
      maxWidth: this.screenManager.isPortrait() ? 360 : 640,
      maxHeight: this.screenManager.isPortrait() ? 680 : 620,
      padding: 24,
    });
    const metrics = getButtonMetrics(this.screenManager.width, this.screenManager.height);
    const mode = this.screenManager.isPortrait() ? 'vertical' : 'twoColumn';
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: this.buttons.length,
      centerX: this.screenManager.centerX,
      startY: panel.y + panel.height - (this.screenManager.isPortrait() ? 210 : 120),
      mode,
      gap: metrics.height + 8,
    });

    this.titleText?.setPosition(this.screenManager.centerX, panel.y + 32);
    this.titleText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).header);
    this.inputText?.setPosition(this.screenManager.centerX, panel.y + 72);
    this.inputText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);
    this.panel?.setPosition(panel.x + 20, panel.y + 104);
    this.storedText?.setPosition(panel.x + 20, panel.y + 304);
    this.storedText?.setFontSize(LayoutConfig.getResponsiveFontSizes(this.screenManager).small);

    this.buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];
      button.setPosition(position.x, position.y);
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
    });
  }

  private createButton(label: string, onClick: () => void): Phaser.GameObjects.Text {
    const metrics = getButtonMetrics(this.scale.width, this.scale.height);
    const button = this.add.text(0, 0, label, {
      backgroundColor: toCssColor(UITheme.buttonBgColor),
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      align: 'center',
      fixedWidth: metrics.width,
      fixedHeight: metrics.height,
      padding: { x: 0, y: Math.max(0, Math.floor((metrics.height - 22) / 2)) },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerover', () => button.setBackgroundColor(toCssColor(UITheme.buttonHoverColor)));
    button.on('pointerout', () => button.setBackgroundColor(toCssColor(UITheme.buttonBgColor)));
    button.on('pointerdown', onClick);
    return button;
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.panel?.destroy();
    this.panel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
