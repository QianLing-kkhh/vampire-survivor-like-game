import { UnlockableType } from './UnlockableType';

export interface UnlockReward {
  type: UnlockableType;
  targetId: string;
}
