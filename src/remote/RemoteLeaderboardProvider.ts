import type { LeaderboardKey } from '../leaderboard/LeaderboardKey';
import type { LeaderboardRecord } from '../leaderboard/LeaderboardRecord';

import type { RemoteProvider } from './RemoteProvider';
import type { RemoteProviderResult } from './RemoteProviderResult';

export interface RemoteLeaderboardProvider extends RemoteProvider {
  submitRecord(record: LeaderboardRecord): Promise<RemoteProviderResult<void>>;
  fetchLeaderboard(
    key: LeaderboardKey,
  ): Promise<RemoteProviderResult<LeaderboardRecord[]>>;
}
