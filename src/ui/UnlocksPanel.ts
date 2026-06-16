import { I18n } from '../i18n/I18n';
import { UnlockDefinition } from '../unlock/UnlockDefinition';
import { UnlockableType } from '../unlock/UnlockableType';
import { UnlockManager } from '../unlock/UnlockManager';

import { RecordsPanel, RecordsPanelRow } from './RecordsPanel';
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
    if (rows.length === 0) {
      panel.setContent(I18n.t('records.unlocks'), [I18n.t('records.empty')]);
      return;
    }

    panel.setRows(I18n.t('records.unlocks'), rows);
  }

  private formatTypeRows(type: UnlockableType): RecordsPanelRow[] {
    const definitions = UnlockManager.listUnlocks(type);

    if (definitions.length === 0) {
      return [];
    }

    return [
      {
        label: this.formatUnlockType(type),
        tone: 'section',
      },
      ...definitions.map((definition) => this.formatUnlock(definition)),
    ];
  }

  private formatUnlock(definition: UnlockDefinition): RecordsPanelRow {
    const unlocked = UnlockManager.isUnlocked(definition.type, definition.targetId);
    const status = unlocked ? I18n.t('records.unlocked') : I18n.t('records.locked');
    const name = definition.hidden && !unlocked
      ? '???'
      : this.translateOrFallback(definition.nameKey, definition.targetId);

    return {
      status,
      label: name,
      value: definition.targetId,
      tone: unlocked ? 'success' : 'muted',
    };
  }

  private formatUnlockType(type: UnlockableType): string {
    switch (type) {
      case 'character':
        return I18n.t('selection.character');
      case 'stage':
        return I18n.t('selection.stage');
      case 'map':
        return I18n.t('selection.map');
      case 'theme':
        return I18n.t('settings.uiStyle');
      case 'cosmetic':
      default:
        return type;
    }
  }

  private translateOrFallback(key: string | undefined, fallback: string): string {
    if (!key) {
      return fallback;
    }

    const value = I18n.t(key);

    return value === key ? fallback : value;
  }
}
