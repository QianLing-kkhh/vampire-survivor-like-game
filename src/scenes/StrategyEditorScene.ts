import Phaser from 'phaser';

import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import { AutoStrategySerializer } from '../strategy/serializer/AutoStrategySerializer';
import { StrategyProfileRepository } from '../strategy/profile/StrategyProfileRepository';
import { UIButton } from '../ui/components/UIButton';
import { UITheme } from '../ui/UITheme';

export class StrategyEditorScene extends Phaser.Scene {
  private profileButtons: Array<{ profileId: string; button: UIButton }> = [];
  private detailText?: Phaser.GameObjects.Text;
  private activeText?: Phaser.GameObjects.Text;

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
    this.detailText = this.add.text(360, 72, '', {
      color: UITheme.mutedTextColor,
      fontSize: '12px',
      fontFamily: 'monospace',
      wordWrap: { width: Math.max(320, this.scale.width - 392) },
    });

    this.createProfileButtons();
    this.refreshProfileDetails();

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
    const startY = 122;
    const gap = 42;

    this.profileButtons.forEach(({ button }) => button.container.destroy());
    this.profileButtons = profiles.map((profile, index) => ({
      profileId: profile.id,
      button: new UIButton(this, {
        x: 32 + 140,
        y: startY + index * gap,
        label: profile.name,
        width: 280,
        size: 'small',
        selected: profile.id === StrategyProfileRepository.getSelectedProfile().id,
        onClick: () => {
          StrategyProfileRepository.selectProfile(profile.id);
          this.refreshProfileButtons();
          this.refreshProfileDetails();
        },
      }),
    }));
  }

  private refreshProfileButtons(): void {
    const selectedId = StrategyProfileRepository.getSelectedProfile().id;

    this.profileButtons.forEach(({ profileId, button }) => {
      button.setSelected(profileId === selectedId);
    });
  }

  private refreshProfileDetails(): void {
    const profile = StrategyProfileRepository.getSelectedProfile();

    this.activeText?.setText(`Active profile: ${profile.name}`);
    this.detailText?.setText([
      this.formatSummary(profile),
      '',
      AutoStrategySerializer.serialize(profile),
    ].join('\n'));
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
