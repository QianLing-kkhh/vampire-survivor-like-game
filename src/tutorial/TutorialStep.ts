import { TutorialTrigger } from './TutorialTrigger';

export interface TutorialStep {
  id: string;
  titleKey: string;
  messageKey: string;
  trigger: TutorialTrigger;
  once?: boolean;
  priority?: number;
  helpTabId?: string;
}
