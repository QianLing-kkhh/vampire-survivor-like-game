import Phaser from 'phaser';

import { CustomStagePackage, CustomWaveDefinition } from '../custom/CustomStageSchema';
import { CustomStageSerializer } from '../custom/CustomStageSerializer';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import { CustomStageTemplate } from '../custom/CustomStageTemplate';
import { CustomStageValidationResult } from '../custom/CustomStageValidationResult';
import { CustomStageValidator } from '../custom/CustomStageValidator';
import { I18n } from '../i18n/I18n';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { CustomStageEditorPanel } from '../ui/CustomStageEditorPanel';
import { CustomWaveEditorPanel } from '../ui/CustomWaveEditorPanel';
import { UITheme, getButtonMetrics, toCssColor } from '../ui/UITheme';

export class CustomStageEditorLiteScene extends Phaser.Scene {
  private readonly storage = new CustomStageStorage();
  private readonly validator = new CustomStageValidator();
  private screenManager?: ScreenManager;
  private titleText?: Phaser.GameObjects.Text;
  private editorPanel?: CustomStageEditorPanel;
  private wavePanel?: CustomWaveEditorPanel;
  private buttons: Phaser.GameObjects.Text[] = [];
  private draftPackage: CustomStagePackage = CustomStageTemplate.createDefaultCustomStagePackage();
  private validationResult?: CustomStageValidationResult;
  private selectedWaveIndex = 0;
  private unsubscribeResize?: () => void;

