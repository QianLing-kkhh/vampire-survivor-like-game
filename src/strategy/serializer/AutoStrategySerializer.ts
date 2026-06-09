import type { AutoStrategyProfile } from '../profile/AutoStrategyProfile';
import { StrategyProfileValidator } from '../profile/StrategyProfileValidator';

export class AutoStrategySerializer {
  static serialize(profile: AutoStrategyProfile): string {
    return JSON.stringify(StrategyProfileValidator.normalize(profile), null, 2);
  }

  static deserialize(serialized: string): AutoStrategyProfile {
    return StrategyProfileValidator.normalize(JSON.parse(serialized));
  }
}
