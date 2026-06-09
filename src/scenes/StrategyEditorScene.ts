import Phaser from 'phaser';

import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { AutoStrategySerializer } from '../strategy/serializer/AutoStrategySerializer';
import { StrategyProfileRepository } from '../strategy/profile/StrategyProfileRepository';
import { UIButton } from '../ui/components/UIButton';
import { UITheme } from '../ui/UITheme';

type StrategySection = 'movement' | 'upgrade' | 'treasure' | 'relic';

interface SliderBinding {
  section: StrategySection;
  key: string;
  label: string;
}

interface SliderControl {
  binding: SliderBinding;
  container: Phaser.GameObjects.Container;
  track: Phaser.GameObjects.Graphics;
  knob: Phaser.GameObjects.Graphics;
  valueText: Phaser.GameObjects.Text;
}

const SLIDER_BINDINGS: readonly SliderBinding[] = [
  { section: 'movement', key: 'survivalBias', label: 'Survival' },
  { section: 'movement', key: 'farmBias', label: 'Farm' },
  { section: 'movement', key: 'treasureBias', label: 'Treasure' },
  { section: 'movement', key: 'bossBias', label: 'Boss' },
  { section: 'movement', key: 'riskTolerance', label: 'Risk' },
  { section: 'movement', key: 'loopBias', label: 'Loop' },
  { section: 'upgrade', key: 'evolutionPriority', label: 'Evolution' },
  { section: 'upgrade', key: 'mainWeaponPriority', label: 'Main Weapon' },
  { section: 'upgrade', key: 'survivalPriority', label: 'Survival Up' },
  { section: 'upgrade', key: 'damagePriority', label: 'Damage Up' },
  { section: 'treasure', key: 'openRiskTolerance', label: 'Chest Risk' },
  { section: 'treasure', key: 'evolutionChestPriority', label: 'Evo Chest' },
  { section: 'relic', key: 'synergyPriority', label: 'Relic Synergy' },
  { section: 'relic', key: 'damageRelicPriority', label: 'Damage Relic' },
  { section: 'relic', key: 'survivalRelicPriority', label: 'Survival Relic' },
  { section: 'relic', key: 'economyRelicPriority', label: 'Economy Relic' },
];

export class StrategyEditorScene extends Phaser.Scene {
  private profileButtons: Array<{ profileId: string; button: UIButton }> = [];
  private actionButtons: UIButton[] = [];
  private sliderControls: SliderControl[] = [];
  private detailText?: Phaser.GameObjects.Text;
  private activeText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private editingProfile?: AutoStrategyProfile;

  constructor() {
    super('StrategyEditorScene');
  }

  create(): void {
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, UITheme.panelBgColor)
      .setOrigin(0);
    this.add.text(32, 28, 'Auto Strategy', {
      color: UITheme.textColor,
      fontSize: '28px',
      fontStyle: 'bold',
    });
    this.activeText = this.add.text(32, 72, '', {
      color: UITheme.textColor,
      fontSize: '18px',
    });
    this.statusText = this.add.text(32, this.scale.height - 92, '', {
      color: UITheme.mutedTextColor,
      fontSize: '13px',
    });
    this.detailText = this.add.text(620, 92, '', {
      color: UITheme.mutedTextColor,
      fontSize: '11px',
      fontFamily: 'monospace',
      wordWrap: { width: Math.max(280, this.scale.width - 652) },
    });

    this.createProfileButtons();
    this.createActionButtons();
    this.loadSelectedProfile();