  constructor() {
    super('CustomStageEditorLiteScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#020617');
    this.screenManager = new ScreenManager(this);
    this.titleText = this.add.text(0, 0, I18n.t('customStage.editorTitle'), {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.titleFontSize,
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);

    this.buttons = [
      this.createButton(I18n.t('customStage.new'), () => this.createNewPackage()),
      this.createButton(I18n.t('customStage.load'), () => this.loadSavedPackage()),
      this.createButton(I18n.t('customStage.editBasic'), () => this.editBasicFields()),
      this.createButton(I18n.t('customStage.addWave'), () => this.addWave()),
      this.createButton(I18n.t('customStage.editWave'), () => this.editSelectedWave()),
      this.createButton(I18n.t('customStage.removeWave'), () => this.removeSelectedWave()),
      this.createButton(I18n.t('customStage.validate'), () => this.validateDraft()),
      this.createButton(I18n.t('customStage.save'), () => this.saveDraft()),
      this.createButton(I18n.t('customStage.exportJson'), () => {
        void this.exportDraft();
      }),
      this.createButton(I18n.t('customStage.back'), () => this.scene.start('CustomStageToolScene')),
    ];

    this.createOrUpdatePanels();
    this.validateDraft();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
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

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const fonts = LayoutConfig.getResponsiveFontSizes(this.screenManager);
    const top = this.screenManager.isPortrait() ? 232 : 126;
    const buttonLayout = LayoutConfig.getButtonListLayout({
      screen: this.screenManager,
      count: this.buttons.length,
      startY: this.screenManager.isPortrait() ? 92 : 82,
      mode: 'twoColumn',
      gap: this.screenManager.isPortrait() ? 40 : 42,
    });

    this.titleText?.setPosition(this.screenManager.centerX, 34);
    this.titleText?.setFontSize(fonts.title);

    this.buttons.forEach((button, index) => {
      const position = buttonLayout.positions[index];

      button.setPosition(position.x, position.y);
      button.setFontSize(buttonLayout.fontSize);
      button.setFixedSize(buttonLayout.width, buttonLayout.height);
    });

    this.createOrUpdatePanels(top);
    this.render();
  }

  private createOrUpdatePanels(top = 126): void {
    if (!this.screenManager) {
      return;
    }

    const margin = 16;
    const availableWidth = this.screenManager.width - margin * 2;
    const availableHeight = Math.max(240, this.screenManager.height - top - 18);
    const editorWidth = this.screenManager.isPortrait()
      ? availableWidth
      : Math.floor(availableWidth * 0.52);
    const waveWidth = this.screenManager.isPortrait()
      ? availableWidth
      : availableWidth - editorWidth - 12;
    const waveX = this.screenManager.isPortrait()
      ? margin
      : margin + editorWidth + 12;
    const waveY = this.screenManager.isPortrait()
      ? top + Math.floor(availableHeight * 0.52) + 10
      : top;
    const editorHeight = this.screenManager.isPortrait()
      ? Math.floor(availableHeight * 0.52)
      : availableHeight;
    const waveHeight = this.screenManager.isPortrait()
      ? availableHeight - editorHeight - 10
      : availableHeight;

    if (!this.editorPanel) {
      this.editorPanel = new CustomStageEditorPanel(this, margin, top, editorWidth, editorHeight);
      this.wavePanel = new CustomWaveEditorPanel(this, waveX, waveY, waveWidth, waveHeight);
      return;
    }

    this.editorPanel.updateLayout(margin, top, editorWidth, editorHeight);
    this.wavePanel?.updateLayout(waveX, waveY, waveWidth, waveHeight);
  }

  private render(): void {
    this.editorPanel?.render(this.draftPackage, this.validationResult);
    this.wavePanel?.render(
      this.getSortedWaves(),
      this.selectedWaveIndex,
      (index) => {
        this.selectedWaveIndex = index;
        this.render();
      },
    );
  }

  private createNewPackage(): void {
    this.draftPackage = CustomStageTemplate.createDefaultCustomStagePackage();
    this.selectedWaveIndex = 0;
    this.validateDraft();
  }

  private loadSavedPackage(): void {
    const packages = this.storage.list();

    if (packages.length === 0) {
      this.validationResult = undefined;
      this.render();
      return;
    }

    const idList = packages.map((stagePackage) => stagePackage.id).join(', ');
    const selectedId = globalThis.prompt?.(I18n.t('customStage.load'), packages[0].id);
    const stagePackage = selectedId ? this.storage.get(selectedId.trim()) : undefined;

    if (!stagePackage) {
      console.warn(`Custom stage package not found. Available: ${idList}`);
      return;
    }

    this.draftPackage = stagePackage;
    this.sortWavesInPlace();
    this.selectedWaveIndex = 0;
    this.validateDraft();
  }

  private editBasicFields(): void {
    const nextId = this.promptString('id', this.draftPackage.id);
    const nextName = this.promptString('name', this.draftPackage.name);
    const nextDescription = this.promptString('description', this.draftPackage.description ?? '');
    const nextWidth = this.promptNumber('map.width', this.draftPackage.map.width);
    const nextHeight = this.promptNumber('map.height', this.draftPackage.map.height);
    const nextBossId = this.promptString('stage.finalBossId', this.draftPackage.stage.finalBossId);
    const nextBossTime = this.promptNumber('stage.finalBossSpawnTime', this.draftPackage.stage.finalBossSpawnTime);
    const nextWarning = this.promptNumber('stage.warningBeforeBoss', this.draftPackage.stage.warningBeforeBoss);
    const allowEndless = this.promptBoolean('stage.allowEndless', this.draftPackage.stage.allowEndless);

    const previousId = this.draftPackage.id;
    this.draftPackage.id = nextId;
    this.draftPackage.name = nextName;
    this.draftPackage.description = nextDescription || undefined;
    this.draftPackage.stage.id = nextId;
    this.draftPackage.stage.name = nextName;
    this.draftPackage.map.id = this.draftPackage.map.id === `${previousId}_map`
      ? `${nextId}_map`
      : this.draftPackage.map.id;
    this.draftPackage.map.name = `${nextName} Map`;
    this.draftPackage.stage.mapId = this.draftPackage.map.id;
    this.draftPackage.stage.waveSetId = `${nextId}_waves`;
    this.draftPackage.map.width = nextWidth;
    this.draftPackage.map.height = nextHeight;
    this.draftPackage.stage.finalBossId = nextBossId;
    this.draftPackage.stage.finalBossSpawnTime = nextBossTime;
    this.draftPackage.stage.warningBeforeBoss = nextWarning;
    this.draftPackage.stage.allowEndless = allowEndless;
    this.validateDraft();
  }

  private addWave(): void {
    this.draftPackage.waves.push(CustomStageTemplate.createEmptyWave());
    this.sortWavesInPlace();
    this.selectedWaveIndex = this.draftPackage.waves.length - 1;
    this.validateDraft();
  }

  private editSelectedWave(): void {
    const wave = this.getSelectedWave();

    if (!wave) {
      return;
    }

    const nextWave: CustomWaveDefinition = {
      startTime: this.promptNumber('wave.startTime', wave.startTime),
      enemyId: this.promptString('wave.enemyId', wave.enemyId),
      count: this.promptNumber('wave.count', wave.count),
      interval: this.promptNumber('wave.interval', wave.interval),
      duration: this.promptOptionalNumber('wave.duration', wave.duration),
    };

    this.draftPackage.waves[this.selectedWaveIndex] = nextWave;
    this.sortWavesInPlace();
    this.selectedWaveIndex = Math.max(0, this.draftPackage.waves.indexOf(nextWave));
    this.validateDraft();
  }

  private removeSelectedWave(): void {
    if (this.draftPackage.waves.length === 0) {
      return;
    }

    this.draftPackage.waves.splice(this.selectedWaveIndex, 1);
    this.selectedWaveIndex = Math.max(0, Math.min(this.selectedWaveIndex, this.draftPackage.waves.length - 1));
    this.validateDraft();
  }

  private validateDraft(): void {
    this.validationResult = this.validator.validate(this.draftPackage);
    this.render();
  }

  private saveDraft(): void {
    this.validateDraft();

    if (!this.validationResult?.valid) {
      return;
    }

    this.storage.save(this.draftPackage);
    this.draftPackage = CustomStageSerializer.normalize(this.draftPackage);
    this.validateDraft();
    console.info('Custom stage saved. Select it from Stage Select.');
  }

  private async exportDraft(): Promise<void> {
    const serialized = CustomStageSerializer.serialize(this.draftPackage);

    try {
      await globalThis.navigator?.clipboard?.writeText(serialized);
      console.info('Custom stage JSON copied.');
    } catch {
      console.log(serialized);
    }
  }

  private getSelectedWave(): CustomWaveDefinition | undefined {
    return this.draftPackage.waves[this.selectedWaveIndex];
  }

  private getSortedWaves(): CustomWaveDefinition[] {
    return [...this.draftPackage.waves].sort((left, right) => left.startTime - right.startTime);
  }

  private sortWavesInPlace(): void {
    this.draftPackage.waves.sort((left, right) => left.startTime - right.startTime);
  }

  private promptString(label: string, currentValue: string): string {
    const value = globalThis.prompt?.(label, currentValue);

    return value === null || value === undefined ? currentValue : value.trim();
  }

  private promptNumber(label: string, currentValue: number): number {
    const value = globalThis.prompt?.(label, String(currentValue));
    const parsed = value === null || value === undefined ? Number.NaN : Number(value);

    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  private promptOptionalNumber(label: string, currentValue: number | undefined): number | undefined {
    const value = globalThis.prompt?.(label, currentValue === undefined ? '' : String(currentValue));

    if (value === null || value === undefined || value.trim() === '') {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : currentValue;
  }

  private promptBoolean(label: string, currentValue: boolean): boolean {
    const value = globalThis.prompt?.(label, currentValue ? 'true' : 'false');

    if (value === null || value === undefined) {
      return currentValue;
    }

    return value.trim().toLowerCase() === 'true' || value.trim() === '1';
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.editorPanel?.destroy();
    this.editorPanel = undefined;
    this.wavePanel?.destroy();
    this.wavePanel = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
