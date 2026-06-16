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
import { SceneHeader } from '../ui/components/SceneHeader';
import { UIActionBar, UIActionBarAction } from '../ui/components/UIActionBar';
import { CustomStageEditorPanel } from '../ui/CustomStageEditorPanel';
import { CustomWaveEditorPanel } from '../ui/CustomWaveEditorPanel';

type CustomStageEditorActionId =
  | 'new'
  | 'load'
  | 'editBasic'
  | 'addWave'
  | 'editWave'
  | 'removeWave'
  | 'validate'
  | 'save'
  | 'exportJson'
  | 'back';

export class CustomStageEditorLiteScene extends Phaser.Scene {
  private readonly storage = new CustomStageStorage();
  private readonly validator = new CustomStageValidator();
  private screenManager?: ScreenManager;
  private titleHeader?: SceneHeader;
  private editorPanel?: CustomStageEditorPanel;
  private wavePanel?: CustomWaveEditorPanel;
  private actionBar?: UIActionBar<CustomStageEditorActionId>;
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
    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('customStage.editorTitle'),
    });

    this.actionBar = new UIActionBar<CustomStageEditorActionId>(this, this.getActions());

    this.createOrUpdatePanels();
    this.validateDraft();
    this.applyLayout();
    this.render();

    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
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
    const buttonArea = {
      x: tiny ? 10 : 16,
      y: this.screenManager.isPortrait() ? tiny ? 50 : compact ? 58 : 70 : compact ? 54 : 68,
      width: this.screenManager.width - (tiny ? 20 : 32),
      height: this.screenManager.isPortrait() ? tiny ? 164 : compact ? 180 : 214 : tiny ? 72 : compact ? 82 : 96,
    };
    const top = buttonArea.y + buttonArea.height + (this.screenManager.isPortrait() ? tiny ? 8 : 12 : compact ? 10 : 16);
    this.actionBar?.layout(this.screenManager, buttonArea, {
      columns: this.screenManager.isPortrait() ? 2 : 5,
      compact,
      minWidth: 84,
      maxWidth: tiny ? 122 : compact ? 138 : 154,
      minHeight: tiny ? 20 : 24,
      maxHeight: tiny ? 24 : compact ? 27 : 30,
      fontSize: tiny ? '9px' : compact ? '10px' : '11px',
    });

    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      tiny ? 24 : compact ? 28 : 34,
      Math.min(this.screenManager.width - 24, 820),
      { titleFontSize: fonts.title },
    );

    this.createOrUpdatePanels(top);
    this.render();
  }

  private getActions(): Array<UIActionBarAction<CustomStageEditorActionId>> {
    return [
      { id: 'new', label: I18n.t('customStage.new'), onClick: () => this.createNewPackage() },
      { id: 'load', label: I18n.t('customStage.load'), onClick: () => this.loadSavedPackage() },
      { id: 'editBasic', label: I18n.t('customStage.editBasic'), onClick: () => this.editBasicFields() },
      { id: 'addWave', label: I18n.t('customStage.addWave'), onClick: () => this.addWave() },
      { id: 'editWave', label: I18n.t('customStage.editWave'), onClick: () => this.editSelectedWave() },
      { id: 'removeWave', label: I18n.t('customStage.removeWave'), onClick: () => this.removeSelectedWave() },
      { id: 'validate', label: I18n.t('customStage.validate'), onClick: () => this.validateDraft() },
      { id: 'save', label: I18n.t('customStage.save'), onClick: () => this.saveDraft() },
      {
        id: 'exportJson',
        label: I18n.t('customStage.exportJson'),
        onClick: () => {
          void this.exportDraft();
        },
      },
      { id: 'back', label: I18n.t('customStage.back'), onClick: () => this.scene.start('CustomStageToolScene') },
    ];
  }

  private createOrUpdatePanels(top = 126): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const margin = tiny ? 10 : compact ? 12 : 16;
    const availableWidth = this.screenManager.width - margin * 2;
    const availableHeight = Math.max(tiny ? 150 : compact ? 190 : 240, this.screenManager.height - top - (tiny ? 10 : 18));
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
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.editorPanel?.destroy();
    this.editorPanel = undefined;
    this.wavePanel?.destroy();
    this.wavePanel = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
