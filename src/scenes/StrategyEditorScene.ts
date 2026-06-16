import Phaser from 'phaser';

import { I18n } from '../i18n/I18n';
import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { AutoStrategySerializer } from '../strategy/serializer/AutoStrategySerializer';
import { StrategyProfileRepository } from '../strategy/profile/StrategyProfileRepository';
import { LayoutConfig } from '../responsive/LayoutConfig';
import { ScreenManager } from '../responsive/ScreenManager';
import { PanelFrame } from '../ui/components/PanelFrame';
import { SceneHeader } from '../ui/components/SceneHeader';
import { UIActionBar, UIActionBarAction } from '../ui/components/UIActionBar';
import { UIButton } from '../ui/components/UIButton';
import { UISlider } from '../ui/components/UISlider';
import { UITextBlock } from '../ui/components/UITextBlock';

type StrategySection = 'movement' | 'upgrade' | 'treasure' | 'relic';
type StrategyEditorActionId = 'save' | 'copy' | 'delete' | 'export' | 'import' | 'reset';

interface SliderBinding {
  section: StrategySection;
  key: string;
  labelKey: string;
}

interface SliderControl {
  binding: SliderBinding;
  slider: UISlider;
}

const SLIDER_BINDINGS: readonly SliderBinding[] = [
  { section: 'movement', key: 'survivalBias', labelKey: 'strategyEditor.slider.survival' },
  { section: 'movement', key: 'farmBias', labelKey: 'strategyEditor.slider.farm' },
  { section: 'movement', key: 'treasureBias', labelKey: 'strategyEditor.slider.treasure' },
  { section: 'movement', key: 'bossBias', labelKey: 'strategyEditor.slider.boss' },
  { section: 'movement', key: 'riskTolerance', labelKey: 'strategyEditor.slider.risk' },
  { section: 'movement', key: 'loopBias', labelKey: 'strategyEditor.slider.loop' },
  { section: 'upgrade', key: 'evolutionPriority', labelKey: 'strategyEditor.slider.evolution' },
  { section: 'upgrade', key: 'mainWeaponPriority', labelKey: 'strategyEditor.slider.mainWeapon' },
  { section: 'upgrade', key: 'survivalPriority', labelKey: 'strategyEditor.slider.survivalUp' },
  { section: 'upgrade', key: 'damagePriority', labelKey: 'strategyEditor.slider.damageUp' },
  { section: 'treasure', key: 'openRiskTolerance', labelKey: 'strategyEditor.slider.chestRisk' },
  { section: 'treasure', key: 'evolutionChestPriority', labelKey: 'strategyEditor.slider.evoChest' },
  { section: 'relic', key: 'synergyPriority', labelKey: 'strategyEditor.slider.relicSynergy' },
  { section: 'relic', key: 'damageRelicPriority', labelKey: 'strategyEditor.slider.damageRelic' },
  { section: 'relic', key: 'survivalRelicPriority', labelKey: 'strategyEditor.slider.survivalRelic' },
  { section: 'relic', key: 'economyRelicPriority', labelKey: 'strategyEditor.slider.economyRelic' },
];

export class StrategyEditorScene extends Phaser.Scene {
  private screenManager?: ScreenManager;
  private titleHeader?: SceneHeader;
  private profileFrame?: Phaser.GameObjects.Container;
  private sliderFrame?: Phaser.GameObjects.Container;
  private detailFrame?: Phaser.GameObjects.Container;
  private profileActionBar?: UIActionBar<string>;
  private profileCount = 0;
  private actionBar?: UIActionBar<StrategyEditorActionId>;
  private sliderControls: SliderControl[] = [];
  private backButton?: UIButton;
  private detailText?: Phaser.GameObjects.Text;
  private activeText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private editingProfile?: AutoStrategyProfile;
  private unsubscribeResize?: () => void;

  constructor() {
    super('StrategyEditorScene');
  }

