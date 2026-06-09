import type { AutoStrategyProfile } from './AutoStrategyProfile';

export function cloneAutoStrategyProfile(profile: AutoStrategyProfile): AutoStrategyProfile {
  return JSON.parse(JSON.stringify(profile)) as AutoStrategyProfile;
}

