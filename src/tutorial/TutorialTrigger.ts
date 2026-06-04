export type TutorialTrigger =
  | {
    type: 'event';
    eventType: string;
  }
  | {
    type: 'time';
    gameTimeSeconds: number;
  }
  | {
    type: 'condition';
    conditionId: string;
  };
