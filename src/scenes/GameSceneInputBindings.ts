import Phaser from 'phaser';

type EventHandler = (...args: any[]) => void;

export interface GameSceneInputBindingHandlers {
  handleUpgradeSelected: EventHandler;
  handleEscapePressed: EventHandler;
  resumeFromPauseMenu: EventHandler;
  restartFromPauseMenu: EventHandler;
  backToTitleFromPauseMenu: EventHandler;
  openDeveloperSceneFromPauseMenu: EventHandler;
  handleLiveStrategyPatch: EventHandler;
  handleStrategyTacticsPanelExpandedChanged: EventHandler;
  handleStrategyTacticsPanelPauseWhenOpenChanged: EventHandler;
  showEnemyDamageFloatingText: EventHandler;
  toggleDebugPanel: EventHandler;
  handleResize: EventHandler;
  cleanup: EventHandler;
}

export class GameSceneInputBindings {
  bind(
    scene: Phaser.Scene,
    uiScene: Phaser.Scene,
    handlers: GameSceneInputBindingHandlers,
    owner: object,
  ): void {
    uiScene.events.on('UpgradeSelected', handlers.handleUpgradeSelected, owner);
    uiScene.events.on('HudPausePressed', handlers.handleEscapePressed, owner);
    uiScene.events.on('PauseResume', handlers.resumeFromPauseMenu, owner);
    uiScene.events.on('PauseRestart', handlers.restartFromPauseMenu, owner);
    uiScene.events.on('PauseBackToTitle', handlers.backToTitleFromPauseMenu, owner);
    uiScene.events.on('PauseOpenDeveloperScene', handlers.openDeveloperSceneFromPauseMenu, owner);
    uiScene.events.on('LiveStrategyPatch', handlers.handleLiveStrategyPatch, owner);
    uiScene.events.on(
      'StrategyTacticsPanelExpandedChanged',
      handlers.handleStrategyTacticsPanelExpandedChanged,
      owner,
    );
    uiScene.events.on(
      'StrategyTacticsPanelPauseWhenOpenChanged',
      handlers.handleStrategyTacticsPanelPauseWhenOpenChanged,
      owner,
    );
    scene.events.on('EnemyDamagedFloatingText', handlers.showEnemyDamageFloatingText, owner);
    scene.input.keyboard?.on('keydown-ESC', handlers.handleEscapePressed, owner);
    scene.input.keyboard?.on('keydown-F3', handlers.toggleDebugPanel, owner);
    scene.scale.on('resize', handlers.handleResize, owner);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, handlers.cleanup, owner);
    scene.events.once(Phaser.Scenes.Events.DESTROY, handlers.cleanup, owner);
  }

  unbind(
    scene: Phaser.Scene,
    uiScene: Phaser.Scene | undefined,
    handlers: GameSceneInputBindingHandlers,
    owner: object,
  ): void {
    uiScene?.events.off('UpgradeSelected', handlers.handleUpgradeSelected, owner);
    uiScene?.events.off('HudPausePressed', handlers.handleEscapePressed, owner);
    uiScene?.events.off('PauseResume', handlers.resumeFromPauseMenu, owner);
    uiScene?.events.off('PauseRestart', handlers.restartFromPauseMenu, owner);
    uiScene?.events.off('PauseBackToTitle', handlers.backToTitleFromPauseMenu, owner);
    uiScene?.events.off('PauseOpenDeveloperScene', handlers.openDeveloperSceneFromPauseMenu, owner);
    uiScene?.events.off('LiveStrategyPatch', handlers.handleLiveStrategyPatch, owner);
    uiScene?.events.off(
      'StrategyTacticsPanelExpandedChanged',
      handlers.handleStrategyTacticsPanelExpandedChanged,
      owner,
    );
    uiScene?.events.off(
      'StrategyTacticsPanelPauseWhenOpenChanged',
      handlers.handleStrategyTacticsPanelPauseWhenOpenChanged,
      owner,
    );
    scene.events.off('EnemyDamagedFloatingText', handlers.showEnemyDamageFloatingText, owner);
    scene.input.keyboard?.off('keydown-ESC', handlers.handleEscapePressed, owner);
    scene.input.keyboard?.off('keydown-F3', handlers.toggleDebugPanel, owner);
    scene.scale.off('resize', handlers.handleResize, owner);
  }
}
