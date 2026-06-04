export interface DeveloperSettingsData {
  playtestMode: boolean;
  csvLoggingEnabled: boolean;
  autoRestartEnabled: boolean;
  showDebugLogs: boolean;
}

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettingsData = {
  playtestMode: false,
  csvLoggingEnabled: true,
  autoRestartEnabled: true,
  showDebugLogs: false,
};
