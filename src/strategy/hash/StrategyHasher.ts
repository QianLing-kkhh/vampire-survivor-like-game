import { hashStableJson } from '../../version/ContentHash';
import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';

export class StrategyHasher {
  static hash(profile: AutoStrategyProfile): string {
    return hashStableJson(StrategyProfileValidator.normalizeForHash(profile));
  }
}
