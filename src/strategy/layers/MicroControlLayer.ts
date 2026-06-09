import Phaser from 'phaser';

import { createMoveIntent } from '../../input/PlayerIntent';
import type { PlayerIntent } from '../../input/PlayerIntent';
import { AUTO_PLAYER_CONSTANTS } from '../../auto/AutoPlayerConstants';
import type { Candidate, MicroMoveResult } from '../../auto/AutoPlayerMovementTypes';

import type { MicroControlLayerInput } from './AutoMoveLayerTypes';

export class MicroControlLayer {
  toAutoStrategyIntent(direction: { x: number; y: number }): PlayerIntent {
    return createMoveIntent(direction.x, direction.y, 'autoStrategy');
  }

  evaluate(input: MicroControlLayerInput): MicroMoveResult {
    const {
      context,
      player,
      route,
      intent,
      danger,
      cornerTrap,
      terrainEscape,
      lastMoveDirection,
      ops,
    } = input;

    ops.advanceRouteWaypoint(route, player);
    const routeDirection = ops.getRouteDirection(context, player, route, intent);
    const warningEscapeDirection = ops.getBossWarningEscapeDirection(context, player);
    const routeReturnDirection = ops.getRouteReturnDirection(player, route);
    const candidates: Candidate[] = [];

    if (routeDirection.lengthSq() > 0) {
      const normalized = routeDirection.clone().normalize();

      candidates.push({ direction: normalized, reason: 'FOLLOW_ROUTE' });
      candidates.push({ direction: new Phaser.Math.Vector2(normalized.y, -normalized.x), reason: 'FOLLOW_ROUTE' });
      candidates.push({ direction: new Phaser.Math.Vector2(-normalized.y, normalized.x), reason: 'FOLLOW_ROUTE' });
    }

    if (routeReturnDirection.lengthSq() > 0) {
      candidates.push({ direction: routeReturnDirection, reason: 'FOLLOW_ROUTE' });
    }

    if (warningEscapeDirection.lengthSq() > 0) {
      candidates.push({ direction: warningEscapeDirection, reason: 'AVOID_BOSS_WARNING' });
    }

    candidates.push(...ops.getFinalBossWarningCandidates(context, player));

    if (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
      candidates.push(...ops.getNearestEnemyEscapeCandidates(context, player).map((candidate) => ({
        ...candidate,
        reason: 'AVOID_CLOSE_ENEMY',
      })));
    }

    if (cornerTrap.active && cornerTrap.inwardDirection.lengthSq() > 0) {
      candidates.push({ direction: cornerTrap.inwardDirection, reason: 'EMERGENCY_ESCAPE' });
    }

    if (terrainEscape.active && terrainEscape.direction.lengthSq() > 0) {
      candidates.push({ direction: terrainEscape.direction, reason: 'AVOID_OBSTACLE' });
    }

    if (lastMoveDirection && lastMoveDirection.lengthSq() > 0) {
      candidates.push({ direction: lastMoveDirection, reason: 'FOLLOW_ROUTE' });
    }

    let bestMove: MicroMoveResult | undefined;
    let bestCandidateReason = '';

    for (const candidate of candidates) {
      if (candidate.direction.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.direction.clone().normalize();
      const endpoint = ops.getCandidateEndpoint(context, player, direction);
      const score = ops.scoreMicroDirection(input, endpoint, direction, routeDirection);
      const result: MicroMoveResult = {
        direction,
        reason: ops.getMicroResultReason(candidate.reason),
        score,
      };

      if (!bestMove || result.score > bestMove.score) {
        bestMove = result;
        bestCandidateReason = candidate.reason;
      }
    }

    if (bestMove) {
      ops.updateFinalBossWarningChoiceDebug(bestCandidateReason);
    }

    return bestMove ?? {
      direction: routeDirection.lengthSq() > 0 ? routeDirection.normalize() : new Phaser.Math.Vector2(0, 0),
      reason: 'FOLLOW_ROUTE',
      score: 0,
    };
  }
}
