import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { GameEventBus } from '../events/GameEventBus';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { RunState } from '../run/RunState';
import { PassiveManager } from '../passive/PassiveManager';
import { WeaponManager } from '../weapon/WeaponManager';

import { UpgradeApplier } from './UpgradeApplier';
import { UpgradeOption } from './UpgradeOption';
import { UpgradeSelectionContext, UpgradeSelector } from './UpgradeSelector';

export type UpgradeOptionWithPreview = UpgradeOption & {
  preview?: string;
};

export interface TreasureRewardResult {
  type: 'upgrade' | 'evolution' | 'none';
  upgradeId?: string;
  evolution?: string;
}

export interface UpgradeFlowParams {
  upgradeSelector: UpgradeSelector;
  upgradeApplier: UpgradeApplier;
  autoUpgradeSelector: AutoUpgradeSelector;
  evolutionManager: EvolutionManager;
  weaponManager: WeaponManager;
  passiveManager: PassiveManager;
  runState: RunState;
  gameEventBus?: GameEventBus;
  getRunId?: () => string | undefined;
  getUpgradeSelectionContext(): UpgradeSelectionContext;
  getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext;
  getGameTimeSeconds(): number;
  onUpgradeApplied?(): void;
}

export class UpgradeFlow {
  readonly invalidUpgradeReasons: string[] = [];
  private readonly endlessRewardManager: EndlessRewardManager;

  constructor(private readonly params: UpgradeFlowParams) {
    this.endlessRewardManager = new EndlessRewardManager({
      runState: params.runState,
      upgradeApplier: params.upgradeApplier,
      weaponManager: params.weaponManager,
      getGameTimeSeconds: params.getGameTimeSeconds,
    });
  }

  getLevelUpOptions(count = 3): UpgradeOptionWithPreview[] {
    const options = this.params.upgradeSelector
      .selectOptions(count, this.params.getUpgradeSelectionContext());

    if (options.length > 0 || !this.params.runState.endlessStarted) {
      return options.map((option) => this.withPreview(option));
    }

    return this.endlessRewardManager
      .getRewardOptions()
      .map((option) => this.withPreview(option));
  }

  hasAvailableLevelUpOptions(): boolean {
    const hasNormalOptions = this.params.upgradeSelector
      .selectOptions(1, this.params.getUpgradeSelectionContext())
      .length > 0;

    return hasNormalOptions
      || (this.params.runState.endlessStarted
        && this.endlessRewardManager.getRewardOptions().length > 0);
  }

  chooseAutoUpgrade(options: readonly UpgradeOption[]): UpgradeOption | null {
    return this.params.autoUpgradeSelector.select(
      options,
      this.params.getAutoUpgradeSelectionContext(),
    ) ?? null;
  }

  applyLevelUpUpgrade(upgrade: UpgradeOption): boolean {
    if (this.endlessRewardManager.isRewardId(upgrade.id)) {
      const applied = this.endlessRewardManager.applyReward(upgrade.id, 'level');

      if (applied) {
        this.emitEndlessRewardChosen(upgrade.id, 'level');
        this.emitUpgradeApplied(upgrade.id, 'endlessReward');
      }

      return applied;
    }

    this.params.runState.recordLevelUpUpgrade(upgrade.id);

    const applied = this.applyUpgrade(upgrade, `level:${upgrade.id}`);

    if (applied) {
      this.emitUpgradeApplied(upgrade.id, 'levelUp');
    }

    return applied;
  }

  applyTreasureReward(): TreasureRewardResult {
    const firstEvolution = this.tryEvolveFromTreasure();

    if (firstEvolution) {
      return {
        type: 'evolution',
        evolution: firstEvolution,
      };
    }

    const options = this.params.upgradeSelector.selectOptions(
      3,
      this.params.getUpgradeSelectionContext(),
    );

    if (options.length === 0) {
      const fallbackRewardId = this.applyTreasureFallbackReward();

      if (fallbackRewardId) {
        return {
          type: 'upgrade',
          upgradeId: fallbackRewardId,
        };
      }

      console.warn('Treasure chest opened, but no upgrade options were available');
      this.recordInvalidUpgrade('chest:no_available_upgrade');
      return { type: 'none' };
    }

    const upgrade = options[Math.floor(Math.random() * options.length)];

    if (!this.applyUpgrade(upgrade, `chest:${upgrade.id}`)) {
      console.warn(`Treasure chest selected invalid upgrade: ${upgrade.id}`);
      const fallbackRewardId = this.applyTreasureFallbackReward();

      if (fallbackRewardId) {
        return {
          type: 'upgrade',
          upgradeId: fallbackRewardId,
        };
      }

      return { type: 'none' };
    }

    this.params.runState.recordChestUpgrade(upgrade.id);
    this.emitUpgradeApplied(upgrade.id, 'treasure');
    const secondEvolution = this.tryEvolveFromTreasure();

    if (secondEvolution) {
      return {
        type: 'evolution',
        upgradeId: upgrade.id,
        evolution: secondEvolution,
      };
    }

    return {
      type: 'upgrade',
      upgradeId: upgrade.id,
    };
  }

