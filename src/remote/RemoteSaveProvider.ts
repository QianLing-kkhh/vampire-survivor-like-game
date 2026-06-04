import type { SaveData } from '../save/SaveData';

import type { RemoteProvider } from './RemoteProvider';
import type { RemoteProviderResult } from './RemoteProviderResult';

export interface RemoteSaveProvider extends RemoteProvider {
  uploadSave(save: SaveData): Promise<RemoteProviderResult<void>>;
  downloadSave(): Promise<RemoteProviderResult<SaveData>>;
}
