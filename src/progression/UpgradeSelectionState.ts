import type { UpgradeOption } from './UpgradeOption';

export type UpgradeSelectionSource = 'levelUp' | 'treasure';

export class UpgradeSelectionState {
  active = false;
  source?: UpgradeSelectionSource;
  options: UpgradeOption[] = [];

  open(source: UpgradeSelectionSource, options: UpgradeOption[]): void {
    this.active = true;
    this.source = source;
    this.options = options;
  }

  clear(): void {
    this.active = false;
    this.source = undefined;
    this.options = [];
  }
}
