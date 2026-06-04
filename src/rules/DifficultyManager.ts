import { SaveManager } from '../save/SaveManager';

import {
  BUILT_IN_DIFFICULTIES,
  DEFAULT_DIFFICULTY_ID,
  DifficultyDefinition,
} from './DifficultyDefinition';

type SaveSelectionsWithDifficulty = ReturnType<typeof SaveManager.get>['selections'] & {
  selectedDifficultyId?: string;
};

export class DifficultyManager {
  private selectedDifficultyId: string;

  constructor(private readonly difficulties = BUILT_IN_DIFFICULTIES) {
    const selections = SaveManager.get().selections as SaveSelectionsWithDifficulty;

    this.selectedDifficultyId = this.difficulties[selections.selectedDifficultyId ?? '']
      ? selections.selectedDifficultyId as string
      : DEFAULT_DIFFICULTY_ID;
  }

  getDifficulty(id: string): DifficultyDefinition {
    return this.difficulties[id] ?? this.difficulties[DEFAULT_DIFFICULTY_ID];
  }

  getSelectedDifficultyId(): string {
    return this.selectedDifficultyId;
  }

  setSelectedDifficultyId(id: string): void {
    this.selectedDifficultyId = this.difficulties[id] ? id : DEFAULT_DIFFICULTY_ID;

    SaveManager.update({
      selections: {
        ...SaveManager.get().selections,
        selectedDifficultyId: this.selectedDifficultyId,
      } as SaveSelectionsWithDifficulty,
    });
  }

  getSelectedDifficulty(): DifficultyDefinition {
    return this.getDifficulty(this.selectedDifficultyId);
  }

  listDifficulties(): DifficultyDefinition[] {
    return Object.values(this.difficulties).map((difficulty) => ({ ...difficulty }));
  }
}
