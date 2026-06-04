export interface DeveloperSettingsData {
  playtestMode: boolean;
  csvLoggingEnabled: boolean;
  autoRestartEnabled: boolean;
  showDebugLogs: boolean;
  showDebugPanel: boolean;
  debugPanelOpacity: number;
  debugPanelCompact: boolean;
}

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettingsData = {
  playtestMode: false,
  csvLoggingEnabled: true,
  autoRestartEnabled: true,
  showDebugLogs: false,
  showDebugPanel: false,
  debugPanelOpacity: 0.75,
  debugPanelCompact: true,
};
