import { I18n } from '../i18n/I18n';
import { UnlockDefinition } from '../unlock/UnlockDefinition';
import { UnlockableType } from '../unlock/UnlockableType';
import { UnlockManager } from '../unlock/UnlockManager';

import { RecordsPanel } from './RecordsPanel';

const MAX_UNLOCK_ROWS = 14;
const UNLOCK_TYPES: UnlockableType[] = [
  'character',
  'stage',
  'map',
  'theme',
  'cosmetic',
];

export class UnlocksPanel {
  render(panel: RecordsPanel): void {
    const rows = UNLOCK_TYPES.flatMap((type) => this.formatTypeRows(type));
    const visibleRows = rows.slice(0, MAX_UNLOCK_ROWS);

    if (rows.length === 0) {
      panel.setContent(I18n.t('records.unlocks'), [I18n.t('records.empty')]);
      return;
    }

    if (rows.length > visibleRows.length) {
      visibleRows.push(`+${rows.length - visibleRows.length} more`);
    }

    panel.setContent(I18n.t('records.unlocks'), visibleRows);
  }

  private formatTypeRows(type: UnlockableType): string[] {
    const definitions = UnlockManager.listUnlocks(type);

    if (definitions.length === 0) {
      return [];
    }

    return [
      `[${type}]`,
      ...definitions.map((definition) => this.formatUnlock(definition)),
    ];
  }

  private formatUnlock(definition: UnlockDefinition): string {
    const unlocked = UnlockManager.isUnlocked(definition.type, definition.targetId);
    const status = unlocked ? I18n.t('records.unlocked') : I18n.t('records.locked');
    const name = definition.hidden && !unlocked
      ? '???'
      : this.translateOrFallback(definition.nameKey, definition.targetId);

    return `${status}  ${name}`;
  }

  private translateOrFallback(key: string | undefined, fallback: string): string {
    if (!key) {
      return fallback;
    }

    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