  create(): void {
    this.screenManager = new ScreenManager(this);
    this.cameras.main.setBackgroundColor('#020617');
    this.titleHeader = new SceneHeader(this, {
      title: I18n.t('strategyPanel.title'),
      subtitle: I18n.t('strategyEditor.subtitle'),
      depth: 20,
    });
    this.activeText = new UITextBlock(this, {
      x: 32,
      y: 72,
      fontSize: '18px',
      align: 'left',
    }).text;
    this.statusText = new UITextBlock(this, {
      x: 32,
      y: this.scale.height - 92,
      tone: 'muted',
      fontSize: '13px',
      align: 'left',
    }).text;
    this.detailText = new UITextBlock(this, {
      x: 620,
      y: 92,
      tone: 'muted',
      fontSize: '11px',
      align: 'left',
      width: Math.max(280, this.scale.width - 652),
    }).text;
    this.detailText.setFontFamily('monospace');

    this.createProfileButtons();
    this.createActionButtons();
    this.loadSelectedProfile();

    this.backButton = new UIButton(this, {
      x: 32 + 90,
      y: this.scale.height - 56,
      label: I18n.t('common.back'),
      width: 180,
      size: 'small',
      onClick: () => {
        this.scene.start('TitleScene');
      },
    });
    this.applyLayout();
    this.unsubscribeResize = this.screenManager.onResize(() => this.applyLayout());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);
  }

  private createProfileButtons(): void {
    const profiles = StrategyProfileRepository.listProfiles();
    this.profileCount = profiles.length;
    this.profileActionBar?.destroy();
    this.profileActionBar = new UIActionBar<string>(this, this.getProfileActions(profiles));
  }

  private getProfileActions(profiles: AutoStrategyProfile[]): Array<UIActionBarAction<string>> {
    const selectedId = StrategyProfileRepository.getSelectedProfile().id;

    return profiles.map((profile) => ({
      id: profile.id,
      label: profile.name,
      selected: profile.id === selectedId,
      onClick: () => {
        StrategyProfileRepository.selectProfile(profile.id);
        this.loadSelectedProfile();
      },
    }));
  }

  private createActionButtons(): void {
    this.actionBar?.destroy();
    this.actionBar = new UIActionBar<StrategyEditorActionId>(this, [
      { id: 'save', label: I18n.t('strategyEditor.action.save'), onClick: () => this.saveEditingProfile() },
      { id: 'copy', label: I18n.t('strategyEditor.action.copy'), onClick: () => this.copySelectedProfile() },
      { id: 'delete', label: I18n.t('strategyEditor.action.delete'), onClick: () => this.deleteSelectedProfile() },
      { id: 'export', label: I18n.t('strategyEditor.action.export'), onClick: () => this.exportSelectedProfile() },
      { id: 'import', label: I18n.t('strategyEditor.action.import'), onClick: () => this.importProfile() },
      { id: 'reset', label: I18n.t('strategyEditor.action.reset'), onClick: () => this.loadSelectedProfile() },
    ]);
  }

  private loadSelectedProfile(): void {
    this.editingProfile = StrategyProfileRepository.getSelectedProfile();
    this.refreshProfileButtons();
    this.rebuildSliders();
    this.refreshProfileDetails();
  }

  private rebuildSliders(): void {
    this.sliderControls.forEach((control) => control.slider.destroy());
    this.sliderControls = [];

    SLIDER_BINDINGS.forEach((binding, index) => {
      const column = index < 8 ? 0 : 1;
      const row = column === 0 ? index : index - 8;
      const x = 352 + column * 300;
      const y = 128 + row * 44;
      this.sliderControls.push(this.createSlider(binding, x, y));
    });
    this.applyLayout();
  }

  private createSlider(binding: SliderBinding, x: number, y: number): SliderControl {
    const slider = new UISlider(this, {
      x,
      y,
      label: I18n.t(binding.labelKey),
      value: this.getProfileWeight(binding),
      min: 0,
      max: 100,
      step: 1,
      width: 244,
      labelWidth: 84,
      trackWidth: 180,
      onChange: (value) => {
        this.setProfileWeight(binding, value);
        this.refreshProfileDetails({ keepStatus: true });
      },
    });

    return { binding, slider };
  }

  private saveEditingProfile(): void {
    if (!this.editingProfile) {
      return;
    }

    const saved = StrategyProfileRepository.saveProfile(this.editingProfile, true);
    this.setStatus(I18n.t('strategyEditor.status.saved', { name: saved.name }));
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private copySelectedProfile(): void {
    const copied = StrategyProfileRepository.copyProfile(StrategyProfileRepository.getSelectedProfile().id);
    this.setStatus(I18n.t('strategyEditor.status.copied', { name: copied.name }));
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private deleteSelectedProfile(): void {
    const selected = StrategyProfileRepository.getSelectedProfile();

    if (!StrategyProfileRepository.deleteProfile(selected.id)) {
      this.setStatus(I18n.t('strategyEditor.status.builtinDeleteBlocked'));
      return;
    }

    this.setStatus(I18n.t('strategyEditor.status.deleted', { name: selected.name }));
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private exportSelectedProfile(): void {
    const serialized = AutoStrategySerializer.serialize(StrategyProfileRepository.getSelectedProfile());

    if (navigator.clipboard) {
      navigator.clipboard.writeText(serialized).then(
        () => this.setStatus(I18n.t('strategyEditor.status.clipboardCopied')),
        () => {
          console.log('Strategy JSON:', serialized);
          this.setStatus(I18n.t('strategyEditor.status.clipboardFailed'));
        },
      );
      return;
    }

    console.log('Strategy JSON:', serialized);
    this.setStatus(I18n.t('strategyEditor.status.jsonLogged'));
  }

  private importProfile(): void {
    const serialized = window.prompt(I18n.t('strategyEditor.prompt.importJson'));

    if (!serialized) {
      return;
    }

    try {
      const imported = StrategyProfileRepository.importProfile(
        AutoStrategySerializer.deserialize(serialized),
        true,
      );
      this.setStatus(I18n.t('strategyEditor.status.imported', { name: imported.name }));
      this.createProfileButtons();
      this.loadSelectedProfile();
    } catch (error) {
      console.warn('Failed to import strategy profile:', error);
      this.setStatus(I18n.t('strategyEditor.status.importFailed'));
    }
  }

  private refreshProfileButtons(): void {
    const selectedId = StrategyProfileRepository.getSelectedProfile().id;

    StrategyProfileRepository.listProfiles().forEach((profile) => {
      this.profileActionBar?.setSelected(profile.id, profile.id === selectedId);
    });
  }

  private refreshProfileDetails(options: { keepStatus?: boolean } = {}): void {
    const profile = this.editingProfile ?? StrategyProfileRepository.getSelectedProfile();
    const readonlyLabel = StrategyProfileRepository.isReadonlyProfile(profile.id)
      ? I18n.t('strategyEditor.readonly.builtin')
      : I18n.t('strategyEditor.readonly.custom');

    this.activeText?.setText(I18n.t('strategyEditor.activeProfile', {
      name: profile.name,
      id: profile.id,
      type: readonlyLabel,
    }));
    this.detailText?.setText([
      this.formatSummary(profile),
      '',
      AutoStrategySerializer.serialize(profile),
    ].join('\n'));

    if (!options.keepStatus) {
      this.setStatus(StrategyProfileRepository.isReadonlyProfile(profile.id)
        ? I18n.t('strategyEditor.status.editBuiltin')
        : I18n.t('strategyEditor.status.editCustom'));
    }
  }

  private getProfileWeight(binding: SliderBinding): number {
    const profile = this.editingProfile ?? StrategyProfileRepository.getSelectedProfile();
    const section = profile[binding.section] as unknown as Record<string, number>;

    return section[binding.key] ?? 0;
  }

  private setProfileWeight(binding: SliderBinding, value: number): void {
    if (!this.editingProfile) {
      return;
    }

    const section = this.editingProfile[binding.section] as unknown as Record<string, number>;
    section[binding.key] = Math.max(0, Math.min(100, value));
  }

  private setStatus(message: string): void {
    this.statusText?.setText(message);
  }

  private formatSummary(profile: AutoStrategyProfile): string {
    return [
      `${I18n.t('strategyEditor.section.movement')}: ${I18n.t('strategyEditor.slider.survival')} ${profile.movement.survivalBias}, ${I18n.t('strategyEditor.slider.farm')} ${profile.movement.farmBias}, ${I18n.t('strategyEditor.slider.treasure')} ${profile.movement.treasureBias}, ${I18n.t('strategyEditor.slider.boss')} ${profile.movement.bossBias}, ${I18n.t('strategyEditor.slider.risk')} ${profile.movement.riskTolerance}`,
      `${I18n.t('strategyEditor.section.upgrade')}: ${I18n.t('strategyEditor.slider.evolution')} ${profile.upgrade.evolutionPriority}, ${I18n.t('strategyEditor.slider.mainWeapon')} ${profile.upgrade.mainWeaponPriority}, ${I18n.t('strategyEditor.slider.survivalUp')} ${profile.upgrade.survivalPriority}, ${I18n.t('strategyEditor.slider.damageUp')} ${profile.upgrade.damagePriority}`,
      `${I18n.t('strategyEditor.section.treasure')}: ${I18n.t('strategyEditor.slider.chestRisk')} ${profile.treasure.openRiskTolerance}, ${I18n.t('strategyEditor.slider.evoChest')} ${profile.treasure.evolutionChestPriority}, ${I18n.t('strategyEditor.route')} ${profile.treasure.routeDeviationTolerance}`,
      `${I18n.t('strategyEditor.section.relic')}: ${I18n.t('strategyEditor.slider.relicSynergy')} ${profile.relic.synergyPriority}, ${I18n.t('strategyEditor.slider.survivalRelic')} ${profile.relic.survivalRelicPriority}, ${I18n.t('strategyEditor.slider.damageRelic')} ${profile.relic.damageRelicPriority}, ${I18n.t('strategyEditor.slider.economyRelic')} ${profile.relic.economyRelicPriority}`,
    ].join('\n');
  }

  private applyLayout(): void {
    if (!this.screenManager) {
      return;
    }

    const density = LayoutConfig.getContentDensity(this.screenManager);
    const tiny = density === 'tiny';
    const compact = density === 'compact' || tiny;
    const portrait = this.screenManager.isPortrait();
    const margin = tiny ? 10 : compact ? 14 : 24;
    const titleY = tiny ? 22 : compact ? 28 : 34;
    const bottomY = this.screenManager.height - (tiny ? 24 : 34);
    const actionY = portrait ? bottomY - (tiny ? 32 : 38) : bottomY;
    const statusY = portrait ? actionY - (tiny ? 30 : 36) : this.screenManager.height - (tiny ? 54 : 74);
    const profileWidth = portrait
      ? Math.min(this.screenManager.width - margin * 2, tiny ? 220 : 280)
      : compact ? 210 : 260;
    const profileStartY = portrait ? tiny ? 64 : 76 : tiny ? 58 : 86;
    const profileGap = tiny ? 30 : compact ? 34 : 40;
    const profileX = portrait ? this.screenManager.centerX : margin + profileWidth / 2;
    const sliderStartX = portrait ? margin : margin + profileWidth + (compact ? 18 : 32);
    const profileToSliderGap = tiny ? 24 : compact ? 28 : 32;
    const sliderStartY = portrait
      ? profileStartY + this.profileCount * profileGap + profileToSliderGap
      : profileStartY + (tiny ? 6 : 12);
    const sliderColumns = portrait
      ? this.screenManager.width >= 360 ? 2 : 1
      : 2;
    const sliderGapX = tiny ? 8 : compact ? 10 : 14;
    const portraitSliderColumnWidth = sliderColumns > 1
      ? Math.floor((this.screenManager.width - margin * 2 - sliderGapX) / 2)
      : this.screenManager.width - margin * 2;
    const sliderColumnWidth = portrait
      ? Math.min(tiny ? 188 : 210, portraitSliderColumnWidth)
      : tiny ? 178 : compact ? 250 : 292;
    const sliderTotalWidth = sliderColumns * sliderColumnWidth + Math.max(0, sliderColumns - 1) * sliderGapX;
    const detailFrameGap = tiny ? 18 : compact ? 22 : 26;
    const sliderGapY = tiny ? 32 : compact ? 36 : 42;
    const detailWidth = portrait
      ? this.screenManager.width - margin * 2
      : Math.max(tiny ? 196 : 220, this.screenManager.width - sliderStartX - sliderTotalWidth - detailFrameGap - margin);
    const detailX = portrait
      ? margin
      : Math.max(sliderStartX + sliderTotalWidth + detailFrameGap, this.screenManager.width - detailWidth - margin);
    const detailY = portrait
      ? Math.min(bottomY - 118, sliderStartY + Math.ceil(this.sliderControls.length / sliderColumns) * sliderGapY + 8)
      : profileStartY;
    const visibleProfileCount = this.profileCount;
    const visibleSliderRows = Math.ceil(this.sliderControls.length / sliderColumns);
    const profilePanel = {
      x: profileX - profileWidth / 2 - (tiny ? 8 : 10),
      y: profileStartY - (tiny ? 18 : 22),
      width: profileWidth + (tiny ? 16 : 20),
      height: visibleProfileCount * profileGap + (tiny ? 20 : 28),
    };
    const sliderPanel = {
      x: sliderStartX - (tiny ? 10 : 14),
      y: sliderStartY - (tiny ? 20 : 24),
      width: sliderTotalWidth + (tiny ? 20 : 28),
      height: visibleSliderRows * sliderGapY + (tiny ? 18 : 26),
    };
    const detailPanel = {
      x: detailX - (tiny ? 8 : 10),
      y: detailY - (tiny ? 10 : 12),
      width: detailWidth + (tiny ? 16 : 20),
      height: Math.max(110, (portrait ? statusY : bottomY) - detailY - (portrait ? 6 : 38)),
    };

    this.titleHeader?.setLayout(
      this.screenManager.centerX,
      titleY + (tiny ? 4 : 8),
      Math.min(this.screenManager.width - margin * 2, 760),
      {
        titleFontSize: tiny ? '18px' : compact ? '22px' : '28px',
        subtitleFontSize: tiny ? '9px' : compact ? '10px' : '11px',
      },
    );
    this.layoutEditorFrames(profilePanel, sliderPanel, detailPanel);
    this.activeText?.setPosition(margin, titleY + (tiny ? 28 : 38));
    this.activeText?.setFontSize(tiny ? '11px' : compact ? '13px' : '18px');
    this.activeText?.setWordWrapWidth(Math.max(180, this.screenManager.width - margin * 2));
    this.statusText?.setPosition(margin, statusY);
    this.statusText?.setFontSize(tiny ? '10px' : compact ? '11px' : '13px');
    this.statusText?.setWordWrapWidth(Math.max(180, this.screenManager.width - margin * 2));
    this.detailText?.setPosition(detailX, detailY);
    this.detailText?.setFontSize(tiny ? '9px' : compact ? '10px' : '11px');
    this.detailText?.setWordWrapWidth(detailWidth);
    this.detailText?.setFixedSize(detailWidth, Math.max(90, (portrait ? statusY : bottomY) - detailY - (portrait ? 12 : 46)));
    this.detailText?.setMaxLines(portrait ? tiny ? 8 : 10 : tiny ? 14 : 20);

    this.profileActionBar?.layout(
      this.screenManager,
      {
        x: profileX - profileWidth / 2,
        y: profileStartY - profileGap / 2,
        width: profileWidth,
        height: Math.max(profileGap, this.profileCount * profileGap),
      },
      {
        columns: 1,
        compact: true,
        minWidth: profileWidth,
        maxWidth: profileWidth,
        minHeight: tiny ? 26 : compact ? 30 : 34,
        maxHeight: tiny ? 26 : compact ? 30 : 34,
        fontSize: tiny ? '10px' : compact ? '11px' : '12px',
      },
    );

    this.sliderControls.forEach((control, index) => {
      const rowCapacity = Math.ceil(this.sliderControls.length / sliderColumns);
      const column = sliderColumns === 1 ? 0 : Math.floor(index / rowCapacity);
      const row = sliderColumns === 1 ? index : index % rowCapacity;
      control.slider.setPosition(sliderStartX + column * (sliderColumnWidth + sliderGapX), sliderStartY + row * sliderGapY);
      control.slider.setLayout({
        width: sliderColumnWidth - (tiny ? 8 : 12),
        labelWidth: tiny ? 62 : compact ? 74 : 84,
        trackWidth: tiny ? 112 : compact ? 142 : 180,
        compact: tiny || compact,
      });
      control.slider.setVisible(true);
      control.slider.setValue(this.getProfileWeight(control.binding));
    });

    this.actionBar?.layout(
      this.screenManager,
      {
        x: portrait ? margin : margin + profileWidth + (compact ? 20 : 32),
        y: actionY - (tiny ? 13 : 15),
        width: portrait
          ? this.screenManager.width - margin * 2
          : Math.min(this.screenManager.width - margin * 2, 6 * (compact ? 98 : 114)),
        height: tiny ? 58 : 66,
      },
      {
        columns: portrait ? 3 : 6,
        compact: true,
        minWidth: tiny ? 72 : 86,
        maxWidth: tiny ? 92 : compact ? 102 : 112,
        minHeight: tiny ? 24 : 28,
        maxHeight: tiny ? 26 : 30,
        fontSize: tiny ? '9px' : '11px',
      },
    );
    this.backButton?.setPosition(
      portrait
        ? this.screenManager.width - margin - (tiny ? 34 : 44)
        : margin + (tiny ? 45 : 60),
      portrait ? titleY : bottomY,
    );
    this.backButton?.setSize(portrait ? tiny ? 68 : 88 : tiny ? 90 : 120, tiny ? 26 : 30);
    this.backButton?.setFontSize(tiny ? '10px' : '11px');
  }

  private layoutEditorFrames(
    profilePanel: { x: number; y: number; width: number; height: number },
    sliderPanel: { x: number; y: number; width: number; height: number },
    detailPanel: { x: number; y: number; width: number; height: number },
  ): void {
    this.profileFrame?.destroy(true);
    this.sliderFrame?.destroy(true);
    this.detailFrame?.destroy(true);
    this.profileFrame = this.createEditorFrame(profilePanel);
    this.sliderFrame = this.createEditorFrame(sliderPanel);
    this.detailFrame = this.createEditorFrame(detailPanel);
  }

  private createEditorFrame(rect: { x: number; y: number; width: number; height: number }): Phaser.GameObjects.Container {
    const frame = PanelFrame.create(this, {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      width: rect.width,
      height: rect.height,
      alpha: 0.34,
      variant: 'card',
    });
    frame.setDepth(-10);
    return frame;
  }

  private cleanup(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = undefined;
    this.titleHeader?.destroy();
    this.titleHeader = undefined;
    this.profileFrame?.destroy(true);
    this.profileFrame = undefined;
    this.sliderFrame?.destroy(true);
    this.sliderFrame = undefined;
    this.detailFrame?.destroy(true);
    this.detailFrame = undefined;
    this.actionBar?.destroy();
    this.actionBar = undefined;
    this.profileActionBar?.destroy();
    this.profileActionBar = undefined;
    this.sliderControls.forEach((control) => control.slider.destroy());
    this.sliderControls = [];
    this.backButton?.destroy();
    this.backButton = undefined;
    this.activeText?.destroy();
    this.activeText = undefined;
    this.statusText?.destroy();
    this.statusText = undefined;
    this.detailText?.destroy();
    this.detailText = undefined;
    this.screenManager?.dispose();
    this.screenManager = undefined;
  }
}
