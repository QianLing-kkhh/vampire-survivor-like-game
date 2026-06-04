import { GameEvent } from '../../events/GameEvent';
import { EventTriggeredRelicEffectConfig, RelicEffect } from '../RelicEffect';
import { RelicEffectContext } from '../RelicEffectContext';

export class DefenseRelicEffect implements RelicEffect {
  readonly type = 'eventTriggered';
  private triggerCount = 0;

  constructor(private readonly config: EventTriggeredRelicEffectConfig) {}

  handleGameEvent(event: GameEvent, _context: RelicEffectContext): void {
    if (event.type === this.config.eventType) {
      this.triggerCount += 1;
    }
  }

  getTriggerCount(): number {
    return this.triggerCount;
  }
}
