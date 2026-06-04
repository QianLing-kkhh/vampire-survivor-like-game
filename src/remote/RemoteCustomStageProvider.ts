import type { CustomStagePackage } from '../custom/CustomStageSchema';

import type { RemoteProvider } from './RemoteProvider';
import type { RemoteProviderResult } from './RemoteProviderResult';

export interface RemoteCustomStageProvider extends RemoteProvider {
  uploadStage(stagePackage: CustomStagePackage): Promise<RemoteProviderResult<void>>;
  fetchStage(id: string): Promise<RemoteProviderResult<CustomStagePackage>>;
  searchStages(
    query: string,
  ): Promise<RemoteProviderResult<CustomStagePackage[]>>;
}
