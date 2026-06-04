import type { ChallengeDefinition } from '../challenge/ChallengeDefinition';

import type { RemoteProvider } from './RemoteProvider';
import type { RemoteProviderResult } from './RemoteProviderResult';

export interface RemoteChallengeProvider extends RemoteProvider {
  fetchDailyChallenge(
    date: string,
  ): Promise<RemoteProviderResult<ChallengeDefinition>>;
}
