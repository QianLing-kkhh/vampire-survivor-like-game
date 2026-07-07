import Phaser from 'phaser';

import { StatsBuildSnapshot } from '../stats/StatsBuildSnapshot';

export interface ResultScenePresentationData {
  resultData: Record<string, unknown>;
  unlockMessages: string[];
  statsBuildSnapshot: StatsBuildSnapshot;
}

export class ResultScenePresenter {
  constructor(private readonly scene: Phaser.Scene) {}

  show(data: ResultScenePresentationData, cleanup: () => void): void {
    cleanup();
    this.scene.scene.stop('UIScene');
    this.scene.scene.start('ResultScene', {
      ...data.resultData,
      unlockMessages: data.unlockMessages,
      statsBuildSnapshot: data.statsBuildSnapshot,
    });
  }
}
