export interface InputSettingsData {
  virtualJoystickEnabled: boolean;
  virtualJoystickSize: number;
  virtualJoystickOpacity: number;
  leftHandedMode: boolean;
  keyBindings: Record<string, string>;
}

export const DEFAULT_INPUT_SETTINGS: InputSettingsData = {
  virtualJoystickEnabled: true,
  virtualJoystickSize: 1,
  virtualJoystickOpacity: 0.6,
  leftHandedMode: false,
  keyBindings: {},
};