    new UIButton(this, {
      x: 32 + 90,
      y: this.scale.height - 56,
      label: 'Back',
      width: 180,
      size: 'small',
      onClick: () => {
        this.scene.start('TitleScene');
      },
    });
  }

  private createProfileButtons(): void {
    const profiles = StrategyProfileRepository.listProfiles();
    const selectedId = StrategyProfileRepository.getSelectedProfile().id;
    const startY = 122;
    const gap = 42;

    this.profileButtons.forEach(({ button }) => button.destroy());
    this.profileButtons = profiles.map((profile, index) => ({
      profileId: profile.id,
      button: new UIButton(this, {
        x: 32 + 140,
        y: startY + index * gap,
        label: profile.name,
        width: 280,
        size: 'small',
        selected: profile.id === selectedId,
        onClick: () => {
          StrategyProfileRepository.selectProfile(profile.id);
          this.loadSelectedProfile();
        },
      }),
    }));
  }

  private createActionButtons(): void {
    this.actionButtons.forEach((button) => button.destroy());
    this.actionButtons = [
      new UIButton(this, {
        x: 396,
        y: this.scale.height - 56,
        label: 'Save',
        width: 112,
        size: 'small',
        onClick: () => this.saveEditingProfile(),
      }),
      new UIButton(this, {
        x: 516,
        y: this.scale.height - 56,
        label: 'Copy',
        width: 112,
        size: 'small',
        onClick: () => this.copySelectedProfile(),
      }),
      new UIButton(this, {
        x: 636,
        y: this.scale.height - 56,
        label: 'Delete',
        width: 112,
        size: 'small',
        onClick: () => this.deleteSelectedProfile(),
      }),
      new UIButton(this, {
        x: 756,
        y: this.scale.height - 56,
        label: 'Export',
        width: 112,
        size: 'small',
        onClick: () => this.exportSelectedProfile(),
      }),
      new UIButton(this, {
        x: 876,
        y: this.scale.height - 56,
        label: 'Import',
        width: 112,
        size: 'small',
        onClick: () => this.importProfile(),
      }),
      new UIButton(this, {
        x: 996,
        y: this.scale.height - 56,
        label: 'Reset',
        width: 112,
        size: 'small',
        onClick: () => this.loadSelectedProfile(),
      }),
    ];
  }

  private loadSelectedProfile(): void {
    this.editingProfile = StrategyProfileRepository.getSelectedProfile();
    this.refreshProfileButtons();
    this.rebuildSliders();
    this.refreshProfileDetails();
  }

  private rebuildSliders(): void {
    this.sliderControls.forEach((control) => control.container.destroy(true));
    this.sliderControls = [];

    SLIDER_BINDINGS.forEach((binding, index) => {
      const column = index < 8 ? 0 : 1;
      const row = column === 0 ? index : index - 8;
      const x = 352 + column * 300;
      const y = 128 + row * 44;
      this.sliderControls.push(this.createSlider(binding, x, y));
    });
  }

  private createSlider(binding: SliderBinding, x: number, y: number): SliderControl {
    const container = this.add.container(x, y);
    const label = this.add.text(0, 0, binding.label, {
      color: UITheme.textColor,
      fontSize: '12px',
      fontStyle: 'bold',
    });
    const valueText = this.add.text(208, 0, '', {
      color: UITheme.mutedTextColor,
      fontSize: '12px',
      align: 'right',
      fixedWidth: 36,
    });
    const track = this.add.graphics();
    const knob = this.add.graphics();
    const hitArea = this.add.rectangle(92, 8, 184, 28, 0xffffff, 0.001);

    label.setOrigin(0, 0.5);
    valueText.setOrigin(0, 0.5);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.updateSliderFromPointer(binding, pointer, x));
    hitArea.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.updateSliderFromPointer(binding, pointer, x);
      }
    });
    container.add([label, track, knob, valueText, hitArea]);

    const control = { binding, container, track, knob, valueText };
    this.renderSlider(control);
    return control;
  }

  private updateSliderFromPointer(binding: SliderBinding, pointer: Phaser.Input.Pointer, sliderX: number): void {
    if (!this.editingProfile) {
      return;
    }

    const localX = Math.max(0, Math.min(180, pointer.x - sliderX - 92));
    const value = Math.round((localX / 180) * 100);
    this.setProfileWeight(binding, value);
    this.sliderControls
      .filter((control) => control.binding === binding)
      .forEach((control) => this.renderSlider(control));
    this.refreshProfileDetails({ keepStatus: true });
  }

  private renderSlider(control: SliderControl): void {
    const value = this.getProfileWeight(control.binding);
    const fillWidth = Math.round((value / 100) * 180);

    control.track.clear();
    control.track.fillStyle(UITheme.colors.panelInner, 0.95);
    control.track.fillRoundedRect(92, 2, 180, 12, 6);
    control.track.fillStyle(UITheme.colors.accentBlue, 0.95);
    control.track.fillRoundedRect(92, 2, fillWidth, 12, 6);
    control.knob.clear();
    control.knob.fillStyle(UITheme.colors.borderBright, 1);
    control.knob.fillCircle(92 + fillWidth, 8, 7);
    control.valueText.setText(value.toString());
  }

  private saveEditingProfile(): void {
    if (!this.editingProfile) {
      return;
    }

    const saved = StrategyProfileRepository.saveProfile(this.editingProfile, true);
    this.setStatus(`Saved ${saved.name}.`);
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private copySelectedProfile(): void {
    const copied = StrategyProfileRepository.copyProfile(StrategyProfileRepository.getSelectedProfile().id);
    this.setStatus(`Copied to ${copied.name}.`);
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private deleteSelectedProfile(): void {
    const selected = StrategyProfileRepository.getSelectedProfile();

    if (!StrategyProfileRepository.deleteProfile(selected.id)) {
      this.setStatus('Built-in profiles cannot be deleted.');
      return;
    }

    this.setStatus(`Deleted ${selected.name}.`);
    this.createProfileButtons();
    this.loadSelectedProfile();
  }

  private exportSelectedProfile(): void {
    const serialized = AutoStrategySerializer.serialize(StrategyProfileRepository.getSelectedProfile());

    if (navigator.clipboard) {
      navigator.clipboard.writeText(serialized).then(
        () => this.setStatus('Strategy JSON copied to clipboard.'),
        () => {
          console.log('Strategy JSON:', serialized);
          this.setStatus('Clipboard failed; JSON logged to console.');
        },
      );
      return;
    }

    console.log('Strategy JSON:', serialized);
    this.setStatus('Strategy JSON logged to console.');
  }

  private importProfile(): void {
    const serialized = window.prompt('Paste Auto Strategy JSON');

    if (!serialized) {
      return;
    }

    try {
      const imported = StrategyProfileRepository.importProfile(
        AutoStrategySerializer.deserialize(serialized),
        true,
      );
      this.setStatus(`Imported ${imported.name}.`);
      this.createProfileButtons();
      this.loadSelectedProfile();
    } catch (error) {
      console.warn('Failed to import strategy profile:', error);
      this.setStatus('Import failed: invalid strategy JSON.');
    }
  }

  private refreshProfileButtons(): void {
    const selectedId = StrategyProfileRepository.getSelectedProfile().id;

    this.profileButtons.forEach(({ profileId, button }) => {
      button.setSelected(profileId === selectedId);
    });
  }

  private refreshProfileDetails(options: { keepStatus?: boolean } = {}): void {
    const profile = this.editingProfile ?? StrategyProfileRepository.getSelectedProfile();
    const readonlyLabel = StrategyProfileRepository.isReadonlyProfile(profile.id)
      ? ' built-in'
      : ' custom';

    this.activeText?.setText(`Active profile: ${profile.name} (${profile.id},${readonlyLabel})`);
    this.detailText?.setText([
      this.formatSummary(profile),
      '',
      AutoStrategySerializer.serialize(profile),
    ].join('\n'));

    if (!options.keepStatus) {
      this.setStatus(StrategyProfileRepository.isReadonlyProfile(profile.id)
        ? 'Editing a built-in profile will save as a custom copy.'
        : 'Editing a custom profile will overwrite it when saved.');
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
      `Movement: survival ${profile.movement.survivalBias}, farm ${profile.movement.farmBias}, treasure ${profile.movement.treasureBias}, boss ${profile.movement.bossBias}, risk ${profile.movement.riskTolerance}`,
      `Upgrade: evolution ${profile.upgrade.evolutionPriority}, main ${profile.upgrade.mainWeaponPriority}, survival ${profile.upgrade.survivalPriority}, damage ${profile.upgrade.damagePriority}`,
      `Treasure: risk ${profile.treasure.openRiskTolerance}, evolution chest ${profile.treasure.evolutionChestPriority}, route ${profile.treasure.routeDeviationTolerance}`,
      `Relic: synergy ${profile.relic.synergyPriority}, survival ${profile.relic.survivalRelicPriority}, damage ${profile.relic.damageRelicPriority}, economy ${profile.relic.economyRelicPriority}`,
    ].join('\n');
  }
}
