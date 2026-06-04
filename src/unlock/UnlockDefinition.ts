import { UnlockCondition } from './UnlockCondition';
import { UnlockableType } from './UnlockableType';

export interface UnlockDefinition {
  id: string;
  type: UnlockableType;
  targetId: string;
  nameKey?: string;
  descriptionKey?: string;
  defaultUnlocked?: boolean;
  hidden?: boolean;
  conditions?: UnlockCondition[];
}
