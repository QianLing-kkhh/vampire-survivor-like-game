import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import type { EvolutionManager } from '../evolution/EvolutionManager';
import type { GameplayContext } from '../gameplay/GameplayContext';
import { I18n } from '../i18n/I18n';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { RunState } from '../run/RunState';
import type { PlayerFeedbackController } from '../ui/PlayerFeedbackController';

import type { UpgradeApplier } from './UpgradeApplier';
import type { UpgradeFlow } from './UpgradeFlow';
import type { UpgradeOption } from './UpgradeOption';

export interface LevelUpEventHandlerContext {
  scene: Phaser.Scene;
  uiScene: Phaser.Scene;
  gameplayContext?: GameplayContext;
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  upgradeFlow?: UpgradeFlow;
  upgradeApplier?: UpgradeApplier;
  evolutionManager?: EvolutionManager;
  runState: RunState;
  currentLevel: number;
  gameTimeSeconds: number;
  runId: string;
  worldWidth: number;
  worldHeight: number;
  nowMs: number;
  playerFeedbackController: PlayerFeedbackController;
  applyCharacterLevelStats: (level: number) => void;
  emitHUDState: () => void;
  clearUpgradeSelection: () => void;
  openLevelUpSelection: (options: UpgradeOption[]) => void;
  refreshLevelUpPanelAutoSelection: () => void;
}

export class LevelUpEventHandler {
  handle(context: LevelUpEventHandlerContext): void {
    AudioManager.playSfx(context.scene, 'level_up');
    context.applyCharacterLevelStats(context.currentLevel);
    this.applyCharacterLevelUpEffects(context);
    context.emitHUDState();

    const selectedOptions = (context.upgradeFlow?.getLevelUpOptions() ?? [])
      .map((option) => ({
        ...option,
        displayInfo: context.upgradeApplier?.getUpgradeDisplayInfo(
          option,
          context.evolutionManager,
        ),
      }));

    if (selectedOptions.length === 0) {
      this.handleNoAvailableUpgrades(context);
      return;
    }

    context.openLevelUpSelection(selectedOptions);
    context.gameplayContext?.gameEventBus.emit('upgrade.optionsShown', {
      optionIds: selectedOptions.map((option) => option.id),
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
    context.refreshLevelUpPanelAutoSelection();
  }

  private applyCharacterLevelUpEffects(context: LevelUpEventHandlerContext): void {
    const healAmount = context.playerHealth && context.gameplayContext
      ? context.gameplayContext.characterRuntime.applyLevelUpEffect({
        playerHealth: context.playerHealth,
      }).healAmount
      : 0;

    if (healAmount > 0 && context.player) {
      context.playerFeedbackController.showHeal(context.player.getPositionLike(), healAmount);
    }

    if (!context.gameplayContext || !context.player || !context.playerHealth) {
      return;
    }

    context.gameplayContext.characterRuntime.tryTriggerLevelUpPulse({
      scene: context.scene,
      player: context.player,
      playerHealth: context.playerHealth,
      enemies: context.gameplayContext.enemies,
      damageCalculator: context.gameplayContext.damageCalculator,
      worldWidth: context.worldWidth,
      worldHeight: context.worldHeight,
      nowMs: context.nowMs,
      characterId: context.gameplayContext.characterRuntime.getCharacterId(),
      skinId: context.gameplayContext.characterRuntime.getSkinId(),
      showPlayerHeal: (amount) => {
        context.playerFeedbackController.showHeal(
          context.player?.getPositionLike(),
          amount,
        );
      },
    });
  }

  private handleNoAvailableUpgrades(context: LevelUpEventHandlerContext): void {
    context.runState.recordSkippedLevelUp();
    context.gameplayContext?.gameEventBus.emit('upgrade.skipped', {
      reason: 'no_available_upgrade',
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });
    context.clearUpgradeSelection();
    context.uiScene.events.emit('ShowTemporaryMessage', I18n.t('levelUp.noUpgrades'));
  }
}
