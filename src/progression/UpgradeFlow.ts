import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
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
      return this.endlessRewardManager.applyReward(upgrade.id, 'level');
    }

    this.params.runState.recordLevelUpUpgrade(upgrade.id);

    return this.applyUpgrade(upgrade, `level:${upgrade.id}`);
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
      if (this.params.runState.endlessStarted) {
        const reward = this.selectRandomEndlessReward();

        if (reward && this.endlessRewardManager.applyReward(reward.id, 'chest')) {
          console.log('Treasure chest endless reward:', reward.id);
          return {
            type: 'upgrade',
            upgradeId: reward.id,
          };
        }
      }

      console.warn('Treasure chest opened, but no upgrade options were available');
      this.recordInvalidUpgrade('chest:no_available_upgrade');
      return { type: 'none' };
    }

    const upgrade = options[Math.floor(Math.random() * options.length)];

    if (!this.applyUpgrade(upgrade, `chest:${upgrade.id}`)) {
      console.warn(`Treasure chest selected invalid upgrade: ${upgrade.id}`);
      return { type: 'none' };
    }

    this.params.runState.recordChestUpgrade(upgrade.id);
    console.log('Treasure chest upgrade:', upgrade.id);
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
    this.params.onUpgradeApplied?.();

    const evolution = `${evolutionResult.baseWeaponId}->${evolutionResult.evolvedWeaponId}`;
    console.log(`Treasure chest evolution: ${evolution}`);

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
}