  tryEvolveFromTreasure(): string | null {
    const evolutionResult = this.params.evolutionManager.tryEvolve({
      weaponManager: this.params.weaponManager,
      getPassiveLevel: (passiveId) => this.params.passiveManager.getLevel(passiveId),
    });

    if (!evolutionResult) {
      return null;
    }

    this.params.runState.recordEvolution(
      evolutionResult.baseWeaponId,
      evolutionResult.evolvedWeaponId,
      this.params.getGameTimeSeconds(),
    );
    this.emitWeaponEvolved(
      evolutionResult.baseWeaponId,
      evolutionResult.evolvedWeaponId,
    );
    this.params.onUpgradeApplied?.();

    const evolution = `${evolutionResult.baseWeaponId}->${evolutionResult.evolvedWeaponId}`;

    return evolution;
  }

  private applyUpgrade(upgrade: UpgradeOption, reason: string): boolean {
    const applied = this.params.upgradeApplier.apply(upgrade);

    if (!applied) {
      this.recordInvalidUpgrade(reason);
      return false;
    }

    this.params.onUpgradeApplied?.();
    return true;
  }

  private recordInvalidUpgrade(reason: string): void {
    this.invalidUpgradeReasons.push(reason);
    this.params.runState.recordInvalidUpgrade();
  }

  private withPreview(option: UpgradeOption): UpgradeOptionWithPreview {
    return {
      ...option,
      preview: this.endlessRewardManager.isRewardId(option.id)
        ? option.description
        : this.params.upgradeApplier.getUpgradePreview(option),
    };
  }

  private selectRandomEndlessReward(): UpgradeOption | undefined {
    const rewards = this.endlessRewardManager.getRewardOptions();

    if (rewards.length === 0) {
      return undefined;
    }

    return rewards[Math.floor(Math.random() * rewards.length)];
  }

  private applyTreasureFallbackReward(): string | null {
    const reward = this.selectRandomEndlessReward();
    const rewardId = this.endlessRewardManager.applyChestFallbackReward(reward?.id);

    if (!rewardId) {
      this.recordInvalidUpgrade('chest:no_available_fallback_reward');
      return null;
    }

    this.emitEndlessRewardChosen(rewardId, 'chest');
    this.emitUpgradeApplied(rewardId, 'endlessReward');
    this.params.onUpgradeApplied?.();
    return rewardId;
  }

  private emitUpgradeApplied(
    upgradeId: string,
    source: 'levelUp' | 'treasure' | 'endlessReward',
  ): void {
    const gameTimeSeconds = this.params.getGameTimeSeconds();

    this.params.gameEventBus?.emit('upgrade.applied', {
      upgradeId,
      source,
      gameTimeSeconds,
    }, {
      gameTimeSeconds,
      runId: this.params.getRunId?.(),
    });
  }

  private emitEndlessRewardChosen(
    rewardId: string,
    source: 'level' | 'chest',
  ): void {
    const gameTimeSeconds = this.params.getGameTimeSeconds();

    this.params.gameEventBus?.emit('endless.rewardChosen', {
      rewardId,
      source,
      gameTimeSeconds,
    }, {
      gameTimeSeconds,
      runId: this.params.getRunId?.(),
    });
  }

  private emitWeaponEvolved(baseWeaponId: string, evolvedWeaponId: string): void {
    const gameTimeSeconds = this.params.getGameTimeSeconds();

    this.params.gameEventBus?.emit('weapon.evolved', {
      baseWeaponId,
      evolvedWeaponId,
      gameTimeSeconds,
    }, {
      gameTimeSeconds,
      runId: this.params.getRunId?.(),
    });
  }
}
