export interface RemoteProviderResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  status?: number;
}
