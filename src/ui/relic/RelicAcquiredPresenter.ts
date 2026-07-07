import Phaser from 'phaser';

import { I18n } from '../../i18n/I18n';
import type { TreasureOpenedResult } from '../../treasure/TreasureRewardCoordinator';
import { CenterMessageController } from '../CenterMessageController';

export class RelicAcquiredPresenter {
  constructor(
    private readonly uiSceneProvider: () => Phaser.Scene | undefined,
    private readonly centerMessageController: CenterMessageController,
  ) {}

  show(relicAwarded: NonNullable<TreasureOpenedResult['relicAwarded']>): void {
    this.uiSceneProvider()?.events.emit('ShowRelicAcquired', {
      id: relicAwarded.id,
      name: relicAwarded.name,
      description: relicAwarded.description,
      rarity: relicAwarded.rarity,
      iconKey: relicAwarded.iconKey,
    });
    this.centerMessageController.show(
      I18n.t('result.relicAcquired', { name: relicAwarded.name }),
    );
  }
}
