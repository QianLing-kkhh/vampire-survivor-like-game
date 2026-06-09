import Phaser from 'phaser';

import { AutoStrategySerializer } from '../strategy/serializer/AutoStrategySerializer';
import { StrategyProfileRepository } from '../strategy/profile/StrategyProfileRepository';
import { UITheme } from '../ui/UITheme';

export class StrategyEditorScene extends Phaser.Scene {
  constructor() {
    super('StrategyEditorScene');
  }

  create(): void {
    const profile = StrategyProfileRepository.getSelectedProfile();
    const serialized = AutoStrategySerializer.serialize(profile);

    this.add.rectangle(0, 0, this.scale.width, this.scale.height, UITheme.panelBgColor)
      .setOrigin(0);
    this.add.text(32, 28, 'Auto Strategy', {
      color: UITheme.textColor,
      fontSize: '28px',
      fontStyle: 'bold',
    });
    this.add.text(32, 72, `Active profile: ${profile.name}`, {
      color: UITheme.textColor,
      fontSize: '18px',
    });
    this.add.text(32, 112, serialized, {
      color: UITheme.mutedTextColor,
      fontSize: '12px',
      fontFamily: 'monospace',
      wordWrap: { width: Math.max(320, this.scale.width - 64) },
    });
    const back = this.add.text(32, this.scale.height - 56, 'Back', {
      color: UITheme.successTextColor,
      fontSize: '20px',
      fontStyle: 'bold',
    });

    back.setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      this.scene.start('TitleScene');
    });
  }
}
