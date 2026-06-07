import { LocalContentPackProvider } from '../content/providers/LocalContentPackProvider';
import { CustomStageStorage } from '../custom/CustomStageStorage';
import { EndlessLeaderboard } from '../endless/EndlessLeaderboard';
import { PlaytestLogBuffer } from '../logging/PlaytestLogBuffer';
import { ReplayStorage } from '../replay/ReplayStorage';
import { SaveManager } from '../save/SaveManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { UnlockManager } from '../unlock/UnlockManager';

export class DeveloperLocalResetService {
  static resetAllLocalData(): void {
    UnlockManager.clearTemporaryUnlocks();
    PlaytestLogBuffer.clear();
    new ReplayStorage().clear();
    new CustomStageStorage().clear();
    LocalContentPackProvider.clearDefaultStorage();
    PlaytestSettings.clearLegacyStorage();
    EndlessLeaderboard.clearLegacyStorage();
    SaveManager.reset();
  }
}
