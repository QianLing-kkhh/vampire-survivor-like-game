import {
  AutoUpgradeSelectionContext,
  AutoUpgradeSelector,
} from '../auto/AutoUpgradeSelector';
import { EndlessRewardManager } from '../endless/EndlessRewardManager';
import { GameEventBus } from '../events/GameEventBus';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { RunState } from '../run/RunState';
import { PassiveManager } from '../passive/PassiveManager';
import { RandomSource } from '../random/RandomSource';
import { getUpgradeDisplayName, getWeaponDisplayName } from '../i18n/ContentText';
import { WeaponManager } from '../weapon/WeaponManager';

import { UpgradeApplier } from './UpgradeApplier';
import { UpgradeOption } from './UpgradeOption';
import { UpgradeSelectionContext, UpgradeSelector } from './UpgradeSelector';

export type UpgradeOptionWithPreview = UpgradeOption & {
  preview?: string;
};

export interface TreasureAppliedUpgradeResult {
  kind: 'levelUp' | 'acquired' | 'stat' | 'endlessReward';
  targetType: 'weapon' | 'passive' | 'stat' | 'endlessReward' | 'unknown';
  targetId?: string;
  targetName: string;
  beforeLevel?: number;
  afterLevel?: number;
  maxLevel?: number;
  isMax?: boolean;
  iconFallback?: string;
}

export interface TreasureEvolutionDetail {
  baseWeaponId: string;
  evolvedWeaponId: string;
  baseName: string;
  evolvedName: string;
  iconFallback?: string;
}

export interface TreasureRewardResult {
  type: 'upgrade' | 'evolution' | 'pending' | 'none';
  upgradeId?: string;
  evolution?: string;
  options?: UpgradeOptionWithPreview[];
  appliedUpgrade?: TreasureAppliedUpgradeResult;
  evolutionDetail?: TreasureEvolutionDetail;
}

export interface UpgradeFlowParams {
  upgradeSelector: UpgradeSelector;
  upgradeApplier: UpgradeApplier;
  autoUpgradeSelector: AutoUpgradeSelector;
  evolutionManager: EvolutionManager;
  weaponManager: WeaponManager;
  passiveManager: PassiveManager;
  rewardRandom: RandomSource;
  runState: RunState;
  gameEventBus?: GameEventBus;
  getRunId?: () => string | undefined;
  getUpgradeSelectionContext(): UpgradeSelectionContext;
  getAutoUpgradeSelectionContext(): AutoUpgradeSelectionContext;
  getGameTimeSeconds(): number;
  applyTemporaryPickupRangeMultiplier?(multiplier: number, durationMs: number, source?: string): void;
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
      applyTemporaryPickupRangeMultiplier: params.applyTemporaryPickupRangeMultiplier,
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

  getEndlessRewardManager(): EndlessRewardManager {
    return this.endlessRewardManager;
  }

