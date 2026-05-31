export enum GameState {
  Title = 'Title',
  Playing = 'Playing',
  LevelUp = 'LevelUp',
  Paused = 'Paused',
  GameOver = 'GameOver',
  Result = 'Result',
}

export const INITIAL_GAME_STATE = GameState.Title;
