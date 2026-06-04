export interface TutorialState {
  disabled: boolean;
  seenStepIds: string[];
}

export const DEFAULT_TUTORIAL_STATE: TutorialState = {
  disabled: false,
  seenStepIds: [],
};