  chooseAutoUpgrade(options: readonly UpgradeOption[]): UpgradeOption | null {
    return this.params.autoUpgradeSelector.select(
      options,
      this.getAutoSelectionContext('levelUp'),
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

  applyTreasureReward(autoSelect = true): TreasureRewardResult {
    const firstEvolution = this.tryEvolveFromTreasure();

    if (firstEvolution) {
      return {
        type: 'evolution',
        evolution: this.formatEvolutionId(firstEvolution),
        evolutionDetail: firstEvolution,
      };
    }

    const options = this.getTreasureRewardOptions();

    if (options.length === 0) {
      console.warn('Treasure chest opened, but no upgrade options were available');
      this.recordInvalidUpgrade('chest:no_available_upgrade');
      return { type: 'none' };
    }

    if (!autoSelect) {
      return {
        type: 'pending',
        options,
      };
    }

    const upgrade = this.chooseTreasureReward(options);

    if (!upgrade) {
      return { type: 'none' };
    }

    return this.applyTreasureSelectedReward(upgrade);
  }

  applyTreasureSelectedReward(upgrade: UpgradeOption): TreasureRewardResult {
    if (this.endlessRewardManager.isRewardId(upgrade.id)) {
      const applied = this.endlessRewardManager.applyReward(upgrade.id, 'chest');

      if (!applied) {
        this.recordInvalidUpgrade(`chest:${upgrade.id}`);
        return { type: 'none' };
      }

      this.emitEndlessRewardChosen(upgrade.id, 'chest');
      this.emitUpgradeApplied(upgrade.id, 'endlessReward');
      this.params.onUpgradeApplied?.();
      return {
        type: 'upgrade',
        upgradeId: upgrade.id,
        appliedUpgrade: {
          kind: 'endlessReward',
          targetType: 'endlessReward',
          targetId: upgrade.id,
          targetName: getUpgradeDisplayName(upgrade),
          iconFallback: this.getInitials(upgrade.id),
        },
      };
    }

    const upgradeSnapshot = this.createTreasureUpgradeSnapshot(upgrade);

    if (!this.applyUpgrade(upgrade, `chest:${upgrade.id}`)) {
      console.warn(`Treasure chest selected invalid upgrade: ${upgrade.id}`);
      return { type: 'none' };
    }

    this.params.runState.recordChestUpgrade(upgrade.id);
    this.emitUpgradeApplied(upgrade.id, 'treasure');
    const secondEvolution = this.tryEvolveFromTreasure();
    const appliedUpgrade = this.finalizeTreasureUpgradeResult(upgrade, upgradeSnapshot);

    if (secondEvolution) {
      return {
        type: 'evolution',
        upgradeId: upgrade.id,
        evolution: this.formatEvolutionId(secondEvolution),
        appliedUpgrade,
        evolutionDetail: secondEvolution,
      };
    }

    return {
      type: 'upgrade',
      upgradeId: upgrade.id,
      appliedUpgrade,
    };
  }

  tryEvolveFromTreasure(): TreasureEvolutionDetail | null {
    const evolutionContext = {
      weaponManager: this.params.weaponManager,
      getPassiveLevel: (passiveId: string) => this.params.passiveManager.getLevel(passiveId),
    };
    const selectedRule = this.params.autoUpgradeSelector.selectEvolutionRule(
      this.params.evolutionManager.getEligibleEvolutionRules(evolutionContext),
      this.getAutoSelectionContext('treasure'),
    );
    const evolutionResult = selectedRule
      ? this.params.evolutionManager.tryEvolveRule(selectedRule, evolutionContext)
      : undefined;

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

    return {
      baseWeaponId: evolutionResult.baseWeaponId,
      evolvedWeaponId: evolutionResult.evolvedWeaponId,
      baseName: getWeaponDisplayName(evolutionResult.baseWeaponId),
      evolvedName: getWeaponDisplayName(evolutionResult.evolvedWeaponId),
      iconFallback: this.getInitials(evolutionResult.baseWeaponId),
    };
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

  private getTreasureRewardOptions(): UpgradeOptionWithPreview[] {
    const options = this.params.upgradeSelector.selectOptions(
      3,
      this.params.getUpgradeSelectionContext(),
    );

    if (options.length > 0) {
      return options.map((option) => this.withPreview(option));
    }

    return this.endlessRewardManager
      .getChestFallbackRewardOptions()
      .map((option) => this.withPreview(option));
  }

  private chooseTreasureReward(options: readonly UpgradeOption[]): UpgradeOption | undefined {
    return this.params.autoUpgradeSelector.select(
      options,
      this.getAutoSelectionContext('treasure'),
    );
  }

  private getAutoSelectionContext(
    source: 'levelUp' | 'treasure',
  ): AutoUpgradeSelectionContext {
    return {
      ...this.params.getAutoUpgradeSelectionContext(),
      source,
      endless: this.endlessRewardManager.getAutoRewardContext(),
    };
  }

  private createTreasureUpgradeSnapshot(
    upgrade: UpgradeOption,
  ): TreasureAppliedUpgradeResult {
    const newWeaponId = this.getNewWeaponIdForUpgrade(upgrade.id);

    if (newWeaponId) {
      return {
        kind: 'acquired',
        targetType: 'weapon',
        targetId: newWeaponId,
        targetName: getWeaponDisplayName(newWeaponId, getUpgradeDisplayName(upgrade)),
        beforeLevel: 0,
        afterLevel: 1,
        maxLevel: this.params.weaponManager.getWeaponUpgradeLimit(newWeaponId),
        isMax: false,
        iconFallback: this.getInitials(newWeaponId),
      };
    }

    const weaponId = this.params.weaponManager.getBaseWeaponIdForUpgrade(upgrade.id);

    if (weaponId) {
      const targetWeaponId = this.params.weaponManager.getActualUpgradeTargetWeaponId(upgrade.id)
        ?? weaponId;

      return {
        kind: 'levelUp',
        targetType: 'weapon',
        targetId: targetWeaponId,
        targetName: getWeaponDisplayName(targetWeaponId),
        beforeLevel: this.params.weaponManager.getWeaponUpgradeTotal(weaponId),
        maxLevel: this.params.weaponManager.getWeaponUpgradeLimit(weaponId),
        iconFallback: this.getInitials(targetWeaponId),
      };
    }

    if (this.params.passiveManager.isPassive(upgrade.id)) {
      return {
        kind: 'levelUp',
        targetType: 'passive',
        targetId: upgrade.id,
        targetName: this.params.passiveManager.getPassiveName(upgrade.id),
        beforeLevel: this.params.passiveManager.getPassiveLevel(upgrade.id),
        maxLevel: this.params.passiveManager.getPassiveMaxLevel(upgrade.id),
        iconFallback: this.getInitials(upgrade.id),
      };
    }

    return {
      kind: 'stat',
      targetType: 'stat',
      targetId: upgrade.id,
      targetName: getUpgradeDisplayName(upgrade),
      iconFallback: this.getInitials(upgrade.id),
    };
  }

  private finalizeTreasureUpgradeResult(
    upgrade: UpgradeOption,
    snapshot: TreasureAppliedUpgradeResult,
  ): TreasureAppliedUpgradeResult {
    if (snapshot.kind === 'acquired' || snapshot.kind === 'stat') {
      return snapshot;
    }

    if (snapshot.targetType === 'weapon' && snapshot.targetId) {
      const baseWeaponId = this.params.weaponManager.getBaseWeaponId(snapshot.targetId);
      const afterLevel = this.params.weaponManager.getWeaponUpgradeTotal(baseWeaponId);
      const maxLevel = this.params.weaponManager.getWeaponUpgradeLimit(baseWeaponId);

      return {
        ...snapshot,
        afterLevel,
        maxLevel,
        isMax: afterLevel >= maxLevel,
      };
    }

    if (snapshot.targetType === 'passive' && snapshot.targetId) {
      const afterLevel = this.params.passiveManager.getPassiveLevel(snapshot.targetId);
      const maxLevel = this.params.passiveManager.getPassiveMaxLevel(snapshot.targetId);

      return {
        ...snapshot,
        afterLevel,
        maxLevel,
        isMax: afterLevel >= maxLevel,
      };
    }

    return {
      ...snapshot,
      targetName: snapshot.targetName || getUpgradeDisplayName(upgrade),
    };
  }

  private getNewWeaponIdForUpgrade(upgradeId: string): string | undefined {
    switch (upgradeId) {
      case 'add_garlic':
        return 'garlic';
      case 'add_bible':
        return 'bible';
      case 'add_magic_wand':
        return 'magic_wand';
      case 'add_axe':
        return 'axe';
      default:
        return undefined;
    }
  }

  private formatEvolutionId(evolution: TreasureEvolutionDetail): string {
    return `${evolution.baseWeaponId}->${evolution.evolvedWeaponId}`;
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
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
