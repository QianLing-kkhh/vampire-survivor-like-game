import type { GameplayContext } from '../gameplay/GameplayContext';
import type { GameEventMeta } from '../events/GameEventBus';
import type { GameEventPayload, GameEventPayloadMap } from '../events/GameEventPayloads';

const RUN_STARTED_EVENT_NAME = 'run.started' satisfies keyof GameEventPayloadMap;

type RunStartedEventName = typeof RUN_STARTED_EVENT_NAME;

type GameSceneRunStartedPayload = GameEventPayload<RunStartedEventName>;

type GameSceneRunStartedRunId = GameSceneRunStartedPayload['runId'];

type GameSceneRunStartedGameTimeSeconds = GameSceneRunStartedPayload['gameTimeSeconds'];

type GameSceneRunEventGameplayContext = Pick<
  GameplayContext,
  'runSeed' | 'gameEventBus'
>;

type GameSceneRunEventBus = Pick<GameSceneRunEventGameplayContext['gameEventBus'], 'emit'>;

type GameSceneRunEventStage = Readonly<{
  id: GameSceneRunStartedPayload['stageId'];
}>;

type GameSceneRunEventMap = Readonly<{
  id: GameSceneRunStartedPayload['mapId'];
}>;

type GameSceneRunStartedContext = Readonly<{
  gameEventBus: GameSceneRunEventBus;
  runId: GameSceneRunStartedRunId;
  runSeed: GameSceneRunStartedPayload['runSeed'];
  characterId: GameSceneRunStartedPayload['characterId'];
  stageId: GameSceneRunStartedPayload['stageId'];
  mapId: GameSceneRunStartedPayload['mapId'];
  gameTimeSeconds: GameSceneRunStartedGameTimeSeconds;
}>;

type GameSceneRunStartedMeta = Required<Pick<GameEventMeta, 'gameTimeSeconds' | 'runId'>>;

type GameSceneRunStartedEventData = Readonly<{
  payload: Readonly<GameSceneRunStartedPayload>;
  meta: Readonly<GameSceneRunStartedMeta>;
}>;

export type GameSceneRunEventEmitterScenePort = Readonly<{
  gameplayContext?: GameSceneRunEventGameplayContext;
  runId: GameSceneRunStartedRunId;
  currentCharacterId: GameSceneRunStartedPayload['characterId'];
  currentStage: GameSceneRunEventStage;
  currentMap: GameSceneRunEventMap;
  timeManager: Readonly<{
    gameTimeSeconds: GameSceneRunStartedGameTimeSeconds;
  }>;
}>;

export class GameSceneRunEventEmitter {
  emitRunStartedFromScene(scene: GameSceneRunEventEmitterScenePort): void {
    const context = this.createRunStartedContext(scene);

    if (!context) {
      return;
    }

    this.emitRunStarted(context);
  }

  private createRunStartedContext(
    scene: GameSceneRunEventEmitterScenePort,
  ): GameSceneRunStartedContext | undefined {
    const gameplayContext = scene.gameplayContext;

    if (!gameplayContext) {
      return undefined;
    }

    const runId = this.normalizeRequiredText(scene.runId);
    const runSeed = this.normalizeRequiredText(gameplayContext.runSeed);
    const characterId = this.normalizeRequiredText(scene.currentCharacterId);
    const stageId = this.normalizeRequiredText(scene.currentStage.id);
    const mapId = this.normalizeRequiredText(scene.currentMap.id);
    const gameTimeSeconds = scene.timeManager.gameTimeSeconds;

    if (
      !runId
      || !runSeed
      || !characterId
      || !stageId
      || !mapId
      || !Number.isFinite(gameTimeSeconds)
      || gameTimeSeconds < 0
    ) {
      return undefined;
    }

    return {
      gameEventBus: gameplayContext.gameEventBus,
      runId,
      runSeed,
      characterId,
      stageId,
      mapId,
      gameTimeSeconds,
    };
  }

  private normalizeRequiredText(value: string): string | undefined {
    const normalized = value.trim();

    return normalized || undefined;
  }

  emitRunStarted(context: GameSceneRunStartedContext): void {
    const { payload, meta } = this.createRunStartedEventData(context);

    context.gameEventBus.emit(
      RUN_STARTED_EVENT_NAME,
      payload,
      meta,
    );
  }

  private createRunStartedEventData(
    context: GameSceneRunStartedContext,
  ): GameSceneRunStartedEventData {
    return {
      payload: this.createRunStartedPayload(context),
      meta: this.createRunStartedMeta(context),
    };
  }

  private createRunStartedPayload(
    context: GameSceneRunStartedContext,
  ): GameSceneRunStartedPayload {
    return {
      runId: context.runId,
      runSeed: context.runSeed,
      characterId: context.characterId,
      stageId: context.stageId,
      mapId: context.mapId,
      gameTimeSeconds: context.gameTimeSeconds,
    };
  }

  private createRunStartedMeta(
    context: GameSceneRunStartedContext,
  ): GameSceneRunStartedMeta {
    return {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    };
  }
}
