import Phaser from 'phaser';

import type { PlayerIntent } from '../input/PlayerIntent';
import { AutoStrategyEngine } from '../strategy/engine/AutoStrategyEngine';
import type {
  FinalBossDistanceConstraintDebugUpdate,
  FinalBossDistanceConstraintResult,
} from '../strategy/layers/AutoMoveLayerTypes';
import type { AutoStrategyProfile } from '../strategy/profile/AutoStrategyProfile';
import type { WeaponTag } from '../weapon/tags/WeaponTag';

import { AUTO_PLAYER_CONSTANTS } from './AutoPlayerConstants';
import type {
  AutoBossWarningSnapshot,
  AutoEnemySnapshot,
  AutoObstacleSnapshot,
  AutoPickupSnapshot,
  AutoPlayerContext,
  AutoPortalSnapshot,
  AutoPosition,
  AutoSlowZoneSnapshot,
  AutoWeaponSnapshot,
} from './AutoPlayerTypes';
import type {
  StrategicDirectionAnalysis,
  StrategicLookaheadDebugSnapshot,
  StrategicLookaheadResult,
} from './AutoPlayerDebugTypes';
import type {
  AutoTarget,
  Candidate,
  CandidateRoute,
  MicroMoveResult,
  MoveMode,
  StrategicPathStyle,
  StrategicMoveIntent,
  TacticalRoute,
} from './AutoPlayerMovementTypes';
import type {
  CornerTrapInfo,
  EnemyMotionSnapshot,
  KiteInfo,
  MovementMemoryInfo,
  SegmentPointInfo,
  SurroundInfo,
  TerrainEscapeInfo,
} from './AutoPlayerMemoryTypes';

export type {
  AutoBossWarningDanger,
  AutoBossWarningKind,
  AutoBossWarningSnapshot,
  AutoEnemySnapshot,
  AutoMapSnapshot,
  AutoObstacleSnapshot,
  AutoPickupSnapshot,
  AutoPlayerContext,
  AutoPlayerSnapshot,
  AutoPortalSnapshot,
  AutoPosition,
  AutoSlowZoneSnapshot,
  AutoTreasureSnapshot,
  AutoWeaponSnapshot,
  WeaponAutoContext,
} from './AutoPlayerTypes';

export class AutoPlayer {
  private stickyTargetId?: string;
  private stickyWaypoint?: Phaser.Math.Vector2;
  private stickyWaypointTargetId?: string;
  private suppressedTargetId?: string;
  private suppressedTargetFrames = 0;
  private lastPosition?: Phaser.Math.Vector2;
  private stallAnchor?: Phaser.Math.Vector2;
  private stallMs = 0;
  private stickyBreakoutDirection?: Phaser.Math.Vector2;
  private stickyBreakoutFrames = 0;
  private stickyKiteDirection?: Phaser.Math.Vector2;
  private stickyKiteFrames = 0;
  private strategicIntent?: StrategicMoveIntent;
  private strategicIntentRemainingMs = 0;
  private lastMoveDirection?: Phaser.Math.Vector2;
  private strategicDetourDirection?: Phaser.Math.Vector2;
  private tacticalBacktrackMs = 0;
  private tacticalRoute?: TacticalRoute;
  private tacticalRouteRemainingMs = 0;
  private routeSequence = 0;
  private autoMoveElapsedMs = 0;
  private autoMoveDebugSnapshot?: StrategicLookaheadDebugSnapshot;
  private enemyMotionSnapshots = new Map<string, EnemyMotionSnapshot>();
  private readonly strategyEngine = new AutoStrategyEngine();

  setStrategyProfile(profile: AutoStrategyProfile): void {
    this.strategyEngine.setProfile(profile);
  }

  getAutoMoveDebugSnapshot(): StrategicLookaheadDebugSnapshot | undefined {
    return this.autoMoveDebugSnapshot
      ? { ...this.autoMoveDebugSnapshot }
      : undefined;
  }

  private getEmptyAutoMoveDebugSnapshot(): StrategicLookaheadDebugSnapshot {
    return {
      preferredPathStyle: 'DIRECT',
      strategicLookaheadSeconds: 0,
      farmGrowthUrgency: 0,
      combatOpportunityScore: 0,
      xpAccessScore: 0,
      killZoneScore: 0,
      weaponEffectivePositionScore: 0,
      xpRouteScore: 0,
      killRouteScore: 0,
      overKitePenalty: 0,
      combatWindow: false,
      futurePlayerDensityRisk: 0,
      futureTargetZoneDensityRisk: 0,
      futurePathInterceptionRisk: 0,
      lureQuality: 0,
      escapeCorridorScore: 0,
      loopSustainability: 0,
      futureBoundaryRisk: 0,
      linearEscapePenalty: 0,
      continuationScore: 0,
      deadEndAfterArrivalRisk: 0,
      finalBossCloseRangeScore: 0,
      finalBossDashRisk: 0,
      finalBossRingGapScore: 0,
      finalBossDistancePenalty: 0,
      finalBossDistance: 0,
      finalBossDistanceForbiddenCandidateCount: 0,
      finalBossDistanceHardLimitTriggered: false,
      finalBossEmergencyDistanceEscapeUsed: false,
      finalBossOrbitCandidateChosen: false,
      finalBossRingGapDodgeChosen: false,
      finalBossDashSideStepChosen: false,
      finalBossCloseCutInCandidateChosen: false,
      selectedFinalBossCandidateReason: '',
      bossWarningAvoidReason: '',
    };
  }

  getMoveDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    this.tickSuppression();
    this.updateEnemyMotionSnapshots(context);
    this.autoMoveElapsedMs += Phaser.Math.Clamp(context.deltaMs ?? 16, 0, 120);

    const player = this.getPlayerVector(context);
    const movement = this.updateMovementMemory(context, player);
    const danger = this.getDangerInfo(context, player);
    const cornerTrap = this.getCornerTrapInfo(context, player, danger);
    const surround = this.getSurroundInfo(context, player, danger, movement);
    const terrainEscape = this.getTerrainEscapeInfo(context, player);
    const kite = this.getKiteInfo(context, player, danger, surround, movement);
    const targets = this.getTargets(context, player, danger.nearestDistance);
    const bestTarget = this.selectTarget(context, player, targets, danger.nearestDistance);
    const warningEscapeDirection = this.getBossWarningEscapeDirection(context, player);
    const portalEscapeDirection = this.getPortalEscapeDirection(context, player, danger);
    const breakoutDirection = this.getBreakoutDirection(context, player, danger, surround, movement, kite);
    this.updateFinalBossWarningDebugMetrics(context, player);
    const decision = this.strategyEngine.evaluate({
      strategic: {
        context,
        player,
        danger,
        cornerTrap,
        surround,
        movement,
        terrainEscape,
        kite,
        target: bestTarget,
        warningEscapeDirection,
        portalEscapeDirection,
        breakoutDirection,
        currentIntent: this.strategicIntent,
        intentRemainingMs: this.strategicIntentRemainingMs,
        ops: {
          needsForcedRefresh: (input, currentIntent) => this.needsForcedStrategicRefresh(
            input.context,
            input.player,
            currentIntent,
            input.danger as ReturnType<AutoPlayer['getDangerInfo']>,
            input.movement,
          ),
          evaluateIntent: (input) => this.evaluateStrategicIntent(
            input.context,
            input.player,
            input.danger as ReturnType<AutoPlayer['getDangerInfo']>,
            input.cornerTrap,
            input.surround,
            input.movement,
            input.terrainEscape,
            input.kite,
            input.target,
            input.warningEscapeDirection,
            input.portalEscapeDirection,
            input.breakoutDirection,
          ),
          scoreDirection: (input, direction, mode) => this.scoreStrategicDirection(
            input.context,
            input.player,
            direction,
            mode,
            input.danger as ReturnType<AutoPlayer['getDangerInfo']>,
            input.cornerTrap,
            input.surround,
            input.movement,
            input.terrainEscape,
            input.kite,
            input.target,
            input.warningEscapeDirection,
            input.portalEscapeDirection,
            input.breakoutDirection,
          ),
          getBossWarningRisk: (warningContext, warningPlayer) => this.getTotalBossWarningRisk(warningContext, warningPlayer),
          commitIntentState: (committedIntent, remainingMs) => {
            this.strategicIntent = committedIntent;
            this.strategicIntentRemainingMs = remainingMs;
          },
        },
      },
      tactical: {
        context,
        player,
        danger,
        cornerTrap,
        surround,
        movement,
        kite,
        terrainEscape,
        warningEscapeDirection,
        portalEscapeDirection,
        breakoutDirection,
        currentRoute: this.tacticalRoute,
        routeRemainingMs: this.tacticalRouteRemainingMs,
        elapsedMs: this.autoMoveElapsedMs,
        weights: this.strategyEngine.getMovementWeights(),
        ops: {
          shouldForceRefresh: (input) => this.shouldForceTacticalRouteRefresh(input.context, input.player, input.intent),
          evaluateRoute: (input) => this.evaluateTacticalRoute(
            input.context,
            input.player,
            input.danger as ReturnType<AutoPlayer['getDangerInfo']>,
            input.intent,
            input.cornerTrap,
            input.surround,
            input.movement,
            input.kite,
            input.terrainEscape,
            input.warningEscapeDirection,
            input.portalEscapeDirection,
            input.breakoutDirection,
          ),
          chooseRouteWithCommitment: (input, currentRoute, nextRoute) => this.chooseRouteWithCommitment(currentRoute, nextRoute, input.intent),
          getUpdateInterval: (mode) => this.getTacticalRouteUpdateInterval(mode),
          commitRouteState: (route, remainingMs) => {
            this.tacticalRoute = route;
            this.tacticalRouteRemainingMs = remainingMs;
          },
        },
      },
      micro: {
        context,
        player,
        danger,
        cornerTrap,
        surround,
        movement,
        kite,
        terrainEscape,
        lastMoveDirection: this.lastMoveDirection,
        debugSnapshot: this.autoMoveDebugSnapshot,
        ops: {
          advanceRouteWaypoint: (route, routePlayer) => this.advanceRouteWaypoint(route, routePlayer),
          getRouteDirection: (routeContext, routePlayer, route, routeIntent) => this.getRouteDirection(routeContext, routePlayer, route, routeIntent),
          getBossWarningEscapeDirection: (warningContext, warningPlayer) => this.getBossWarningEscapeDirection(warningContext, warningPlayer),
          getRouteReturnDirection: (routePlayer, route) => this.getRouteReturnDirection(routePlayer, route),
          getFinalBossWarningCandidates: (warningContext, warningPlayer) => this.getFinalBossWarningCandidates(warningContext, warningPlayer),
          getNearestEnemyEscapeCandidates: (enemyContext, enemyPlayer) => this.getNearestEnemyEscapeCandidates(enemyContext, enemyPlayer),
          getCandidateEndpoint: (endpointContext, endpointPlayer, direction) => this.getCandidateEndpoint(endpointContext, endpointPlayer, direction),
          getFinalBossDistanceConstraint: (constraintContext, constraintPlayer, endpoint) => (
            this.getFinalBossDistanceConstraint(constraintContext, constraintPlayer, endpoint)
          ),
          scoreMicroDirection: (input, endpoint, direction, routeDirection) => this.scoreMicroDirection(
            input.context,
            input.player,
            endpoint,
            direction,
            routeDirection,
            input.route,
            input.intent,
            input.danger as ReturnType<AutoPlayer['getDangerInfo']>,
            input.surround,
            input.movement,
            input.kite,
            input.terrainEscape,
          ),
          getMicroResultReason: (reason) => this.getMicroResultReason(reason),
          updateFinalBossWarningChoiceDebug: (reason) => this.updateFinalBossWarningChoiceDebug(reason),
          updateFinalBossDistanceConstraintDebug: (update) => this.updateFinalBossDistanceConstraintDebug(update),
        },
      },
    });
    const intent = decision.strategicIntent;
    const microMove = decision.microMove;

    if (!intent || !microMove) {
      return new Phaser.Math.Vector2(0, 0);
    }

    if (
      intent.target
      && (intent.mode === 'COLLECT' || intent.mode === 'CHEST_APPROACH')
      && danger.nearestDistance > AUTO_PLAYER_CONSTANTS.SAFE_DISTANCE
      && !movement.stalled
      && this.canPickupFrom(context, player, intent.target.position)
      && this.getTotalBossWarningRisk(context, player) <= 0
    ) {
      this.updateTargetStability(intent.target, 'collected');
      this.lastMoveDirection = new Phaser.Math.Vector2(0, 0);
      return new Phaser.Math.Vector2(0, 0);
    }

    if (microMove.direction.lengthSq() === 0) {
      return new Phaser.Math.Vector2(0, 0);
    }

    this.updateTargetStability(intent.target, microMove.reason);
    this.updateBreakoutStability(microMove.reason, microMove.direction);
    this.updateKiteStability(kite, microMove.reason, microMove.direction);
    const finalDirection = microMove.direction.normalize();

    this.updateStrategicDetourState(context, intent, finalDirection);
    this.lastMoveDirection = finalDirection.clone();
    return finalDirection;
  }

  getMoveIntent(context: AutoPlayerContext): PlayerIntent {
    return this.strategyEngine.toIntent(this.getMoveDirection(context));
  }

  private evaluateTacticalRoute(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    intent: StrategicMoveIntent,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
    terrainEscape: TerrainEscapeInfo,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): TacticalRoute {
    const routeCandidates = this.generateCandidateRoutes(context, player, intent, kite, portalEscapeDirection, breakoutDirection);
    const scoredRoutes = routeCandidates.map((route) => {
      const rawThreat = this.evaluateRouteThreat(context, player, route.waypoints, intent);

      return {
        ...route,
        rawThreat,
        threatRank: 0,
        rewardScore: 0,
        combatFitScore: this.evaluateRouteCombatFit(context, player, route.waypoints, danger, intent),
        xpRouteScore: 0,
        killRouteScore: 0,
        overKitePenalty: 0,
        routeScore: 0,
        hardInvalid: this.isRouteHardInvalid(context, player, route.waypoints, intent, rawThreat),
      };
    });
    const validRoutes = scoredRoutes.filter((route) => !route.hardInvalid);
    const rankedRoutes = (validRoutes.length > 0 ? validRoutes : scoredRoutes)
      .sort((a, b) => a.rawThreat - b.rawThreat)
      .map((route, index) => ({ ...route, threatRank: Math.min(4, index) }));

    let bestRoute: CandidateRoute | undefined;

    for (const route of rankedRoutes) {
      const rewardScore = this.evaluateRouteRewardScore(context, player, route.waypoints, intent, route.threatRank);
      const xpRouteScore = this.evaluateXpRouteScore(context, player, route.waypoints, intent, route.threatRank);
      const killRouteScore = this.evaluateKillRouteScore(context, player, route.waypoints, intent, danger, route.threatRank);
      const overKitePenalty = this.evaluateOverKitePenalty(context, player, route.waypoints, intent, danger);
      const stabilityScore = this.tacticalRoute && this.areRoutesSimilar(this.tacticalRoute.waypoints, route.waypoints)
        ? this.tacticalRoute.commitment
        : 0;
      const weights = this.strategyEngine.getMovementWeights();
      const routeScore = -route.threatRank * 48
        - route.rawThreat * 0.16 * weights.riskMultiplier
        + rewardScore
        + route.combatFitScore * weights.combatMultiplier
        + xpRouteScore * weights.farmMultiplier
        + killRouteScore * weights.combatMultiplier
        + stabilityScore
        - overKitePenalty * weights.overKitePenaltyMultiplier
        - (intent.avoidLinearEscape && route.id === 'direct' ? 34 : 0)
        - (route.hardInvalid ? 180 : 0);
      const scoredRoute = { ...route, rewardScore, xpRouteScore, killRouteScore, overKitePenalty, routeScore };

      if (!bestRoute || scoredRoute.routeScore > bestRoute.routeScore) {
        bestRoute = scoredRoute;
      }
    }

    const selected = bestRoute ?? {
      id: 'fallback',
      waypoints: [player.clone(), this.getStrategicTargetPoint(context, player, intent)],
      rawThreat: Number.POSITIVE_INFINITY,
      threatRank: 4,
      rewardScore: 0,
      combatFitScore: 0,
      xpRouteScore: 0,
      killRouteScore: 0,
      overKitePenalty: 0,
      routeScore: Number.NEGATIVE_INFINITY,
      hardInvalid: true,
    };
    this.autoMoveDebugSnapshot = {
      ...(this.autoMoveDebugSnapshot ?? this.getEmptyAutoMoveDebugSnapshot()),
      weaponEffectivePositionScore: selected.combatFitScore,
      xpRouteScore: selected.xpRouteScore,
      killRouteScore: selected.killRouteScore,
      overKitePenalty: selected.overKitePenalty,
      combatWindow: this.isCombatWindow(context, player, danger, intent),
    };

    return {
      id: `${selected.id}:${this.routeSequence++}`,
      waypoints: selected.waypoints.map((waypoint) => this.clampToWorld(context, waypoint)),
      currentWaypointIndex: Math.min(1, Math.max(0, selected.waypoints.length - 1)),
      threatRank: selected.threatRank,
      rawThreat: selected.rawThreat,
      rewardScore: selected.rewardScore,
      combatFitScore: selected.combatFitScore,
      xpRouteScore: selected.xpRouteScore,
      killRouteScore: selected.killRouteScore,
      overKitePenalty: selected.overKitePenalty,
      routeScore: selected.routeScore,
      createdAt: this.autoMoveElapsedMs,
      validUntil: this.autoMoveElapsedMs + AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_VALID_MS,
      commitment: Phaser.Math.Clamp(22 - selected.threatRank * 3 + intent.urgency * 8, 8, 30),
    };
  }

  private chooseRouteWithCommitment(
    currentRoute: TacticalRoute | undefined,
    nextRoute: TacticalRoute,
    intent: StrategicMoveIntent,
  ): TacticalRoute {
    if (!currentRoute || currentRoute.validUntil <= this.autoMoveElapsedMs) {
      return nextRoute;
    }

    const switchRatio = intent.mode === 'SURVIVE'
      ? AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_SWITCH_RATIO * 0.5
      : AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_SWITCH_RATIO;
    const requiredGain = Math.max(6, Math.abs(currentRoute.routeScore) * switchRatio);

    if (nextRoute.routeScore < currentRoute.routeScore + requiredGain) {
      return {
        ...currentRoute,
        validUntil: Math.max(currentRoute.validUntil, this.autoMoveElapsedMs + AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_VALID_MS * 0.45),
      };
    }

    return nextRoute;
  }

  private getMicroResultReason(reason: string): MicroMoveResult['reason'] {
    if (reason.startsWith('finalBoss')) {
      return 'AVOID_BOSS_WARNING';
    }

    switch (reason) {
      case 'AVOID_CLOSE_ENEMY':
      case 'AVOID_BOSS_WARNING':
      case 'AVOID_OBSTACLE':
      case 'EMERGENCY_ESCAPE':
        return reason;
      default:
        return 'FOLLOW_ROUTE';
    }
  }

  private shouldForceTacticalRouteRefresh(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
  ): boolean {
    const hpRatio = this.getHpRatio(context);
    const contactRisk = this.getEnemyContactRiskAt(context, player, hpRatio)
      + this.getEnemyFutureContactRiskAt(context, player, hpRatio);

    return this.getTotalBossWarningRisk(context, player) > 0
      || contactRisk > 140
      || (hpRatio < 0.35 && this.tacticalRoute?.threatRank !== undefined && this.tacticalRoute.threatRank > 1);
  }

  private getTacticalRouteUpdateInterval(mode: MoveMode): number {
    return mode === 'SURVIVE' || mode === 'REPOSITION'
      ? AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_URGENT_REFRESH_MS
      : AUTO_PLAYER_CONSTANTS.TACTICAL_ROUTE_REFRESH_MS;
  }

  private generateCandidateRoutes(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
    kite: KiteInfo,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): Array<Pick<CandidateRoute, 'id' | 'waypoints'>> {
    const target = this.getStrategicTargetPoint(context, player, intent);
    const forward = target.clone().subtract(player);

    if (forward.lengthSq() === 0) {
      return [{ id: 'hold', waypoints: [player.clone(), target] }];
    }

    const normalized = forward.clone().normalize();
    const left = new Phaser.Math.Vector2(-normalized.y, normalized.x);
    const right = new Phaser.Math.Vector2(normalized.y, -normalized.x);
    const distance = Math.min(forward.length(), AUTO_PLAYER_CONSTANTS.STRATEGIC_DISTANCE);
    const midDistance = Math.max(120, distance * 0.52);
    const narrowOffset = Math.max(90, distance * 0.28);
    const wideOffset = Math.max(150, distance * 0.45);
    const directRoute = { id: 'direct', waypoints: [player.clone(), target] };
    const leftArcRoute = { id: 'leftArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance)).add(left.clone().scale(narrowOffset)), target] };
    const rightArcRoute = { id: 'rightArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance)).add(right.clone().scale(narrowOffset)), target] };
    const wideLeftArcRoute = { id: 'wideLeftArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance * 0.82)).add(left.clone().scale(wideOffset)), target] };
    const wideRightArcRoute = { id: 'wideRightArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance * 0.82)).add(right.clone().scale(wideOffset)), target] };
    const loopClockwiseRoute = {
      id: 'loopClockwise',
      waypoints: [
        player.clone(),
        player.clone().add(right.clone().scale(wideOffset)).add(normalized.clone().scale(midDistance * 0.35)),
        player.clone().add(right.clone().scale(wideOffset * 1.2)).add(normalized.clone().scale(midDistance)),
        target,
      ],
    };
    const loopCounterClockwiseRoute = {
      id: 'loopCounterClockwise',
      waypoints: [
        player.clone(),
        player.clone().add(left.clone().scale(wideOffset)).add(normalized.clone().scale(midDistance * 0.35)),
        player.clone().add(left.clone().scale(wideOffset * 1.2)).add(normalized.clone().scale(midDistance)),
        target,
      ],
    };
    const routes: Array<Pick<CandidateRoute, 'id' | 'waypoints'>> = [];

    if (intent.preferredPathStyle === 'LOOP_CLOCKWISE') {
      routes.push(loopClockwiseRoute, wideRightArcRoute, rightArcRoute, wideLeftArcRoute, leftArcRoute);
    } else if (intent.preferredPathStyle === 'LOOP_COUNTERCLOCKWISE') {
      routes.push(loopCounterClockwiseRoute, wideLeftArcRoute, leftArcRoute, wideRightArcRoute, rightArcRoute);
    } else if (intent.preferredPathStyle === 'ARC_LEFT') {
      routes.push(leftArcRoute, wideLeftArcRoute, rightArcRoute, wideRightArcRoute);
    } else if (intent.preferredPathStyle === 'ARC_RIGHT') {
      routes.push(rightArcRoute, wideRightArcRoute, leftArcRoute, wideLeftArcRoute);
    } else {
      routes.push(directRoute, leftArcRoute, rightArcRoute, wideLeftArcRoute, wideRightArcRoute);
    }

    routes.push(directRoute);

    if (kite.direction.lengthSq() > 0) {
      routes.push({
        id: 'kiteTangent',
        waypoints: [player.clone(), player.clone().add(kite.direction.clone().normalize().scale(midDistance)), target],
      });
    }

    if (portalEscapeDirection.lengthSq() > 0 && intent.mode === 'SURVIVE') {
      routes.push({
        id: 'portalEscape',
        waypoints: [player.clone(), player.clone().add(portalEscapeDirection.clone().normalize().scale(midDistance)), target],
      });
    }

    if (breakoutDirection.lengthSq() > 0) {
      routes.push({
        id: 'breakout',
        waypoints: [player.clone(), player.clone().add(breakoutDirection.clone().normalize().scale(midDistance)), target],
      });
    }

    return routes.map((route) => ({
      id: route.id,
      waypoints: route.waypoints.map((waypoint) => this.clampToWorld(context, waypoint)),
    }));
  }

  private getStrategicTargetPoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
  ): Phaser.Math.Vector2 {
    if (intent.targetPosition) {
      return this.clampToWorld(context, intent.targetPosition);
    }

    if (intent.targetDirection.lengthSq() > 0) {
      return this.clampToWorld(
        context,
        player.clone().add(intent.targetDirection.clone().normalize().scale(AUTO_PLAYER_CONSTANTS.STRATEGIC_DISTANCE)),
      );
    }

    return player.clone();
  }

  private evaluateRouteThreat(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
  ): number {
    const hpRatio = this.getHpRatio(context);
    let threat = 0;

    for (const sample of this.getRouteSamplePoints(player, waypoints)) {
      threat += this.getEnemyPressureAt(context, sample, hpRatio) * 2.6;
      threat += this.getEnemyContactRiskAt(context, sample, hpRatio) * 1.8;
      threat += this.getEnemyFutureContactRiskAt(context, sample, hpRatio) * 1.35;
      threat += this.getTotalBossWarningRisk(context, sample) * 85;
      threat += this.getObstaclePenalty(context, sample) * 5.5;
      threat += this.getBorderPenalty(context, sample, this.isResourceMode(intent.mode) ? intent.target : undefined) * 2.2;
    }

    for (let index = 0; index < waypoints.length - 1; index += 1) {
      threat += this.getEnemyPathContactRisk(context, waypoints[index], waypoints[index + 1], hpRatio) * 1.25;
      threat += this.routeSegmentIntersectsObstacle(context, waypoints[index], waypoints[index + 1]) ? 180 : 0;
    }

    return threat / Math.max(1, waypoints.length);
  }

  private isRouteHardInvalid(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
    rawThreat: number,
  ): boolean {
    const hpRatio = this.getHpRatio(context);

    for (const sample of this.getRouteSamplePoints(player, waypoints)) {
      if (this.getTotalBossWarningRisk(context, sample) > 0.35) {
        return true;
      }

      if (this.getObstaclePenalty(context, sample) >= 35) {
        return true;
      }

      if (hpRatio < 0.35 && this.getEnemyContactRiskAt(context, sample, hpRatio) > 110) {
        return true;
      }

      if (this.getBorderPenalty(context, sample, undefined) > 70 && intent.mode !== 'COLLECT' && intent.mode !== 'CHEST_APPROACH') {
        return true;
      }
    }

    return hpRatio < 0.35 && rawThreat > 420;
  }

  private evaluateRouteRewardScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
    threatRank: number,
  ): number {
    if (!intent.target || !this.isResourceMode(intent.mode) || threatRank > 1 || intent.targetDirection.lengthSq() === 0) {
      return 0;
    }

    const toTarget = intent.target.approachPosition.clone().subtract(player);

    if (toTarget.lengthSq() === 0 || toTarget.normalize().dot(intent.targetDirection) < 0.5) {
      return 0;
    }

    const distanceToRoute = this.getDistanceToRoute(intent.target.approachPosition, waypoints);

    if (distanceToRoute > 150) {
      return 0;
    }

    return intent.target.value * (intent.target.type === 'treasure' ? 0.42 : 0.24)
      + Math.max(0, 150 - distanceToRoute) * 0.08;
  }

  private evaluateRouteCombatFit(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    intent: StrategicMoveIntent,
  ): number {
    if (waypoints.length < 2) {
      return 0;
    }

    const firstWaypoint = waypoints[Math.min(1, waypoints.length - 1)];
    const direction = firstWaypoint.clone().subtract(player);

    if (direction.lengthSq() === 0) {
      return 0;
    }

    const normalized = direction.normalize();
    const routeSamples = this.getRouteSamplePoints(player, waypoints);
    const combatWindow = this.isCombatWindow(context, player, danger, intent);
    let score = this.getWeaponCandidateScore(context, player, firstWaypoint, normalized, danger) * 4;

    for (const sample of routeSamples) {
      score += this.evaluateWeaponEffectivePosition(context, sample, danger) * (combatWindow ? 0.9 : 0.46);
    }

    if (intent.mode === 'COMBAT_FARM') {
      score *= 1.18 + this.evaluateFarmGrowthUrgency(context) * 0.5;
    }

    return score / Math.max(1, routeSamples.length * 0.55);
  }

  private evaluateXpRouteScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
    threatRank: number,
  ): number {
    if (threatRank > 1 || !this.isFarmSafeForGrowth(context, player)) {
      return 0;
    }

    const growthUrgency = this.evaluateFarmGrowthUrgency(context);
    const routeSamples = this.getRouteSamplePoints(player, waypoints);
    let score = 0;

    for (const pickup of context.pickupPositions) {
      const pickupPoint = new Phaser.Math.Vector2(pickup.x, pickup.y);
      const routeDistance = this.getDistanceToRoute(pickupPoint, waypoints);

      if (routeDistance > AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS * 1.25) {
        continue;
      }

      const pickupPressure = this.getEnemyPressureAt(context, pickupPoint, this.getHpRatio(context));
      const warningRisk = this.getTotalBossWarningRisk(context, pickupPoint);

      if (pickupPressure > 5.2 || warningRisk > 0) {
        continue;
      }

      const expValue = this.getPickupExpValue(pickup);
      const clusterValue = this.getPickupClusterScore(context, pickup);
      const distanceBonus = Math.max(0, AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS * 1.25 - routeDistance)
        / (AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS * 1.25);
      score += (expValue * 1.2 + clusterValue * 0.42) * distanceBonus;
    }

    if (intent.target?.type === 'pickup') {
      const routeDistance = this.getDistanceToRoute(intent.target.approachPosition, waypoints);
      score += Math.max(0, 180 - routeDistance) * 0.055;
    }

    return score * (0.7 + growthUrgency * 1.3) / Math.max(1, routeSamples.length * 0.18);
  }

  private evaluateKillRouteScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    threatRank: number,
  ): number {
    if (threatRank > 2 || context.enemyPositions.length === 0) {
      return 0;
    }

    const routeSamples = this.getRouteSamplePoints(player, waypoints);
    const range = this.getWeaponEffectiveRange(context);
    const growthUrgency = this.evaluateFarmGrowthUrgency(context);
    let score = 0;

    for (const sample of routeSamples) {
      let enemiesInBand = 0;
      let enemiesTooClose = 0;

      for (const enemy of context.enemyPositions) {
        const distance = this.getEnemyEffectiveDistance(context, sample, enemy);

        if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
          enemiesTooClose += 1;
          continue;
        }

        if (distance >= range.min && distance <= range.max) {
          enemiesInBand += this.getEnemyThreatWeight(enemy);
        }
      }

      score += enemiesInBand * 1.9 - enemiesTooClose * 4.2;
    }

    if (danger.enemyCenter.lengthSq() > 0 && waypoints.length >= 2) {
      const firstWaypoint = waypoints[Math.min(1, waypoints.length - 1)];
      const routeDirection = firstWaypoint.clone().subtract(player);
      const toEnemyCenter = danger.enemyCenter.clone().subtract(player);

      if (routeDirection.lengthSq() > 0 && toEnemyCenter.lengthSq() > 0) {
        const route = routeDirection.normalize();
        const enemyDir = toEnemyCenter.normalize();
        const lateral = Math.abs(route.x * enemyDir.y - route.y * enemyDir.x);
        const away = Math.max(0, route.dot(danger.fleeDirection));
        score += lateral * (intent.mode === 'COMBAT_FARM' ? 9 : 5);
        score -= away > 0.72 ? (away - 0.72) * 8 : 0;
      }
    }

    return score * (intent.mode === 'COMBAT_FARM' ? 1.25 : 0.75) * (1 + growthUrgency * 0.7)
      / Math.max(1, routeSamples.length * 0.35);
  }

  private evaluateOverKitePenalty(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): number {
    if (
      intent.mode === 'SURVIVE'
      || intent.mode === 'REPOSITION'
      || danger.enemyCenter.lengthSq() === 0
      || !this.isFarmSafeForGrowth(context, player)
    ) {
      return 0;
    }

    const endpoint = waypoints[waypoints.length - 1] ?? player;
    const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, danger.enemyCenter.x, danger.enemyCenter.y);
    const endpointDistance = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, danger.enemyCenter.x, danger.enemyCenter.y);
    const range = this.getWeaponEffectiveRange(context);
    const growthUrgency = this.evaluateFarmGrowthUrgency(context);

    if (endpointDistance <= range.max || endpointDistance <= currentDistance) {
      return 0;
    }

    const tooFar = endpointDistance - range.max;
    const movingAway = endpointDistance - currentDistance;
    const priestMultiplier = context.player?.characterId === 'priest' ? 1.5 : 1;

    return (tooFar * 0.035 + movingAway * 0.045)
      * (1 + growthUrgency)
      * priestMultiplier;
  }

  private areRoutesSimilar(
    currentWaypoints: readonly Phaser.Math.Vector2[],
    nextWaypoints: readonly Phaser.Math.Vector2[],
  ): boolean {
    if (currentWaypoints.length < 2 || nextWaypoints.length < 2) {
      return false;
    }

    const current = currentWaypoints[Math.min(1, currentWaypoints.length - 1)];
    const next = nextWaypoints[Math.min(1, nextWaypoints.length - 1)];

    return Phaser.Math.Distance.Between(current.x, current.y, next.x, next.y) < 130;
  }

  private advanceRouteWaypoint(route: TacticalRoute, player: Phaser.Math.Vector2): void {
    const index = Phaser.Math.Clamp(route.currentWaypointIndex, 0, Math.max(0, route.waypoints.length - 1));
    const waypoint = route.waypoints[index];

    if (
      waypoint
      && index < route.waypoints.length - 1
      && Phaser.Math.Distance.Between(player.x, player.y, waypoint.x, waypoint.y) < AUTO_PLAYER_CONSTANTS.ROUTE_WAYPOINT_REACHED_DISTANCE
    ) {
      route.currentWaypointIndex = index + 1;
    }
  }

  private getRouteDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    route: TacticalRoute,
    intent: StrategicMoveIntent,
  ): Phaser.Math.Vector2 {
    const waypoint = route.waypoints[Phaser.Math.Clamp(route.currentWaypointIndex, 0, Math.max(0, route.waypoints.length - 1))]
      ?? this.getStrategicTargetPoint(context, player, intent);
    const direction = waypoint.clone().subtract(player);

    return direction.lengthSq() > 0 ? direction.normalize() : intent.targetDirection.clone();
  }

  private getRouteReturnDirection(
    player: Phaser.Math.Vector2,
    route: TacticalRoute,
  ): Phaser.Math.Vector2 {
    const closest = this.getClosestPointOnRoute(player, route.waypoints);
    const distance = Phaser.Math.Distance.Between(player.x, player.y, closest.x, closest.y);

    if (distance < AUTO_PLAYER_CONSTANTS.MICRO_ROUTE_DEVIATION_LIMIT) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return closest.subtract(player).normalize();
  }

  private scoreMicroDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    routeDirection: Phaser.Math.Vector2,
    route: TacticalRoute,
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
    terrainEscape: TerrainEscapeInfo,
  ): number {
    const hpRatio = this.getHpRatio(context);
    const finalBossDistanceConstraint = this.getFinalBossDistanceConstraint(context, player, endpoint);

    if (finalBossDistanceConstraint.forbidden) {
      return -1000000 - finalBossDistanceConstraint.distance;
    }

    const endpointContactRisk = this.getEnemyContactRiskAt(context, endpoint, hpRatio);
    const endpointFutureRisk = this.getEnemyFutureContactRiskAt(context, endpoint, hpRatio);
    const pathContactRisk = this.getEnemyPathContactRisk(context, player, endpoint, hpRatio);
    const bossWarningRisk = this.getTotalBossWarningRisk(context, endpoint);
    const obstaclePenalty = this.getObstaclePenalty(context, endpoint);
    const hardContactRisk = endpointContactRisk + endpointFutureRisk + pathContactRisk;

    if (hardContactRisk > 220 || bossWarningRisk > 1.2) {
      return -100000 - hardContactRisk - bossWarningRisk * 1000;
    }

    let score = 0;

    if (routeDirection.lengthSq() > 0) {
      const alignment = direction.dot(routeDirection);
      const immediateThreat = danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS
        || this.getTotalBossWarningRisk(context, player) > 0
        || hardContactRisk > 120;

      score += alignment * 62;

      if (!immediateThreat && alignment < 0.3) {
        score -= 180;
      }
    }

    score += this.getRouteProgressScore(player, endpoint, route) * 0.16;
    score -= hardContactRisk * (hpRatio < 0.5 ? 1.55 : 1.15);
    score -= bossWarningRisk * 280;
    score -= obstaclePenalty * 12;
    score -= this.getBorderPenalty(context, endpoint, undefined) * (intent.mode === 'SURVIVE' || intent.mode === 'REPOSITION' ? 1.5 : 0.8);
    score += this.getEnemyPathClearanceScore(context, player, endpoint, hpRatio) * 0.8;
    score += this.getFinalBossDashPositioningScore(context, player, endpoint, intent.mode, false) * 0.6;
    score += this.getFinalBossWarningCombatScore(context, player, endpoint, direction) * 0.85;

    if (danger.fleeDirection.lengthSq() > 0 && danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
      score += direction.dot(danger.fleeDirection) * (intent.mode === 'SURVIVE' ? 18 : 9);
    }

    if (surround.surrounded || movement.prolonged) {
      score += this.getBreakoutCandidateScore(context, player, endpoint, direction, danger, surround, movement, kite) * 0.35;
    }

    if (terrainEscape.active) {
      score += this.getTerrainEscapeCandidateScore(context, player, endpoint, direction, terrainEscape) * 0.45;
    }

    if (this.lastMoveDirection && this.lastMoveDirection.lengthSq() > 0) {
      score += Math.max(-0.4, direction.dot(this.lastMoveDirection)) * 6;
    }

    return score;
  }



  private getTacticalCandidates(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    intent: StrategicMoveIntent,
    cornerTrap: CornerTrapInfo,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
    kiteDirection: Phaser.Math.Vector2,
    terrainEscapeDirection: Phaser.Math.Vector2,
  ): Candidate[] {
    const candidates: Candidate[] = [
      ...this.getBaseDirections(),
      ...this.getDiagonalMidDirections(),
    ]
      .map((direction) => ({ direction, reason: 'base' }));

    const contactRisk = this.getEnemyContactRiskAt(context, player, this.getHpRatio(context));
    const futureContactRisk = this.getEnemyFutureContactRiskAt(context, player, this.getHpRatio(context));

    if (
      danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS
      || contactRisk > 60
      || futureContactRisk > 70
    ) {
      candidates.push(...this.getNearestEnemyEscapeCandidates(context, player));
    }

    if (intent.targetDirection.lengthSq() > 0) {
      const strategic = intent.targetDirection.clone().normalize();

      candidates.push({ direction: strategic, reason: 'strategic' });
      candidates.push({ direction: new Phaser.Math.Vector2(strategic.y, -strategic.x), reason: 'strategicSlide' });
      candidates.push({ direction: new Phaser.Math.Vector2(-strategic.y, strategic.x), reason: 'strategicSlide' });

      if (this.strategicDetourDirection && this.strategicDetourDirection.lengthSq() > 0) {
        candidates.push({ direction: this.strategicDetourDirection, reason: 'strategicDetour' });
      }
    }

    if (cornerTrap.active && cornerTrap.inwardDirection.lengthSq() > 0) {
      const inward = cornerTrap.inwardDirection.clone().normalize();

      candidates.push({ direction: inward, reason: 'cornerEscape' });

      if (Math.abs(inward.x) > 0) {
        candidates.push({ direction: new Phaser.Math.Vector2(inward.x, 0), reason: 'cornerSlide' });
      }

      if (Math.abs(inward.y) > 0) {
        candidates.push({ direction: new Phaser.Math.Vector2(0, inward.y), reason: 'cornerSlide' });
      }
    }

    if (warningEscapeDirection.lengthSq() > 0) {
      candidates.push({ direction: warningEscapeDirection, reason: 'bossWarning' });
    }

    candidates.push(...this.getFinalBossWarningCandidates(context, player));

    if (portalEscapeDirection.lengthSq() > 0) {
      candidates.push({ direction: portalEscapeDirection, reason: 'portalEscape' });
    }

    if (breakoutDirection.lengthSq() > 0) {
      candidates.push({ direction: breakoutDirection, reason: 'breakout' });
    }

    if (kiteDirection.lengthSq() > 0) {
      candidates.push({ direction: kiteDirection, reason: 'kite' });
    }

    if (terrainEscapeDirection.lengthSq() > 0) {
      candidates.push({ direction: terrainEscapeDirection, reason: 'terrainEscape' });
    }

    const target = intent.target;

    if (target && this.isTacticalTargetAllowed(player, target, intent)) {
      const targetDirection = target.approachPosition.clone().subtract(player);

      if (targetDirection.lengthSq() > 0) {
        candidates.push({ direction: targetDirection, reason: target.blocked ? 'waypoint' : 'target' });
      }
    }

    const weaponDirection = this.getWeaponDirection(context, player, danger);

    if (weaponDirection.lengthSq() > 0) {
      candidates.push({ direction: weaponDirection, reason: 'weaponMicro' });
    }

    const centerDirection = new Phaser.Math.Vector2(
      context.worldBounds.width / 2 - player.x,
      context.worldBounds.height / 2 - player.y,
    );

    if (centerDirection.lengthSq() > 0) {
      candidates.push({ direction: centerDirection, reason: 'centerMicro' });
    }

    const borderDirection = this.getSoftBorderDirection(context, player);

    if (borderDirection.lengthSq() > 0) {
      candidates.push({ direction: borderDirection, reason: 'borderMicro' });
    }

    if (this.lastMoveDirection && this.lastMoveDirection.lengthSq() > 0) {
      candidates.push({ direction: this.lastMoveDirection, reason: 'smooth' });
    }

    return candidates;
  }

  private getNearestEnemyEscapeCandidates(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): Candidate[] {
    let nearestEnemy: AutoPosition | AutoEnemySnapshot | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemy of context.enemyPositions) {
      const distance = this.getEnemyEffectiveDistance(context, player, enemy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy) {
      return [];
    }

    const away = player.clone().subtract(new Phaser.Math.Vector2(nearestEnemy.x, nearestEnemy.y));

    if (away.lengthSq() === 0) {
      return [];
    }

    const escape = away.normalize();

    return [
      { direction: escape, reason: 'contactDodge' },
      { direction: new Phaser.Math.Vector2(escape.y, -escape.x), reason: 'contactSlide' },
      { direction: new Phaser.Math.Vector2(-escape.y, escape.x), reason: 'contactSlide' },
    ];
  }

  private updateStrategicDetourState(
    context: AutoPlayerContext,
    intent: StrategicMoveIntent,
    finalDirection: Phaser.Math.Vector2,
  ): void {
    const deltaMs = Phaser.Math.Clamp(context.deltaMs ?? 16, 0, 120);

    if (intent.targetDirection.lengthSq() === 0 || finalDirection.lengthSq() === 0) {
      this.tacticalBacktrackMs = Math.max(0, this.tacticalBacktrackMs - deltaMs * 2);
      this.strategicDetourDirection = undefined;
      return;
    }

    const strategic = intent.targetDirection.clone().normalize();
    const alignment = finalDirection.dot(strategic);

    if (alignment < -0.15) {
      this.tacticalBacktrackMs = Math.min(
        AUTO_PLAYER_CONSTANTS.TACTICAL_BACKTRACK_LIMIT_MS,
        this.tacticalBacktrackMs + deltaMs,
      );
    } else if (alignment >= 0.15) {
      this.tacticalBacktrackMs = Math.max(0, this.tacticalBacktrackMs - deltaMs * 3);
    } else {
      this.tacticalBacktrackMs = Math.max(0, this.tacticalBacktrackMs - deltaMs);
    }

    const lateral = finalDirection.clone().subtract(strategic.clone().scale(alignment));

    if (lateral.lengthSq() > 0.01) {
      this.strategicDetourDirection = strategic
        .clone()
        .scale(0.45)
        .add(lateral.normalize().scale(0.95))
        .normalize();
    } else if (alignment > 0.4) {
      this.strategicDetourDirection = undefined;
    }
  }

  private getBaseDirections(): Phaser.Math.Vector2[] {
    return [
      new Phaser.Math.Vector2(1, 0),
      new Phaser.Math.Vector2(1, 1),
      new Phaser.Math.Vector2(0, 1),
      new Phaser.Math.Vector2(-1, 1),
      new Phaser.Math.Vector2(-1, 0),
      new Phaser.Math.Vector2(-1, -1),
      new Phaser.Math.Vector2(0, -1),
      new Phaser.Math.Vector2(1, -1),
    ];
  }

  private evaluateStrategicIntent(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    terrainEscape: TerrainEscapeInfo,
    kite: KiteInfo,
    target: AutoTarget | undefined,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): StrategicMoveIntent {
    const mode = this.decideStrategicMode(
      context,
      player,
      danger,
      cornerTrap,
      surround,
      movement,
      terrainEscape,
      kite,
      target,
      warningEscapeDirection,
      portalEscapeDirection,
    );
    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestAnalysis: StrategicDirectionAnalysis | undefined;

    for (const candidate of this.getStrategicDirections(player, danger, kite, terrainEscape, target, portalEscapeDirection, breakoutDirection)) {
      if (candidate.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.clone().normalize();
      const analysis = this.analyzeStrategicDirection(
        context,
        player,
        direction,
        mode,
        danger,
        cornerTrap,
        surround,
        movement,
        terrainEscape,
        kite,
        target,
        warningEscapeDirection,
        portalEscapeDirection,
        breakoutDirection,
      );
      const score = analysis.score;

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
        bestAnalysis = analysis;
      }
    }

    if (bestDirection.lengthSq() === 0) {
      bestDirection = danger.fleeDirection.lengthSq() > 0
        ? danger.fleeDirection.clone()
        : new Phaser.Math.Vector2(1, 0);
      bestAnalysis = this.analyzeStrategicDirection(
        context,
        player,
        bestDirection.clone().normalize(),
        mode,
        danger,
        cornerTrap,
        surround,
        movement,
        terrainEscape,
        kite,
        target,
        warningEscapeDirection,
        portalEscapeDirection,
        breakoutDirection,
      );
    }

    const selectedAnalysis = bestAnalysis ?? this.analyzeStrategicDirection(
      context,
      player,
      bestDirection.clone().normalize(),
      mode,
      danger,
      cornerTrap,
      surround,
      movement,
      terrainEscape,
      kite,
      target,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    );
    this.autoMoveDebugSnapshot = {
      preferredPathStyle: selectedAnalysis.preferredPathStyle,
      strategicLookaheadSeconds: selectedAnalysis.strategicLookaheadSeconds,
      futurePlayerDensityRisk: selectedAnalysis.futurePlayerDensityRisk,
      futureTargetZoneDensityRisk: selectedAnalysis.futureTargetZoneDensityRisk,
      futurePathInterceptionRisk: selectedAnalysis.futurePathInterceptionRisk,
      farmGrowthUrgency: selectedAnalysis.farmGrowthUrgency,
      combatOpportunityScore: selectedAnalysis.combatOpportunityScore,
      xpAccessScore: selectedAnalysis.xpAccessScore,
      killZoneScore: selectedAnalysis.killZoneScore,
      weaponEffectivePositionScore: this.autoMoveDebugSnapshot?.weaponEffectivePositionScore ?? 0,
      xpRouteScore: this.autoMoveDebugSnapshot?.xpRouteScore ?? 0,
      killRouteScore: this.autoMoveDebugSnapshot?.killRouteScore ?? 0,
      overKitePenalty: this.autoMoveDebugSnapshot?.overKitePenalty ?? 0,
      combatWindow: selectedAnalysis.combatWindow,
      lureQuality: selectedAnalysis.lureQuality,
      escapeCorridorScore: selectedAnalysis.escapeCorridorScore,
      loopSustainability: selectedAnalysis.loopSustainability,
      futureBoundaryRisk: selectedAnalysis.futureBoundaryRisk,
      linearEscapePenalty: selectedAnalysis.linearEscapePenalty,
      continuationScore: selectedAnalysis.continuationScore,
      deadEndAfterArrivalRisk: selectedAnalysis.deadEndAfterArrivalRisk,
      finalBossCloseRangeScore: this.autoMoveDebugSnapshot?.finalBossCloseRangeScore ?? 0,
      finalBossDashRisk: this.autoMoveDebugSnapshot?.finalBossDashRisk ?? 0,
      finalBossRingGapScore: this.autoMoveDebugSnapshot?.finalBossRingGapScore ?? 0,
      finalBossDistancePenalty: this.autoMoveDebugSnapshot?.finalBossDistancePenalty ?? 0,
      finalBossDistance: this.autoMoveDebugSnapshot?.finalBossDistance ?? 0,
      finalBossDistanceForbiddenCandidateCount: this.autoMoveDebugSnapshot?.finalBossDistanceForbiddenCandidateCount ?? 0,
      finalBossDistanceHardLimitTriggered: this.autoMoveDebugSnapshot?.finalBossDistanceHardLimitTriggered ?? false,
      finalBossEmergencyDistanceEscapeUsed: this.autoMoveDebugSnapshot?.finalBossEmergencyDistanceEscapeUsed ?? false,
      finalBossOrbitCandidateChosen: this.autoMoveDebugSnapshot?.finalBossOrbitCandidateChosen ?? false,
      finalBossRingGapDodgeChosen: this.autoMoveDebugSnapshot?.finalBossRingGapDodgeChosen ?? false,
      finalBossDashSideStepChosen: this.autoMoveDebugSnapshot?.finalBossDashSideStepChosen ?? false,
      finalBossCloseCutInCandidateChosen: this.autoMoveDebugSnapshot?.finalBossCloseCutInCandidateChosen ?? false,
      selectedFinalBossCandidateReason: this.autoMoveDebugSnapshot?.selectedFinalBossCandidateReason ?? '',
      bossWarningAvoidReason: this.autoMoveDebugSnapshot?.bossWarningAvoidReason ?? '',
    };

    return {
      mode,
      targetDirection: selectedAnalysis.direction.clone().normalize(),
      targetPosition: selectedAnalysis.targetZoneCenter.clone(),
      preferredPathStyle: selectedAnalysis.preferredPathStyle,
      strategicLookaheadSeconds: selectedAnalysis.strategicLookaheadSeconds,
      desiredOrbitRadius: selectedAnalysis.desiredOrbitRadius,
      avoidLinearEscape: selectedAnalysis.avoidLinearEscape,
      urgency: this.getStrategicUrgency(context, player, danger, mode),
      validMs: this.getStrategicValidMs(mode),
      target: this.isStrategicTargetAllowed(context, player, target, mode) ? target : undefined,
    };
  }

  private decideStrategicMode(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    terrainEscape: TerrainEscapeInfo,
    kite: KiteInfo,
    target: AutoTarget | undefined,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
  ): MoveMode {
    const hpRatio = this.getHpRatio(context);
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const currentWarningRisk = this.getTotalBossWarningRisk(context, player);
    const contactRisk = this.getEnemyContactRiskAt(context, player, hpRatio);
    const futureContactRisk = this.getEnemyFutureContactRiskAt(context, player, hpRatio);

    if (
      hpRatio < 0.35
      || currentWarningRisk > 0
      || danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS
      || contactRisk > 80
      || futureContactRisk > 70
      || (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE && currentPressure > 2)
    ) {
      return 'SURVIVE';
    }

    if (
      terrainEscape.active
      || cornerTrap.active
      || surround.surrounded
      || movement.prolonged
      || (movement.stalled && danger.pressureCount >= 2)
      || portalEscapeDirection.lengthSq() > 0
    ) {
      return 'REPOSITION';
    }

    if (this.hasBossPressure(context) || warningEscapeDirection.lengthSq() > 0) {
      return 'BOSS_POSITIONING';
    }

    if (
      this.isFarmSafeForGrowth(context, player)
      && (
        (this.evaluateFarmGrowthUrgency(context) > 0.05 && (context.enemyPositions.length > 0 || context.pickupPositions.length > 0))
        || context.enemyPositions.length > 0
        || target?.type === 'pickup'
      )
    ) {
      return 'COMBAT_FARM';
    }

    if (kite.active || danger.pressureCount >= 3 || currentPressure > 2.2) {
      return 'KITE';
    }

    if (this.isStrategicTargetAllowed(context, player, target, 'CHEST_APPROACH') && target?.type === 'treasure') {
      return 'CHEST_APPROACH';
    }

    if (this.isStrategicTargetAllowed(context, player, target, 'COLLECT')) {
      return 'COLLECT';
    }

    return 'KITE';
  }

  private isFarmSafeForGrowth(context: AutoPlayerContext, player: Phaser.Math.Vector2): boolean {
    const hpRatio = this.getHpRatio(context);

    if (hpRatio <= 0.45 || this.getTotalBossWarningRisk(context, player) > 0) {
      return false;
    }

    const contactRisk = this.getEnemyContactRiskAt(context, player, hpRatio);
    const futureContactRisk = this.getEnemyFutureContactRiskAt(context, player, hpRatio);
    const pressure = this.getEnemyPressureAt(context, player, hpRatio);

    return contactRisk < 55
      && futureContactRisk < 65
      && pressure < 4.8;
  }

  private isCombatWindow(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    intent: StrategicMoveIntent,
  ): boolean {
    return this.isCombatWindowForMode(context, player, danger, intent.mode);
  }

  private isCombatWindowForMode(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    mode: MoveMode,
  ): boolean {
    if (mode === 'SURVIVE' || mode === 'REPOSITION' || !this.isFarmSafeForGrowth(context, player)) {
      return false;
    }

    const range = this.getWeaponEffectiveRange(context);

    return danger.nearestDistance > AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS
      && danger.nearestDistance < range.max * 1.35
      && context.enemyPositions.length > 0;
  }

  private evaluateFarmGrowthUrgency(context: AutoPlayerContext): number {
    const level = Math.max(1, context.player?.level ?? 1);
    const minute = Phaser.Math.Clamp(Math.floor(this.autoMoveElapsedMs / 60000), 0, 5);
    const expectedLevelByMinute = [1, 3, 5, 7, 9, 11];
    const expectedLevel = expectedLevelByMinute[minute] ?? 11;
    const baseUrgency = level < expectedLevel
      ? Phaser.Math.Clamp((expectedLevel - level) / Math.max(1, expectedLevel), 0, 1)
      : 0;
    const priestMultiplier = context.player?.characterId === 'priest' ? 1.5 : 1;

    return Phaser.Math.Clamp(baseUrgency * priestMultiplier, 0, 1.5);
  }

  private evaluateCombatOpportunityScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    mode: MoveMode,
  ): number {
    if (context.enemyPositions.length === 0 || mode === 'SURVIVE' || mode === 'REPOSITION') {
      return 0;
    }

    const range = this.getWeaponEffectiveRange(context);
    const endpointScore = this.evaluateWeaponEffectivePosition(context, endpoint, danger);
    const currentDistance = danger.enemyCenter.lengthSq() > 0
      ? Phaser.Math.Distance.Between(player.x, player.y, danger.enemyCenter.x, danger.enemyCenter.y)
      : Number.POSITIVE_INFINITY;
    const endpointDistance = danger.enemyCenter.lengthSq() > 0
      ? Phaser.Math.Distance.Between(endpoint.x, endpoint.y, danger.enemyCenter.x, danger.enemyCenter.y)
      : Number.POSITIVE_INFINITY;
    const tooFarCorrection = currentDistance > range.max && endpointDistance < currentDistance ? 8 : 0;
    const overFleePenalty = endpointDistance > range.max && endpointDistance > currentDistance
      ? Math.min(18, (endpointDistance - Math.max(range.max, currentDistance)) * 0.04)
      : 0;
    const lateralScore = danger.enemyCenter.lengthSq() > 0 && direction.lengthSq() > 0
      ? this.getStrategicLateralCombatScore(player, direction, danger.enemyCenter)
      : 0;
    const priestMultiplier = context.player?.characterId === 'priest' ? 1.3 : 1;

    return (endpointScore + tooFarCorrection + lateralScore - overFleePenalty) * priestMultiplier;
  }

  private evaluateStrategicXpAccessScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    mode: MoveMode,
  ): number {
    if (mode === 'SURVIVE' || mode === 'REPOSITION' || !this.isFarmSafeForGrowth(context, player)) {
      return 0;
    }

    const growthUrgency = this.evaluateFarmGrowthUrgency(context);
    const priestMultiplier = context.player?.characterId === 'priest' ? 1.3 : 1;
    let score = 0;

    for (const pickup of context.pickupPositions) {
      const pickupPoint = new Phaser.Math.Vector2(pickup.x, pickup.y);
      const distanceToEndpoint = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, pickupPoint.x, pickupPoint.y);

      if (distanceToEndpoint > AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS * 1.6) {
        continue;
      }

      const toPickup = pickupPoint.clone().subtract(player);

      if (toPickup.lengthSq() === 0 || toPickup.normalize().dot(direction) < 0.2) {
        continue;
      }

      const pickupPressure = this.getEnemyPressureAt(context, pickupPoint, this.getHpRatio(context));
      const warningRisk = this.getTotalBossWarningRisk(context, pickupPoint);

      if (pickupPressure > 5 || warningRisk > 0) {
        continue;
      }

      const expValue = this.getPickupExpValue(pickup);
      const clusterScore = this.getPickupClusterScore(context, pickup);
      const distanceFactor = 1 - distanceToEndpoint / (AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS * 1.6);
      score += (expValue * 0.8 + clusterScore * 0.32) * distanceFactor;
    }

    return score * (0.7 + growthUrgency) * priestMultiplier;
  }

  private evaluateStrategicKillZoneScore(
    context: AutoPlayerContext,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    mode: MoveMode,
  ): number {
    if (mode === 'SURVIVE' || mode === 'REPOSITION' || context.enemyPositions.length === 0) {
      return 0;
    }

    const range = this.getWeaponEffectiveRange(context);
    let enemiesInBand = 0;
    let tooClose = 0;

    for (const enemy of context.enemyPositions) {
      const distance = this.getEnemyEffectiveDistance(context, endpoint, enemy);

      if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        tooClose += this.getEnemyThreatWeight(enemy);
      } else if (distance >= range.min && distance <= range.max) {
        enemiesInBand += this.getEnemyThreatWeight(enemy);
      }
    }

    const lateralScore = danger.enemyCenter.lengthSq() > 0 && direction.lengthSq() > 0
      ? this.getStrategicLateralCombatScore(endpoint, direction, danger.enemyCenter) * 0.6
      : 0;

    return enemiesInBand * 2.4 + lateralScore - tooClose * 5;
  }

  private getStrategicLateralCombatScore(
    origin: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    enemyCenter: Phaser.Math.Vector2,
  ): number {
    const toEnemy = enemyCenter.clone().subtract(origin);

    if (toEnemy.lengthSq() === 0 || direction.lengthSq() === 0) {
      return 0;
    }

    const normalizedDirection = direction.clone().normalize();
    const enemyDirection = toEnemy.normalize();
    const lateral = Math.abs(normalizedDirection.x * enemyDirection.y - normalizedDirection.y * enemyDirection.x);
    const toward = normalizedDirection.dot(enemyDirection);

    return lateral * 8 - Math.max(0, toward - 0.55) * 5;
  }

  private getStrategicDirections(
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    kite: KiteInfo,
    terrainEscape: TerrainEscapeInfo,
    target: AutoTarget | undefined,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2[] {
    const directions = [
      ...this.getBaseDirections(),
      ...this.getDiagonalMidDirections(),
    ];

    if (danger.fleeDirection.lengthSq() > 0) {
      directions.push(danger.fleeDirection);
      directions.push(new Phaser.Math.Vector2(danger.fleeDirection.y, -danger.fleeDirection.x));
      directions.push(new Phaser.Math.Vector2(-danger.fleeDirection.y, danger.fleeDirection.x));
    }

    if (kite.direction.lengthSq() > 0) {
      directions.push(kite.direction);
    }

    if (terrainEscape.direction.lengthSq() > 0) {
      directions.push(terrainEscape.direction);
    }

    if (breakoutDirection.lengthSq() > 0) {
      directions.push(breakoutDirection);
    }

    if (portalEscapeDirection.lengthSq() > 0) {
      directions.push(portalEscapeDirection);
    }

    if (target) {
      directions.push(target.approachPosition.clone().subtract(player));
    }

    return directions;
  }

  private getDiagonalMidDirections(): Phaser.Math.Vector2[] {
    return [
      new Phaser.Math.Vector2(2, 1),
      new Phaser.Math.Vector2(1, 2),
      new Phaser.Math.Vector2(-1, 2),
      new Phaser.Math.Vector2(-2, 1),
      new Phaser.Math.Vector2(-2, -1),
      new Phaser.Math.Vector2(-1, -2),
      new Phaser.Math.Vector2(1, -2),
      new Phaser.Math.Vector2(2, -1),
    ];
  }

  private scoreStrategicDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    mode: MoveMode,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    terrainEscape: TerrainEscapeInfo,
    kite: KiteInfo,
    target: AutoTarget | undefined,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): number {
    return this.analyzeStrategicDirection(
      context,
      player,
      direction,
      mode,
      danger,
      cornerTrap,
      surround,
      movement,
      terrainEscape,
      kite,
      target,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    ).score;
  }

  private analyzeStrategicDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    mode: MoveMode,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    terrainEscape: TerrainEscapeInfo,
    kite: KiteInfo,
    target: AutoTarget | undefined,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): StrategicDirectionAnalysis {
    const hpRatio = this.getHpRatio(context);
    const endpoint = this.clampToWorld(
      context,
      player.clone().add(direction.clone().normalize().scale(AUTO_PLAYER_CONSTANTS.STRATEGIC_DISTANCE)),
    );
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
    const borderProgress = this.getNearestBorderDistance(context, endpoint)
      - this.getNearestBorderDistance(context, player);
    const obstacleProgress = this.getNearestObstacleClearance(context, endpoint)
      - this.getNearestObstacleClearance(context, player);
    const density = this.getEnemyDensityInDirection(context, player, direction, AUTO_PLAYER_CONSTANTS.PRE_ENCIRCLE_RADIUS);
    let score = 0;

    score -= endpointPressure * (mode === 'SURVIVE' ? 16 : 8);
    score -= density * (mode === 'SURVIVE' || mode === 'REPOSITION' ? 5 : 2.5);
    score -= this.getBorderPenalty(context, endpoint) * (mode === 'SURVIVE' || mode === 'REPOSITION' ? 6 : 2.4);
    score -= this.getObstaclePenalty(context, endpoint) * 2.2;
    score -= this.getTotalBossWarningRisk(context, endpoint) * 80;
    score += Math.max(-3, currentPressure - endpointPressure) * (mode === 'SURVIVE' ? 18 : 8);
    score += this.getFinalBossDashPositioningScore(context, player, endpoint, mode, true);
    score += Math.max(0, borderProgress) * (mode === 'REPOSITION' || kite.nearBorder ? 0.7 : 0.22);
    score += Math.max(0, obstacleProgress) * 0.25;

    if (danger.fleeDirection.lengthSq() > 0) {
      score += direction.dot(danger.fleeDirection) * (mode === 'SURVIVE' ? 32 : 10);
    }

    if (kite.direction.lengthSq() > 0 && (mode === 'KITE' || mode === 'BOSS_POSITIONING')) {
      score += Math.max(0, direction.dot(kite.direction)) * (kite.nearBorder ? 36 : 24);
    }

    if (cornerTrap.active && cornerTrap.inwardDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(cornerTrap.inwardDirection)) * 34;
    }

    if (terrainEscape.active && terrainEscape.direction.lengthSq() > 0) {
      score += Math.max(0, direction.dot(terrainEscape.direction)) * 36;
    }

    if ((surround.surrounded || movement.prolonged) && breakoutDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(breakoutDirection)) * 42;
    }

    if (warningEscapeDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(warningEscapeDirection)) * 58;
    }

    if ((mode === 'SURVIVE' || mode === 'REPOSITION') && portalEscapeDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(portalEscapeDirection)) * 46;
    }

    if (this.isStrategicTargetAllowed(context, player, target, mode)) {
      const targetDirection = target.approachPosition.clone().subtract(player);

      if (targetDirection.lengthSq() > 0) {
        score += Math.max(0, direction.dot(targetDirection.normalize()))
          * (target.type === 'treasure' ? 18 : 10);
      }
    }

    if (this.lastMoveDirection && this.lastMoveDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(this.lastMoveDirection)) * 6;
    }

    const lookahead = this.evaluateStrategicLookahead(
      context,
      player,
      endpoint,
      direction,
      mode,
      target,
      currentPressure,
      density,
    );
    const highPressureOrLate = this.isStrategicHighPressureOrLate(currentPressure, density);
    const firstStepWeight = highPressureOrLate ? 0.5 : 0.7;
    const continuationWeight = highPressureOrLate ? 1.8 : 1.3;
    const deadEndWeight = highPressureOrLate ? 1.8 : 1.3;
    const farmGrowthUrgency = this.evaluateFarmGrowthUrgency(context);
    const combatWindow = this.isCombatWindowForMode(context, player, danger, mode);
    const combatOpportunityScore = this.evaluateCombatOpportunityScore(context, player, endpoint, direction, danger, mode);
    const xpAccessScore = this.evaluateStrategicXpAccessScore(context, player, endpoint, direction, mode);
    const killZoneScore = this.evaluateStrategicKillZoneScore(context, endpoint, direction, danger, mode);
    const growthMultiplier = 1 + farmGrowthUrgency * (context.player?.characterId === 'priest' ? 1.35 : 0.9);
    const growthSuppressed = mode === 'SURVIVE'
      || mode === 'REPOSITION'
      || hpRatio < 0.45
      || this.getTotalBossWarningRisk(context, player) > 0;

    score = score * firstStepWeight
      + lookahead.continuationScore * continuationWeight
      - lookahead.deadEndAfterArrivalRisk * deadEndWeight
      + lookahead.futureZoneSafety * (highPressureOrLate ? 1.82 : 1.4)
      + lookahead.escapeCorridorScore * (highPressureOrLate ? 1.95 : 1.5)
      + lookahead.lureQuality * 1.2
      + lookahead.loopSustainability * (highPressureOrLate ? 2.4 : 1.6)
      - lookahead.futurePlayerDensityRisk * 1.2
      - lookahead.futureTargetZoneDensityRisk * 1.4
      - lookahead.futurePathInterceptionRisk * 1.5
      - lookahead.futureBoundaryRisk * (hpRatio < 0.35 ? 2.4 : 1.6)
      - lookahead.linearEscapePenalty * (highPressureOrLate ? 1.5 : 1);

    if (!growthSuppressed) {
      score += combatOpportunityScore * (mode === 'COMBAT_FARM' ? 1.45 : 0.85) * growthMultiplier;
      score += xpAccessScore * (mode === 'COMBAT_FARM' ? 1.35 : 0.7) * growthMultiplier;
      score += killZoneScore * (mode === 'COMBAT_FARM' ? 1.25 : 0.65) * growthMultiplier;
    }

    return {
      direction: direction.clone().normalize(),
      targetZoneCenter: endpoint,
      preferredPathStyle: lookahead.preferredPathStyle,
      strategicLookaheadSeconds: lookahead.strategicLookaheadSeconds,
      desiredOrbitRadius: lookahead.desiredOrbitRadius,
      avoidLinearEscape: lookahead.avoidLinearEscape,
      farmGrowthUrgency,
      combatOpportunityScore,
      xpAccessScore,
      killZoneScore,
      weaponEffectivePositionScore: this.autoMoveDebugSnapshot?.weaponEffectivePositionScore ?? 0,
      xpRouteScore: this.autoMoveDebugSnapshot?.xpRouteScore ?? 0,
      killRouteScore: this.autoMoveDebugSnapshot?.killRouteScore ?? 0,
      overKitePenalty: this.autoMoveDebugSnapshot?.overKitePenalty ?? 0,
      combatWindow,
      futurePlayerDensityRisk: lookahead.futurePlayerDensityRisk,
      futureTargetZoneDensityRisk: lookahead.futureTargetZoneDensityRisk,
      futurePathInterceptionRisk: lookahead.futurePathInterceptionRisk,
      lureQuality: lookahead.lureQuality,
      escapeCorridorScore: lookahead.escapeCorridorScore,
      loopSustainability: lookahead.loopSustainability,
      futureBoundaryRisk: lookahead.futureBoundaryRisk,
      linearEscapePenalty: lookahead.linearEscapePenalty,
      continuationScore: lookahead.continuationScore,
      deadEndAfterArrivalRisk: lookahead.deadEndAfterArrivalRisk,
      finalBossCloseRangeScore: this.autoMoveDebugSnapshot?.finalBossCloseRangeScore ?? 0,
      finalBossDashRisk: this.autoMoveDebugSnapshot?.finalBossDashRisk ?? 0,
      finalBossRingGapScore: this.autoMoveDebugSnapshot?.finalBossRingGapScore ?? 0,
      finalBossDistancePenalty: this.autoMoveDebugSnapshot?.finalBossDistancePenalty ?? 0,
      finalBossDistance: this.autoMoveDebugSnapshot?.finalBossDistance ?? 0,
      finalBossDistanceForbiddenCandidateCount: this.autoMoveDebugSnapshot?.finalBossDistanceForbiddenCandidateCount ?? 0,
      finalBossDistanceHardLimitTriggered: this.autoMoveDebugSnapshot?.finalBossDistanceHardLimitTriggered ?? false,
      finalBossEmergencyDistanceEscapeUsed: this.autoMoveDebugSnapshot?.finalBossEmergencyDistanceEscapeUsed ?? false,
      finalBossOrbitCandidateChosen: this.autoMoveDebugSnapshot?.finalBossOrbitCandidateChosen ?? false,
      finalBossRingGapDodgeChosen: this.autoMoveDebugSnapshot?.finalBossRingGapDodgeChosen ?? false,
      finalBossDashSideStepChosen: this.autoMoveDebugSnapshot?.finalBossDashSideStepChosen ?? false,
      finalBossCloseCutInCandidateChosen: this.autoMoveDebugSnapshot?.finalBossCloseCutInCandidateChosen ?? false,
      selectedFinalBossCandidateReason: this.autoMoveDebugSnapshot?.selectedFinalBossCandidateReason ?? '',
      bossWarningAvoidReason: this.autoMoveDebugSnapshot?.bossWarningAvoidReason ?? '',
      score,
    };
  }

  private evaluateStrategicLookahead(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    targetZoneCenter: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    mode: MoveMode,
    target: AutoTarget | undefined,
    currentPressure: number,
    currentDensity: number,
  ): StrategicLookaheadResult {
    const normalized = direction.clone().normalize();
    const predictedPlayerPositions = [
      this.predictPlayerPosition(context, player, normalized, AUTO_PLAYER_CONSTANTS.STRATEGIC_NEAR_SECONDS),
      this.predictPlayerPosition(context, player, normalized, AUTO_PLAYER_CONSTANTS.STRATEGIC_MID_SECONDS),
      this.predictPlayerPosition(context, player, normalized, AUTO_PLAYER_CONSTANTS.STRATEGIC_FAR_SECONDS),
    ];
    const futureEnemiesByTime = predictedPlayerPositions.map((predictedPosition, index) => (
      context.enemyPositions.map((enemy) => this.predictEnemyPositionTowardPlayerPath(
        enemy,
        predictedPosition,
        [
          AUTO_PLAYER_CONSTANTS.STRATEGIC_NEAR_SECONDS,
          AUTO_PLAYER_CONSTANTS.STRATEGIC_MID_SECONDS,
          AUTO_PLAYER_CONSTANTS.STRATEGIC_FAR_SECONDS,
        ][index],
      ))
    ));
    const pathSamples = this.getLineSamplePoints(player, targetZoneCenter, 5);
    const futurePlayerDensityRisk = this.evaluateFuturePlayerDensityRisk(player, futureEnemiesByTime[1]);
    const futureTargetZoneDensityRisk = this.evaluateFutureTargetZoneDensityRisk(targetZoneCenter, futureEnemiesByTime[2]);
    const futurePathInterceptionRisk = this.evaluateFuturePathInterceptionRisk(pathSamples, futureEnemiesByTime);
    const lureQuality = this.evaluateLureQuality(normalized, predictedPlayerPositions[1], futureEnemiesByTime[1]);
    const escapeCorridorScore = this.evaluateEscapeCorridorScore(context, normalized, pathSamples, futureEnemiesByTime);
    const loopSustainability = this.evaluateLoopSustainability(context, targetZoneCenter, futureEnemiesByTime);
    const futureBoundaryRisk = this.evaluateFutureBoundaryRisk(context, predictedPlayerPositions);
    const linearEscapePenalty = this.evaluateLinearEscapePenalty(
      normalized,
      this.lastMoveDirection ?? normalized,
      this.getStrategicPressureLevel(context, currentPressure, currentDensity),
      futureBoundaryRisk,
      loopSustainability,
    );
    const continuation = this.evaluateSecondStepLookahead(
      context,
      targetZoneCenter,
      normalized,
      futureEnemiesByTime[1],
      mode,
    );
    const highPressureOrLate = this.isStrategicHighPressureOrLate(currentPressure, currentDensity);
    const resourceSuppressed = highPressureOrLate || this.getHpRatio(context) < 0.35 || mode === 'SURVIVE' || mode === 'REPOSITION';
    const targetDirection = target?.approachPosition.clone().subtract(player);
    const resourceBias = resourceSuppressed
      || !target
      || !this.isResourceMode(mode)
      || !targetDirection
      || targetDirection.lengthSq() === 0
      ? 0
      : Math.max(0, normalized.dot(targetDirection.normalize())) * 2.5;
    const futureZoneSafety = Math.max(0, 36 - futureTargetZoneDensityRisk * 0.45 - futureBoundaryRisk * 0.25)
      + resourceBias;
    const avoidLinearEscape = highPressureOrLate
      || futureBoundaryRisk > 45
      || futurePathInterceptionRisk > 55
      || loopSustainability > 24;
    const preferredPathStyle = this.chooseStrategicPathStyle(
      context,
      normalized,
      targetZoneCenter,
      futurePathInterceptionRisk,
      loopSustainability,
      futureBoundaryRisk,
      linearEscapePenalty,
      continuation.continuationScore,
      mode,
    );

    return {
      preferredPathStyle,
      strategicLookaheadSeconds: AUTO_PLAYER_CONSTANTS.STRATEGIC_FAR_SECONDS,
      farmGrowthUrgency: 0,
      combatOpportunityScore: 0,
      xpAccessScore: 0,
      killZoneScore: 0,
      weaponEffectivePositionScore: 0,
      xpRouteScore: 0,
      killRouteScore: 0,
      overKitePenalty: 0,
      combatWindow: false,
      desiredOrbitRadius: this.getDesiredStrategicOrbitRadius(context, mode),
      avoidLinearEscape,
      futurePlayerDensityRisk,
      futureTargetZoneDensityRisk,
      futurePathInterceptionRisk,
      lureQuality,
      escapeCorridorScore,
      loopSustainability,
      futureBoundaryRisk,
      linearEscapePenalty,
      continuationScore: continuation.continuationScore,
      deadEndAfterArrivalRisk: continuation.deadEndAfterArrivalRisk,
      finalBossCloseRangeScore: this.autoMoveDebugSnapshot?.finalBossCloseRangeScore ?? 0,
      finalBossDashRisk: this.autoMoveDebugSnapshot?.finalBossDashRisk ?? 0,
      finalBossRingGapScore: this.autoMoveDebugSnapshot?.finalBossRingGapScore ?? 0,
      finalBossDistancePenalty: this.autoMoveDebugSnapshot?.finalBossDistancePenalty ?? 0,
      finalBossDistance: this.autoMoveDebugSnapshot?.finalBossDistance ?? 0,
      finalBossDistanceForbiddenCandidateCount: this.autoMoveDebugSnapshot?.finalBossDistanceForbiddenCandidateCount ?? 0,
      finalBossDistanceHardLimitTriggered: this.autoMoveDebugSnapshot?.finalBossDistanceHardLimitTriggered ?? false,
      finalBossEmergencyDistanceEscapeUsed: this.autoMoveDebugSnapshot?.finalBossEmergencyDistanceEscapeUsed ?? false,
      finalBossOrbitCandidateChosen: this.autoMoveDebugSnapshot?.finalBossOrbitCandidateChosen ?? false,
      finalBossRingGapDodgeChosen: this.autoMoveDebugSnapshot?.finalBossRingGapDodgeChosen ?? false,
      finalBossDashSideStepChosen: this.autoMoveDebugSnapshot?.finalBossDashSideStepChosen ?? false,
      finalBossCloseCutInCandidateChosen: this.autoMoveDebugSnapshot?.finalBossCloseCutInCandidateChosen ?? false,
      selectedFinalBossCandidateReason: this.autoMoveDebugSnapshot?.selectedFinalBossCandidateReason ?? '',
      bossWarningAvoidReason: this.autoMoveDebugSnapshot?.bossWarningAvoidReason ?? '',
      futureZoneSafety,
    };
  }

  private predictPlayerPosition(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    seconds: number,
  ): Phaser.Math.Vector2 {
    const moveSpeed = Math.max(80, context.player?.moveSpeed ?? 120);
    const distance = Math.min(AUTO_PLAYER_CONSTANTS.STRATEGIC_DISTANCE * 1.45, moveSpeed * seconds * 0.78);

    return this.clampToWorld(context, player.clone().add(direction.clone().normalize().scale(distance)));
  }

  private predictEnemyPositionTowardPlayerPath(
    enemy: AutoPosition | AutoEnemySnapshot,
    predictedPlayerPos: Phaser.Math.Vector2,
    seconds: number,
  ): Phaser.Math.Vector2 {
    const enemyPosition = new Phaser.Math.Vector2(enemy.x, enemy.y);
    const towardPlayer = predictedPlayerPos.clone().subtract(enemyPosition);
    const speed = this.getEnemyStrategicSpeed(enemy);
    const chaseVelocity = towardPlayer.lengthSq() > 0
      ? towardPlayer.normalize().scale(speed)
      : new Phaser.Math.Vector2(0, 0);
    const currentVelocity = this.getEnemyStrategicVelocity(enemy);
    const predictedVelocity = currentVelocity.scale(0.4).add(chaseVelocity.scale(0.6));

    return enemyPosition.add(predictedVelocity.scale(seconds));
  }

  private evaluateFuturePlayerDensityRisk(
    playerPos: Phaser.Math.Vector2,
    futureEnemies: readonly Phaser.Math.Vector2[],
  ): number {
    return this.evaluateFutureDensityAt(playerPos, futureEnemies, AUTO_PLAYER_CONSTANTS.STRATEGIC_LOOKAHEAD_SAMPLE_RADIUS);
  }

  private evaluateFutureTargetZoneDensityRisk(
    targetZoneCenter: Phaser.Math.Vector2,
    futureEnemies: readonly Phaser.Math.Vector2[],
  ): number {
    return this.evaluateFutureDensityAt(targetZoneCenter, futureEnemies, AUTO_PLAYER_CONSTANTS.STRATEGIC_LOOKAHEAD_SAMPLE_RADIUS * 1.08);
  }

  private evaluateFuturePathInterceptionRisk(
    routeOrLineSamples: readonly Phaser.Math.Vector2[],
    futureEnemiesByTime: readonly (readonly Phaser.Math.Vector2[])[],
  ): number {
    let risk = 0;

    for (const futureEnemies of futureEnemiesByTime) {
      for (const sample of routeOrLineSamples) {
        risk += this.evaluateFutureDensityAt(sample, futureEnemies, AUTO_PLAYER_CONSTANTS.STRATEGIC_LOOKAHEAD_SAMPLE_RADIUS * 0.72) * 0.22;
      }
    }

    return risk;
  }

  private evaluateLureQuality(
    candidateDirection: Phaser.Math.Vector2,
    predictedPlayerPos: Phaser.Math.Vector2,
    futureEnemies: readonly Phaser.Math.Vector2[],
  ): number {
    if (candidateDirection.lengthSq() === 0 || futureEnemies.length === 0) {
      return 0;
    }

    const forward = candidateDirection.clone().normalize();
    let score = 0;

    for (const enemy of futureEnemies) {
      const toEnemy = enemy.clone().subtract(predictedPlayerPos);

      if (toEnemy.lengthSq() === 0) {
        continue;
      }

      const normalized = toEnemy.normalize();
      const frontDot = normalized.dot(forward);
      const sideDot = Math.abs(normalized.x * forward.y - normalized.y * forward.x);

      if (frontDot < -0.25) {
        score += 2.4;
      } else if (frontDot > 0.35) {
        score -= 3.2;
      } else if (sideDot > 0.72) {
        score -= 1.1;
      }
    }

    return score;
  }

  private evaluateEscapeCorridorScore(
    context: AutoPlayerContext,
    candidateDirection: Phaser.Math.Vector2,
    pathSamples: readonly Phaser.Math.Vector2[],
    futureEnemiesByTime: readonly (readonly Phaser.Math.Vector2[])[],
  ): number {
    let score = 18;
    const left = new Phaser.Math.Vector2(-candidateDirection.y, candidateDirection.x);
    const right = new Phaser.Math.Vector2(candidateDirection.y, -candidateDirection.x);

    for (const sample of pathSamples) {
      score -= this.getBorderPenalty(context, sample, undefined) * 0.08;
      score -= this.getObstaclePenalty(context, sample) * 0.22;
      score += this.getNearestBorderDistance(context, sample) > AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN ? 1.4 : -2.4;

      const leftPoint = this.clampToWorld(context, sample.clone().add(left.clone().scale(130)));
      const rightPoint = this.clampToWorld(context, sample.clone().add(right.clone().scale(130)));
      score += this.getObstaclePenalty(context, leftPoint) < 15 ? 1.2 : -2.2;
      score += this.getObstaclePenalty(context, rightPoint) < 15 ? 1.2 : -2.2;
    }

    score -= this.evaluateFuturePathInterceptionRisk(pathSamples, futureEnemiesByTime) * 0.22;

    return score;
  }

  private evaluateLoopSustainability(
    context: AutoPlayerContext,
    targetZoneCenter: Phaser.Math.Vector2,
    futureEnemiesByTime: readonly (readonly Phaser.Math.Vector2[])[],
  ): number {
    const ringDirections = this.getBaseDirections();
    let openDirections = 0;
    let score = this.getNearestBorderDistance(context, targetZoneCenter) > AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN
      ? 16
      : -18;

    for (const direction of ringDirections) {
      const probe = this.clampToWorld(context, targetZoneCenter.clone().add(direction.clone().normalize().scale(170)));
      const blocked = this.getObstaclePenalty(context, probe) > 20 || this.getBorderPenalty(context, probe, undefined) > 55;
      const futureRisk = this.evaluateFutureDensityAt(probe, futureEnemiesByTime[futureEnemiesByTime.length - 1] ?? [], 210);

      if (!blocked && futureRisk < 18) {
        openDirections += 1;
        score += 3.5;
      } else {
        score -= 2.2;
      }
    }

    if (openDirections < 3) {
      score -= 28;
    } else if (openDirections >= 5) {
      score += 18;
    }

    return score;
  }

  private evaluateFutureBoundaryRisk(
    context: AutoPlayerContext,
    predictedPlayerPositions: readonly Phaser.Math.Vector2[],
  ): number {
    let risk = 0;

    for (const position of predictedPlayerPositions) {
      const nearestBorder = this.getNearestBorderDistance(context, position);
      const cornerDistance = this.getNearestCornerDistance(context, position);

      if (nearestBorder < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
        risk += (AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN - nearestBorder) * 0.45;
      }

      if (cornerDistance < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN * 1.35) {
        risk += (AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN * 1.35 - cornerDistance) * 0.32;
      }
    }

    return risk;
  }

  private evaluateLinearEscapePenalty(
    candidateDirection: Phaser.Math.Vector2,
    currentMoveDirection: Phaser.Math.Vector2,
    pressureLevel: number,
    futureBoundaryRisk: number,
    loopSustainability: number,
  ): number {
    if (candidateDirection.lengthSq() === 0 || currentMoveDirection.lengthSq() === 0) {
      return 0;
    }

    const alignment = candidateDirection.clone().normalize().dot(currentMoveDirection.clone().normalize());
    const pressureFactor = Math.max(0, pressureLevel - AUTO_PLAYER_CONSTANTS.HIGH_PRESSURE_THRESHOLD);
    const linearFactor = Math.max(0, alignment - 0.72);
    const loopPenalty = Math.max(0, 22 - loopSustainability) * 0.35;

    return linearFactor * (pressureFactor * 8 + futureBoundaryRisk * 0.42 + loopPenalty);
  }

  private evaluateSecondStepLookahead(
    context: AutoPlayerContext,
    firstZone: Phaser.Math.Vector2,
    firstDirection: Phaser.Math.Vector2,
    futureEnemiesAtArrival: readonly Phaser.Math.Vector2[],
    mode: MoveMode,
  ): { continuationScore: number; deadEndAfterArrivalRisk: number } {
    let safeExitCount = 0;
    let bestNextScore = Number.NEGATIVE_INFINITY;

    for (const nextDirection of this.getStrategicDirectionsFrom(firstDirection)) {
      const secondZone = this.clampToWorld(
        context,
        firstZone.clone().add(nextDirection.clone().normalize().scale(AUTO_PLAYER_CONSTANTS.STRATEGIC_CONTINUATION_DISTANCE)),
      );
      const futureEnemiesAfterSecond = context.enemyPositions.map((enemy) => (
        this.predictEnemyPositionTowardPlayerPath(
          enemy,
          secondZone,
          AUTO_PLAYER_CONSTANTS.STRATEGIC_NEAR_SECONDS + AUTO_PLAYER_CONSTANTS.STRATEGIC_MID_SECONDS,
        )
      ));
      const secondPathSamples = this.getLineSamplePoints(firstZone, secondZone, 4);
      const targetRisk = this.evaluateFutureTargetZoneDensityRisk(secondZone, futureEnemiesAfterSecond);
      const pathRisk = this.evaluateFuturePathInterceptionRisk(secondPathSamples, [futureEnemiesAtArrival, futureEnemiesAfterSecond]);
      const boundaryRisk = this.evaluateFutureBoundaryRisk(context, [firstZone, secondZone]);
      const loopScore = this.evaluateLoopSustainability(context, secondZone, [futureEnemiesAtArrival, futureEnemiesAfterSecond]);
      const corridorScore = this.evaluateEscapeCorridorScore(context, nextDirection, secondPathSamples, [futureEnemiesAtArrival, futureEnemiesAfterSecond]);
      const nextScore = loopScore + corridorScore - targetRisk * 0.9 - pathRisk * 1.1 - boundaryRisk * 0.8;

      if (nextScore > bestNextScore) {
        bestNextScore = nextScore;
      }

      if (nextScore > (mode === 'SURVIVE' ? -6 : 4)) {
        safeExitCount += 1;
      }
    }

    const deadEndAfterArrivalRisk = safeExitCount === 0
      ? 120
      : safeExitCount === 1
        ? 34
        : 0;
    const continuationScore = (Number.isFinite(bestNextScore) ? bestNextScore : -80)
      + safeExitCount * 16
      - deadEndAfterArrivalRisk * 0.55;

    return { continuationScore, deadEndAfterArrivalRisk };
  }

  private chooseStrategicPathStyle(
    context: AutoPlayerContext,
    direction: Phaser.Math.Vector2,
    targetZoneCenter: Phaser.Math.Vector2,
    futurePathInterceptionRisk: number,
    loopSustainability: number,
    futureBoundaryRisk: number,
    linearEscapePenalty: number,
    continuationScore: number,
    mode: MoveMode,
  ): StrategicPathStyle {
    const highPressureOrLate = this.autoMoveElapsedMs > AUTO_PLAYER_CONSTANTS.LATE_GAME_MS
      || context.enemyPositions.length >= 18
      || mode === 'SURVIVE'
      || mode === 'REPOSITION'
      || mode === 'BOSS_POSITIONING';
    const left = new Phaser.Math.Vector2(-direction.y, direction.x);
    const right = new Phaser.Math.Vector2(direction.y, -direction.x);
    const leftScore = this.scoreStrategicSideStyle(context, targetZoneCenter, left);
    const rightScore = this.scoreStrategicSideStyle(context, targetZoneCenter, right);
    const clockwise = rightScore >= leftScore;

    if (
      highPressureOrLate
      && loopSustainability > 18
      && (continuationScore > 6 || futureBoundaryRisk > 28 || linearEscapePenalty > 8)
    ) {
      return clockwise ? 'LOOP_CLOCKWISE' : 'LOOP_COUNTERCLOCKWISE';
    }

    if (
      futurePathInterceptionRisk > 32
      || futureBoundaryRisk > 42
      || mode === 'BOSS_POSITIONING'
    ) {
      return leftScore >= rightScore ? 'ARC_LEFT' : 'ARC_RIGHT';
    }

    if (mode === 'COMBAT_FARM' && loopSustainability > 10 && futureBoundaryRisk < 36) {
      return leftScore >= rightScore ? 'ARC_LEFT' : 'ARC_RIGHT';
    }

    return 'DIRECT';
  }

  private scoreStrategicSideStyle(
    context: AutoPlayerContext,
    targetZoneCenter: Phaser.Math.Vector2,
    sideDirection: Phaser.Math.Vector2,
  ): number {
    const sidePoint = this.clampToWorld(
      context,
      targetZoneCenter.clone().add(sideDirection.clone().normalize().scale(180)),
    );

    return this.getNearestBorderDistance(context, sidePoint) * 0.06
      - this.getObstaclePenalty(context, sidePoint) * 0.8
      - this.getEnemyPressureAt(context, sidePoint, this.getHpRatio(context)) * 2.2;
  }

  private getDesiredStrategicOrbitRadius(context: AutoPlayerContext, mode: MoveMode): number {
    if (mode === 'BOSS_POSITIONING') {
      return AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DASH_IDEAL_DISTANCE;
    }

    const weapons = this.getWeaponSnapshots(context);
    const orbitWeapon = weapons.find((weapon) => weapon.tags.includes('orbit'));
    const auraWeapon = weapons.find((weapon) => weapon.tags.includes('aura'));

    if (orbitWeapon?.radiusPx) {
      return orbitWeapon.radiusPx;
    }

    if (auraWeapon?.radiusPx) {
      return auraWeapon.radiusPx * 1.15;
    }

    return 240;
  }

  private getStrategicPressureLevel(
    context: AutoPlayerContext,
    currentPressure: number,
    currentDensity: number,
  ): number {
    return currentPressure
      + currentDensity * 0.35
      + Math.min(8, context.enemyPositions.length * 0.08);
  }

  private isStrategicHighPressureOrLate(currentPressure: number, currentDensity: number): boolean {
    return this.getStrategicPressureLevelFromValues(currentPressure, currentDensity) > AUTO_PLAYER_CONSTANTS.HIGH_PRESSURE_THRESHOLD
      || this.autoMoveElapsedMs > AUTO_PLAYER_CONSTANTS.LATE_GAME_MS;
  }

  private getStrategicPressureLevelFromValues(currentPressure: number, currentDensity: number): number {
    return currentPressure + currentDensity * 0.35;
  }

  private getEnemyStrategicSpeed(enemy: AutoPosition | AutoEnemySnapshot): number {
    const snapshotSpeed = 'moveSpeed' in enemy ? enemy.moveSpeed : undefined;

    if (snapshotSpeed !== undefined && Number.isFinite(snapshotSpeed) && snapshotSpeed > 0) {
      return snapshotSpeed;
    }

    const velocity = this.getEnemyStrategicVelocity(enemy);
    const velocitySpeed = velocity.length();

    return velocitySpeed > 0 ? Phaser.Math.Clamp(velocitySpeed, 45, 180) : 85;
  }

  private getEnemyStrategicVelocity(enemy: AutoPosition | AutoEnemySnapshot): Phaser.Math.Vector2 {
    const explicitVx = 'vx' in enemy ? enemy.vx : undefined;
    const explicitVy = 'vy' in enemy ? enemy.vy : undefined;

    if (
      explicitVx !== undefined
      && explicitVy !== undefined
      && (explicitVx !== 0 || explicitVy !== 0)
    ) {
      return new Phaser.Math.Vector2(explicitVx, explicitVy);
    }

    const id = 'id' in enemy ? enemy.id : undefined;
    const snapshot = id ? this.enemyMotionSnapshots.get(id) : undefined;

    return snapshot
      ? new Phaser.Math.Vector2(snapshot.vx, snapshot.vy)
      : new Phaser.Math.Vector2(0, 0);
  }

  private evaluateFutureDensityAt(
    point: Phaser.Math.Vector2,
    futureEnemies: readonly Phaser.Math.Vector2[],
    radius: number,
  ): number {
    let density = 0;

    for (const enemy of futureEnemies) {
      const distance = Phaser.Math.Distance.Between(point.x, point.y, enemy.x, enemy.y);

      if (distance > radius) {
        continue;
      }

      const proximity = (radius - Math.max(0, distance)) / radius;
      density += proximity * proximity * 10;
    }

    return density;
  }

  private getLineSamplePoints(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    count: number,
  ): Phaser.Math.Vector2[] {
    const samples: Phaser.Math.Vector2[] = [];
    const steps = Math.max(2, count);

    for (let index = 1; index <= steps; index += 1) {
      samples.push(start.clone().lerp(end, index / steps));
    }

    return samples;
  }

  private getNearestCornerDistance(context: AutoPlayerContext, point: Phaser.Math.Vector2): number {
    return Math.min(
      Phaser.Math.Distance.Between(point.x, point.y, 0, 0),
      Phaser.Math.Distance.Between(point.x, point.y, context.worldBounds.width, 0),
      Phaser.Math.Distance.Between(point.x, point.y, 0, context.worldBounds.height),
      Phaser.Math.Distance.Between(point.x, point.y, context.worldBounds.width, context.worldBounds.height),
    );
  }

  private getStrategicDirectionsFrom(seedDirection: Phaser.Math.Vector2): Phaser.Math.Vector2[] {
    const directions = [
      ...this.getBaseDirections(),
      ...this.getDiagonalMidDirections(),
    ];

    if (seedDirection.lengthSq() > 0) {
      const seed = seedDirection.clone().normalize();

      directions.push(seed);
      directions.push(new Phaser.Math.Vector2(-seed.y, seed.x));
      directions.push(new Phaser.Math.Vector2(seed.y, -seed.x));
    }

    return directions;
  }


  private needsForcedStrategicRefresh(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    movement: MovementMemoryInfo,
  ): boolean {
    const hpRatio = this.getHpRatio(context);

    return this.getTotalBossWarningRisk(context, player) > 0
      || (hpRatio < 0.35 && intent.mode !== 'SURVIVE')
      || (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE && intent.mode !== 'SURVIVE')
      || (movement.prolonged && intent.mode !== 'REPOSITION');
  }

  private getStrategicUrgency(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    mode: MoveMode,
  ): number {
    const hpRatio = this.getHpRatio(context);
    const warningRisk = this.getTotalBossWarningRisk(context, player);

    if (mode === 'SURVIVE') {
      return Phaser.Math.Clamp(0.75 + warningRisk * 0.1 + (0.35 - hpRatio), 0.75, 1);
    }

    if (mode === 'REPOSITION') {
      return danger.nearestDistance < AUTO_PLAYER_CONSTANTS.SAFE_DISTANCE ? 0.78 : 0.62;
    }

    if (mode === 'COMBAT_FARM') {
      return 0.52 + Math.min(0.16, this.evaluateFarmGrowthUrgency(context) * 0.12);
    }

    if (mode === 'BOSS_POSITIONING' || mode === 'KITE') {
      return 0.55;
    }

    return 0.35;
  }

  private getStrategicValidMs(mode: MoveMode): number {
    if (mode === 'SURVIVE' || mode === 'REPOSITION') {
      return AUTO_PLAYER_CONSTANTS.STRATEGIC_URGENT_REFRESH_MS;
    }

    if (mode === 'COLLECT' || mode === 'CHEST_APPROACH') {
      return AUTO_PLAYER_CONSTANTS.STRATEGIC_SAFE_REFRESH_MS;
    }

    return AUTO_PLAYER_CONSTANTS.STRATEGIC_REFRESH_MS;
  }

  private isStrategicTargetAllowed(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    target: AutoTarget | undefined,
    mode: MoveMode,
  ): target is AutoTarget {
    if (!target || (mode !== 'COLLECT' && mode !== 'CHEST_APPROACH')) {
      return false;
    }

    const hpRatio = this.getHpRatio(context);
    const playerPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const targetPressure = this.getEnemyPressureAt(context, target.approachPosition, hpRatio);

    return hpRatio >= 0.5
      && playerPressure < 2.6
      && targetPressure < 5
      && this.getTotalBossWarningRisk(context, player) <= 0
      && this.getTotalBossWarningRisk(context, target.approachPosition) <= 0;
  }

  private isTacticalTargetAllowed(
    player: Phaser.Math.Vector2,
    target: AutoTarget,
    intent: StrategicMoveIntent,
  ): boolean {
    if (!this.isResourceMode(intent.mode) || intent.targetDirection.lengthSq() === 0) {
      return false;
    }

    const targetDirection = target.approachPosition.clone().subtract(player);

    return targetDirection.lengthSq() > 0
      && targetDirection.normalize().dot(intent.targetDirection) > 0.5;
  }

  private isResourceMode(mode: MoveMode): boolean {
    return mode === 'COLLECT' || mode === 'CHEST_APPROACH';
  }

  private hasBossPressure(context: AutoPlayerContext): boolean {
    return context.enemyPositions.some((enemy) => (
      'isBoss' in enemy && enemy.isBoss === true
    ));
  }

  private getEnemyDensityInDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    radius: number,
  ): number {
    if (direction.lengthSq() === 0) {
      return 0;
    }

    const normalized = direction.clone().normalize();
    let density = 0;

    for (const enemy of context.enemyPositions) {
      const offset = new Phaser.Math.Vector2(enemy.x - player.x, enemy.y - player.y);
      const distance = offset.length();

      if (distance <= 0 || distance > radius) {
        continue;
      }

      const alignment = offset.normalize().dot(normalized);

      if (alignment <= 0.25) {
        continue;
      }

      density += alignment * alignment * this.getEnemyThreatWeight(enemy)
        * (1 - distance / radius);
    }

    return density;
  }

  private getFinalBossDashPositioningScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    mode: MoveMode,
    strategic: boolean,
  ): number {
    if (!this.hasFinalBossCombatWarning(context) && mode !== 'BOSS_POSITIONING' && mode !== 'KITE') {
      return 0;
    }

    return this.getFinalBossPreferredPositioningScore(context, player, endpoint, undefined) * (strategic ? 1.35 : 1);
  }

  private getFinalBossPreferredPositioningScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction?: Phaser.Math.Vector2,
  ): number {
    const boss = this.getFinalBossAnchor(context);

    if (!boss) {
      return 0;
    }

    const currentDistance = this.getFinalBossEffectiveDistance(context, player);
    const endpointDistance = this.getFinalBossEffectiveDistance(context, endpoint);
    const radial = new Phaser.Math.Vector2(endpoint.x - boss.x, endpoint.y - boss.y);
    let score = 0;

    if (endpointDistance < AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE) {
      score -= (AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE - endpointDistance) * 1.1 + 54;
    } else if (endpointDistance <= AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) {
      const ideal = (AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE + AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) * 0.5;

      score += 42 - Math.abs(endpointDistance - ideal) * 0.14;
    } else {
      const bufferPenalty = Math.max(0, endpointDistance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) * 0.45;
      const hardBandPenalty = Math.max(0, endpointDistance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT) * 1.1;
      const emergencyPenalty = Math.max(0, endpointDistance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_EMERGENCY_LIMIT) * 2.4;

      score -= 18 + bufferPenalty + hardBandPenalty + emergencyPenalty;
    }

    if (currentDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE && endpointDistance < currentDistance) {
      score += Math.min(140, currentDistance - endpointDistance) * 0.24;
    }

    if (
      currentDistance <= AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE
      && endpointDistance > currentDistance
      && endpointDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE
    ) {
      score -= Math.min(130, endpointDistance - currentDistance) * 0.30;
    }

    if (direction && direction.lengthSq() > 0 && radial.lengthSq() > 0) {
      const normalizedDirection = direction.clone().normalize();
      const radialDirection = radial.clone().normalize();
      const tangentAlignment = Math.abs(normalizedDirection.x * radialDirection.y - normalizedDirection.y * radialDirection.x);
      const outwardAlignment = normalizedDirection.dot(radialDirection);

      score += tangentAlignment * 22;

      if (outwardAlignment > 0.35 && endpointDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) {
        score -= outwardAlignment * Math.min(92, Math.max(0, endpointDistance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) * 0.65);
      }

      if (outwardAlignment < -0.25 && currentDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) {
        score += Math.abs(outwardAlignment) * 18;
      }
    }

    return score;
  }

  private getFinalBossEnemy(context: AutoPlayerContext): (AutoPosition | AutoEnemySnapshot) | undefined {
    return context.enemyPositions.find((enemy) => (
      'id' in enemy
      && typeof enemy.id === 'string'
      && enemy.id.startsWith('boss:')
      && 'isBoss' in enemy
      && enemy.isBoss === true
    ));
  }

  private hasDashBossWarning(context: AutoPlayerContext): boolean {
    return (context.bossWarnings ?? []).some((warning) => warning.kind === 'dash');
  }

  private hasFinalBossCombatWarning(context: AutoPlayerContext): boolean {
    return (context.bossWarnings ?? []).some((warning) => (
      this.isFinalBossDashWarning(context, warning)
      || this.isFinalBossRingBulletWarning(context, warning)
    ));
  }

  private getFinalBossAnchor(context: AutoPlayerContext): (AutoPosition | AutoEnemySnapshot) | undefined {
    const boss = this.getFinalBossEnemy(context);

    if (boss) {
      return boss;
    }

    const warning = (context.bossWarnings ?? []).find((candidate) => this.isFinalBossWarning(context, candidate));

    if (!warning) {
      return undefined;
    }

    return warning.shape === 'circle'
      ? { x: warning.x, y: warning.y }
      : { x: warning.start.x, y: warning.start.y };
  }

  private getFinalBossEffectiveDistance(context: AutoPlayerContext, point: Phaser.Math.Vector2): number {
    const boss = this.getFinalBossAnchor(context);

    if (!boss) {
      return Number.POSITIVE_INFINITY;
    }

    return this.getEnemyEffectiveDistance(context, point, boss);
  }

  private isFinalBossCloseCombatActive(context: AutoPlayerContext): boolean {
    return !!this.getFinalBossEnemy(context)
      || (context.bossWarnings ?? []).some((warning) => (
        this.isFinalBossDashWarning(context, warning)
        || this.isFinalBossRingBulletWarning(context, warning)
      ));
  }

  private getFinalBossDistanceConstraint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
  ): FinalBossDistanceConstraintResult {
    if (!this.isFinalBossCloseCombatActive(context)) {
      return {
        active: false,
        forbidden: false,
        emergencyAllowed: false,
        distance: 0,
        reason: '',
      };
    }

    const currentDistance = this.getFinalBossEffectiveDistance(context, player);
    const endpointDistance = this.getFinalBossEffectiveDistance(context, endpoint);

    if (!Number.isFinite(currentDistance) || !Number.isFinite(endpointDistance)) {
      return {
        active: false,
        forbidden: false,
        emergencyAllowed: false,
        distance: endpointDistance,
        reason: '',
      };
    }

    const warningEscape = this.isFinalBossImmediateWarningEscape(context, player, endpoint)
      && endpointDistance <= AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_EMERGENCY_LIMIT;

    if (
      currentDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT
      && endpointDistance > currentDistance
    ) {
      return {
        active: true,
        forbidden: true,
        emergencyAllowed: false,
        distance: endpointDistance,
        reason: 'finalBossDistanceHardLimit',
      };
    }

    if (endpointDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT) {
      if (
        currentDistance < AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE
        && endpointDistance <= AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_EMERGENCY_LIMIT
      ) {
        return {
          active: true,
          forbidden: false,
          emergencyAllowed: true,
          distance: endpointDistance,
          reason: 'finalBossEmergencyContactEscape',
        };
      }

      if (warningEscape) {
        return {
          active: true,
          forbidden: false,
          emergencyAllowed: true,
          distance: endpointDistance,
          reason: 'finalBossEmergencyWarningEscape',
        };
      }

      return {
        active: true,
        forbidden: true,
        emergencyAllowed: false,
        distance: endpointDistance,
        reason: 'finalBossDistanceHardLimit',
      };
    }

    return {
      active: true,
      forbidden: false,
      emergencyAllowed: false,
      distance: endpointDistance,
      reason: endpointDistance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE
        ? 'finalBossCloseRangeBuffer'
        : '',
    };
  }

  private isFinalBossImmediateWarningEscape(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
  ): boolean {
    const currentRisk = this.getTotalBossWarningRisk(context, player);
    const endpointRisk = this.getTotalBossWarningRisk(context, endpoint);

    return currentRisk > 0.9 && endpointRisk < currentRisk * 0.45;
  }

  private getFinalBossWarningCandidates(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): Candidate[] {
    if (!this.isFinalBossCloseCombatActive(context)) {
      return [];
    }

    const boss = this.getFinalBossAnchor(context);

    if (!boss) {
      return [];
    }

    const candidates: Candidate[] = [];
    const radial = new Phaser.Math.Vector2(player.x - boss.x, player.y - boss.y);

    if (radial.lengthSq() === 0) {
      radial.set(1, 0);
    }

    const normalizedRadial = radial.clone().normalize();
    const orbitClockwise = new Phaser.Math.Vector2(normalizedRadial.y, -normalizedRadial.x);
    const orbitCounterClockwise = new Phaser.Math.Vector2(-normalizedRadial.y, normalizedRadial.x);
    const distance = this.getFinalBossEffectiveDistance(context, player);
    let closeCutInAdded = false;

    for (const warning of context.bossWarnings ?? []) {
      if (this.isFinalBossDashWarning(context, warning) && warning.shape === 'line') {
        const line = new Phaser.Math.Vector2(warning.end.x - warning.start.x, warning.end.y - warning.start.y);

        if (line.lengthSq() > 0) {
          const lineDirection = line.normalize();
          candidates.push({ direction: new Phaser.Math.Vector2(-lineDirection.y, lineDirection.x), reason: 'finalBossDashSideStep' });
          candidates.push({ direction: new Phaser.Math.Vector2(lineDirection.y, -lineDirection.x), reason: 'finalBossDashSideStep' });
        }

        candidates.push({ direction: orbitClockwise, reason: 'finalBossOrbitClockwise' });
        candidates.push({ direction: orbitCounterClockwise, reason: 'finalBossOrbitCounterClockwise' });

        if (distance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) {
          const cutIn = new Phaser.Math.Vector2(boss.x - player.x, boss.y - player.y);

          if (cutIn.lengthSq() > 0) {
            const normalizedCutIn = cutIn.normalize();

            candidates.push({ direction: normalizedCutIn.clone().add(orbitClockwise.clone().scale(0.55)), reason: 'finalBossCloseCutIn' });
            candidates.push({ direction: normalizedCutIn.clone().add(orbitCounterClockwise.clone().scale(0.55)), reason: 'finalBossCloseCutIn' });
            closeCutInAdded = true;
          }
        }
      } else if (this.isFinalBossRingBulletWarning(context, warning) && warning.shape === 'circle') {
        candidates.push({ direction: orbitClockwise, reason: 'finalBossCloseOrbit' });
        candidates.push({ direction: orbitCounterClockwise, reason: 'finalBossCloseOrbit' });
        candidates.push(...this.getFinalBossRingGapCandidates(player, warning));
      }
    }

    if (distance > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT && !closeCutInAdded) {
      const cutIn = new Phaser.Math.Vector2(boss.x - player.x, boss.y - player.y);

      if (cutIn.lengthSq() > 0) {
        const normalizedCutIn = cutIn.normalize();

        candidates.push({ direction: normalizedCutIn.clone().add(orbitClockwise.clone().scale(0.55)), reason: 'finalBossCloseCutIn' });
        candidates.push({ direction: normalizedCutIn.clone().add(orbitCounterClockwise.clone().scale(0.55)), reason: 'finalBossCloseCutIn' });
      }
    }

    return candidates;
  }

  private getFinalBossRingGapCandidates(
    player: Phaser.Math.Vector2,
    warning: AutoBossWarningSnapshot & { shape: 'circle' },
  ): Candidate[] {
    const bulletCount = this.getFinalBossRingBulletCount(warning);
    const center = new Phaser.Math.Vector2(warning.x, warning.y);
    const toPlayer = player.clone().subtract(center);

    if (toPlayer.lengthSq() === 0) {
      toPlayer.set(1, 0);
    }

    const currentRadius = Phaser.Math.Clamp(
      toPlayer.length(),
      AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE + 22,
      AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE,
    );
    const angle = Math.atan2(toPlayer.y, toPlayer.x);
    const step = Math.PI * 2 / bulletCount;
    const offset = warning.angleOffset ?? 0;
    const nearestLane = Math.round((angle - offset) / step);
    const gapAngles = [
      offset + (nearestLane + 0.5) * step,
      offset + (nearestLane - 0.5) * step,
    ];

    return gapAngles
      .map((gapAngle) => {
        const target = new Phaser.Math.Vector2(
          center.x + Math.cos(gapAngle) * currentRadius,
          center.y + Math.sin(gapAngle) * currentRadius,
        );
        const direction = target.subtract(player);

        return direction.lengthSq() > 0
          ? { direction, reason: 'finalBossRingGapCutThrough' }
          : undefined;
      })
      .filter((candidate): candidate is Candidate => candidate !== undefined);
  }

  private isFinalBossWarning(context: AutoPlayerContext, warning: AutoBossWarningSnapshot): boolean {
    if (warning.bossId === 'final_boss' || warning.skillId?.startsWith('final_boss_')) {
      return true;
    }

    const boss = this.getFinalBossEnemy(context);

    if (!boss) {
      return false;
    }

    const warningPoint = warning.shape === 'circle'
      ? new Phaser.Math.Vector2(warning.x, warning.y)
      : new Phaser.Math.Vector2(warning.start.x, warning.start.y);

    return Phaser.Math.Distance.Between(warningPoint.x, warningPoint.y, boss.x, boss.y) <= 180;
  }

  private isFinalBossDashWarning(context: AutoPlayerContext, warning: AutoBossWarningSnapshot): boolean {
    return warning.shape === 'line'
      && warning.kind === 'dash'
      && (
        warning.skillId === 'final_boss_dash'
        || this.isFinalBossWarning(context, warning)
      );
  }

  private isFinalBossRingBulletWarning(context: AutoPlayerContext, warning: AutoBossWarningSnapshot): boolean {
    return warning.shape === 'circle'
      && warning.kind === 'ring'
      && (
        warning.skillId === 'final_boss_ring_bullets'
        || this.isFinalBossWarning(context, warning)
      );
  }

  private getFinalBossWarningCombatScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
  ): number {
    if (!this.hasFinalBossCombatWarning(context)) {
      return 0;
    }

    let score = this.getFinalBossPreferredPositioningScore(context, player, endpoint, direction);

    for (const warning of context.bossWarnings ?? []) {
      if (this.isFinalBossDashWarning(context, warning)) {
        const risk = this.getFinalBossDashRisk(context, endpoint, warning);

        score -= risk * 96;

        if (warning.shape === 'line' && direction.lengthSq() > 0) {
          const lineDirection = new Phaser.Math.Vector2(
            warning.end.x - warning.start.x,
            warning.end.y - warning.start.y,
          );

          if (lineDirection.lengthSq() > 0) {
            const normalizedLine = lineDirection.normalize();
            const normalizedDirection = direction.clone().normalize();
            const sidestep = Math.abs(normalizedDirection.x * normalizedLine.y - normalizedDirection.y * normalizedLine.x);
            const alongLine = Math.abs(normalizedDirection.dot(normalizedLine));

            score += sidestep * 32 - alongLine * 8;
          }
        }
      } else if (this.isFinalBossRingBulletWarning(context, warning)) {
        const risk = this.getFinalBossRingBulletLaneRisk(context, endpoint, warning);
        const gapScore = this.getFinalBossRingBulletGapScore(context, endpoint, warning);

        score += gapScore * 34 - risk * 88;
      }
    }

    return score;
  }

  private getFinalBossDashRisk(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    warning: AutoBossWarningSnapshot,
  ): number {
    if (warning.shape !== 'line') {
      return 0;
    }

    const start = new Phaser.Math.Vector2(warning.start.x, warning.start.y);
    const end = new Phaser.Math.Vector2(warning.end.x, warning.end.y);
    const lineDistance = this.getDistanceSegmentToPoint(start, end, point);
    const halfWidth = Math.max(1, warning.width / 2);
    const dangerWidth = halfWidth + 34;
    const distanceToBoss = this.getFinalBossEffectiveDistance(context, point);
    const laneRisk = lineDistance >= dangerWidth
      ? 0
      : 1 + (dangerWidth - lineDistance) / dangerWidth;
    const closeContactRisk = distanceToBoss < AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE
      ? (AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE - distanceToBoss) / AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MIN_DISTANCE
      : 0;
    const midFarAmplifier = distanceToBoss > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE
      ? 1 + Math.min(1.1, (distanceToBoss - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) / 160)
      : 0.72;
    const farDistanceRisk = Math.max(0, distanceToBoss - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT) / 260;

    return laneRisk * midFarAmplifier
      + closeContactRisk * 0.8
      + farDistanceRisk * 0.28;
  }

  private getFinalBossRingBulletLaneRisk(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    warning: AutoBossWarningSnapshot,
  ): number {
    if (warning.shape !== 'circle') {
      return 0;
    }

    const center = new Phaser.Math.Vector2(warning.x, warning.y);
    const offset = point.clone().subtract(center);

    if (offset.lengthSq() === 0) {
      return 0.35;
    }

    const bulletCount = this.getFinalBossRingBulletCount(warning);
    const step = Math.PI * 2 / bulletCount;
    const safeAngle = step * AUTO_PLAYER_CONSTANTS.FINAL_BOSS_RING_GAP_SAFE_RATIO;
    const laneDistance = this.getFinalBossRingLaneAngularDistance(warning, Math.atan2(offset.y, offset.x));
    const laneRisk = laneDistance >= safeAngle
      ? 0
      : (safeAngle - laneDistance) / safeAngle;
    const distanceToBoss = this.getFinalBossEffectiveDistance(context, point);
    const farAmplifier = distanceToBoss > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE
      ? 1.2 + Math.min(0.8, (distanceToBoss - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) / 160)
      : 0.82;

    return laneRisk * laneRisk * farAmplifier
      + Math.max(0, distanceToBoss - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT) / 320;
  }

  private getFinalBossRingBulletGapScore(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    warning: AutoBossWarningSnapshot,
  ): number {
    if (warning.shape !== 'circle') {
      return 0;
    }

    const center = new Phaser.Math.Vector2(warning.x, warning.y);
    const offset = point.clone().subtract(center);

    if (offset.lengthSq() === 0) {
      return 0;
    }

    const bulletCount = this.getFinalBossRingBulletCount(warning);
    const step = Math.PI * 2 / bulletCount;
    const laneDistance = this.getFinalBossRingLaneAngularDistance(warning, Math.atan2(offset.y, offset.x));
    const gapCenterDistance = Math.abs((step / 2) - laneDistance);
    const gapScore = Phaser.Math.Clamp(1 - gapCenterDistance / (step / 2), 0, 1);
    const distanceToBoss = this.getFinalBossEffectiveDistance(context, point);
    const distancePenalty = Math.max(0, distanceToBoss - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) / 180;

    return Math.max(0, gapScore - distancePenalty * 0.45);
  }

  private getFinalBossRingLaneAngularDistance(
    warning: AutoBossWarningSnapshot & { shape: 'circle' },
    angle: number,
  ): number {
    const bulletCount = this.getFinalBossRingBulletCount(warning);
    const step = Math.PI * 2 / bulletCount;
    const offset = warning.angleOffset ?? 0;
    const normalized = this.getWrappedAngle(angle - offset);
    const laneIndex = Math.round(normalized / step);
    const laneAngle = laneIndex * step;

    return Math.abs(this.getWrappedAngle(normalized - laneAngle));
  }

  private getFinalBossRingBulletCount(warning: AutoBossWarningSnapshot): number {
    return Math.max(3, warning.bulletCount ?? AUTO_PLAYER_CONSTANTS.FINAL_BOSS_RING_BULLET_COUNT);
  }

  private getWrappedAngle(angle: number): number {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
  }

  private evaluateTacticalDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    target: AutoTarget | undefined,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
    terrainEscape: TerrainEscapeInfo,
  ): number {
    const hpRatio = this.getHpRatio(context);
    let score = 0;
    const usefulPortalEndpoint = this.isUsefulPortalEndpoint(context, player, endpoint, danger, hpRatio);
    const contactRiskMultiplier = usefulPortalEndpoint
      ? 0.08
      : 1;
    const endpointContactRisk = this.getEnemyContactRiskAt(context, endpoint, hpRatio);
    const endpointFutureRisk = this.getEnemyFutureContactRiskAt(context, endpoint, hpRatio);
    const pathContactRisk = this.getEnemyPathContactRisk(context, player, endpoint, hpRatio);
    const hardContactRisk = endpointContactRisk + endpointFutureRisk + pathContactRisk;

    if (!usefulPortalEndpoint && hardContactRisk > 220) {
      return -100000 - hardContactRisk;
    }

    const localDanger = endpointContactRisk
      + pathContactRisk
      + this.getTotalBossWarningRisk(context, endpoint) * 45
      + this.getObstaclePenalty(context, endpoint) * 8;
    const dangerHigh = localDanger > 70 || intent.mode === 'SURVIVE';
    const alignmentWeight = dangerHigh ? 18 : 42;
    const safetyWeight = dangerHigh ? 1.5 : 1;

    if (!usefulPortalEndpoint && hardContactRisk > 150) {
      score -= 650 + hardContactRisk * 1.6;
    }

    score -= this.getEnemyPressureAt(context, endpoint, hpRatio) * (hpRatio < 0.35 ? 1.45 : 1);
    score -= endpointContactRisk * contactRiskMultiplier * safetyWeight;
    score -= endpointFutureRisk * contactRiskMultiplier * safetyWeight;
    score -= pathContactRisk * contactRiskMultiplier * safetyWeight;
    score += this.getEnemyPathClearanceScore(context, player, endpoint, hpRatio) * contactRiskMultiplier;
    score -= this.getEnemyApproachPenalty(context, player, endpoint, hpRatio) * contactRiskMultiplier;
    score += this.getSafeEnemyDistanceScore(context, player, endpoint);
    score -= this.getBorderPenalty(context, endpoint, this.isResourceMode(intent.mode) ? target : undefined)
      * (intent.mode === 'SURVIVE' || intent.mode === 'REPOSITION' ? 1.35 : 1);
    score -= this.getObstaclePenalty(context, endpoint) * safetyWeight;
    score += this.getSlowZoneScore(context, endpoint, hpRatio);
    score += this.getBossWarningCandidateScore(context, player, endpoint) * 1.25;
    score += this.getFinalBossDashPositioningScore(context, player, endpoint, intent.mode, false);
    score += this.getFinalBossWarningCombatScore(context, player, endpoint, direction);
    score -= this.getNoProgressBorderPenalty(context, player, endpoint, direction, danger);
    score -= this.getHighPressureBorderPenalty(context, player, endpoint, direction, kite);

    if (intent.targetDirection.lengthSq() > 0) {
      score += direction.dot(intent.targetDirection) * alignmentWeight * intent.urgency;
      score -= this.getStrategicBacktrackPenalty(
        context,
        player,
        endpoint,
        direction,
        intent,
        localDanger,
        hpRatio,
      );
    }

    if (intent.targetPosition) {
      const currentIntentDistance = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        intent.targetPosition.x,
        intent.targetPosition.y,
      );
      const endpointIntentDistance = Phaser.Math.Distance.Between(
        endpoint.x,
        endpoint.y,
        intent.targetPosition.x,
        intent.targetPosition.y,
      );

      score += (currentIntentDistance - endpointIntentDistance) * (dangerHigh ? 0.05 : 0.11);
    }

    if (this.lastMoveDirection && this.lastMoveDirection.lengthSq() > 0) {
      score += Math.max(-0.5, direction.dot(this.lastMoveDirection)) * (dangerHigh ? 4 : 9);
    }

    if (usefulPortalEndpoint) {
      score += hpRatio < 0.35 ? 420 : 260;
    }

    if (intent.mode === 'SURVIVE' || intent.mode === 'REPOSITION') {
      score += this.getPortalEscapeCandidateScore(context, player, endpoint, danger, hpRatio);
      score += this.getCornerEscapeScore(context, player, endpoint, direction, danger, cornerTrap);
      score += this.getBreakoutCandidateScore(context, player, endpoint, direction, danger, surround, movement, kite);
      score += this.getTerrainEscapeCandidateScore(context, player, endpoint, direction, terrainEscape);
    } else {
      score += this.getPortalScore(context, endpoint, hpRatio) * 0.35;
      score += this.getCornerEscapeScore(context, player, endpoint, direction, danger, cornerTrap) * 0.65;
    }

    if (intent.mode === 'KITE' || intent.mode === 'BOSS_POSITIONING') {
      score += this.getKiteCandidateScore(context, player, endpoint, direction, danger, kite);
      score += this.getWeaponCandidateScore(context, player, endpoint, direction, danger) * 0.55;
    } else if (!dangerHigh) {
      score += this.getWeaponCandidateScore(context, player, endpoint, direction, danger) * 0.18;
    }

    if (target && this.isTacticalTargetAllowed(player, target, intent)) {
      const targetDistance = Phaser.Math.Distance.Between(
        endpoint.x,
        endpoint.y,
        target.approachPosition.x,
        target.approachPosition.y,
      );
      const progress = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        target.approachPosition.x,
        target.approachPosition.y,
      ) - targetDistance;
      const targetPressure = this.getEnemyPressureAt(context, target.approachPosition, hpRatio);
      const targetWarningRisk = this.getTotalBossWarningRisk(context, target.approachPosition);
      const currentWarningRisk = this.getTotalBossWarningRisk(context, player);

      if ((movement.stalled && surround.surrounded) || (movement.prolonged && targetPressure > 1.5)) {
        score -= target.value * (surround.surrounded ? 1.1 : 0.75);
      } else if (targetWarningRisk > 0 && currentWarningRisk > 0) {
        score -= target.value * 0.95;
        score -= targetWarningRisk * 18;
      } else if (targetPressure < (hpRatio < 0.35 ? 3.5 : 7)) {
        score += target.value * (target.type === 'treasure' ? 0.28 : 0.18);
        score += Math.max(-80, progress) * 0.032;
      } else {
        score -= target.value * 0.45;
      }

      if (target.id === this.stickyTargetId) {
        score += movement.stalled ? 0 : AUTO_PLAYER_CONSTANTS.TARGET_STICKY_BONUS * 0.5;
      }

      if (this.canPickupFrom(context, endpoint, target.position)) {
        score += target.type === 'treasure' ? 10 : 5;
      }
    }

    if (danger.fleeDirection.lengthSq() > 0) {
      if (intent.mode === 'SURVIVE') {
        const fleeWeight = kite.active
          ? 1.2
          : danger.nearestDistance > AUTO_PLAYER_CONSTANTS.SAFE_DISTANCE
            ? 0.7
            : (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE ? 16 : 7);
        score += direction.dot(danger.fleeDirection) * fleeWeight;
      } else if (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        score += direction.dot(danger.fleeDirection) * 12;
      }
    }

    return score;
  }

  private getStrategicBacktrackPenalty(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    intent: StrategicMoveIntent,
    localDanger: number,
    hpRatio: number,
  ): number {
    if (intent.targetDirection.lengthSq() === 0) {
      return 0;
    }

    const strategic = intent.targetDirection.clone().normalize();
    const alignment = direction.dot(strategic);

    if (alignment >= -0.08) {
      return 0;
    }

    const currentWarningRisk = this.getTotalBossWarningRisk(context, player);
    const endpointWarningRisk = this.getTotalBossWarningRisk(context, endpoint);
    const warningEscape = currentWarningRisk > 0 && endpointWarningRisk < currentWarningRisk;
    const graceRatio = Phaser.Math.Clamp(
      this.tacticalBacktrackMs / AUTO_PLAYER_CONSTANTS.TACTICAL_BACKTRACK_GRACE_MS,
      0,
      1,
    );
    const overrunRatio = Phaser.Math.Clamp(
      (this.tacticalBacktrackMs - AUTO_PLAYER_CONSTANTS.TACTICAL_BACKTRACK_GRACE_MS)
        / Math.max(1, AUTO_PLAYER_CONSTANTS.TACTICAL_BACKTRACK_LIMIT_MS - AUTO_PLAYER_CONSTANTS.TACTICAL_BACKTRACK_GRACE_MS),
      0,
      1,
    );
    const opposite = -alignment;
    const currentContactRisk = this.getEnemyContactRiskAt(context, player, hpRatio)
      + this.getEnemyPathContactRisk(
        context,
        player,
        player.clone().add(strategic.clone().scale(AUTO_PLAYER_CONSTANTS.STEP_DISTANCE)),
        hpRatio,
      );
    const emergencyContact = localDanger > 100 || currentContactRisk > 80 || hpRatio < 0.35;

    if (emergencyContact) {
      return 0;
    }

    const shortDetourAllowance = localDanger > 80 || currentContactRisk > 60 || hpRatio < 0.35;
    const detourDiscount = shortDetourAllowance
      ? 0.45 + (1 - graceRatio) * 0.35
      : 1;
    const warningDiscount = warningEscape ? 0.25 : 1;
    const strategicUrgency = 0.75 + intent.urgency;
    const basePenalty = opposite * opposite * 120 * strategicUrgency;
    const persistencePenalty = overrunRatio * opposite * 220 * strategicUrgency;

    return (basePenalty * detourDiscount + persistencePenalty) * warningDiscount;
  }

  private selectTarget(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    targets: readonly AutoTarget[],
    nearestEnemyDistance: number,
  ): AutoTarget | undefined {
    let bestTarget: AutoTarget | undefined;
    let bestScore = 0;
    const hpRatio = this.getHpRatio(context);
    const currentWarningRisk = this.getTotalBossWarningRisk(context, player);

    for (const target of targets) {
      if (target.id === this.suppressedTargetId && this.suppressedTargetFrames > 0) {
        continue;
      }

      const targetPressure = this.getEnemyPressureAt(context, target.approachPosition, hpRatio);
      const targetWarningRisk = this.getTotalBossWarningRisk(context, target.approachPosition);

      if (currentWarningRisk > 0 && targetWarningRisk > 0) {
        continue;
      }

      if (hpRatio < 0.35 && (targetPressure > 4 || nearestEnemyDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE)) {
        continue;
      }

      const weights = this.strategyEngine.getMovementWeights();
      const targetMultiplier = target.type === 'treasure'
        ? weights.treasureMultiplier
        : weights.farmMultiplier;
      let score = target.value * targetMultiplier
        - targetPressure * weights.riskMultiplier
        - targetWarningRisk * 18;

      if (target.id === this.stickyTargetId) {
        score += AUTO_PLAYER_CONSTANTS.TARGET_STICKY_BONUS;
      }

      if (target.blocked) {
        score -= 1.2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }

    return bestTarget;
  }

  private getTargets(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    nearestEnemyDistance: number,
  ): AutoTarget[] {
    const targets: AutoTarget[] = [];
    const pickupRange = this.getPickupRange(context);

    for (const pickup of context.pickupPositions) {
      const position = new Phaser.Math.Vector2(pickup.x, pickup.y);
      const rawDistance = Phaser.Math.Distance.Between(player.x, player.y, position.x, position.y);
      const effectiveDistance = 'effectiveDistance' in pickup && pickup.effectiveDistance !== undefined
        ? pickup.effectiveDistance
        : Math.max(0, rawDistance - pickupRange);

      if (effectiveDistance > AUTO_PLAYER_CONSTANTS.PICKUP_SEEK_RADIUS) {
        continue;
      }

      const clusterScore = 'clusterScore' in pickup && pickup.clusterScore !== undefined
        ? pickup.clusterScore
        : this.getPickupClusterScore(context, pickup);
      const dangerScore = 'dangerScore' in pickup && pickup.dangerScore !== undefined
        ? pickup.dangerScore
        : this.getEnemyPressureAt(context, position, this.getHpRatio(context));
      const nearBonus = effectiveDistance <= 80 ? 8 : effectiveDistance <= 160 ? 4 : 0;
      const weights = this.strategyEngine.getMovementWeights();
      const value = (6 + clusterScore * 1.45 + nearBonus + 420 / (effectiveDistance + 80)) * weights.farmMultiplier
        - dangerScore * 0.35 * weights.riskMultiplier;
      const id = `pickup:${Math.round(pickup.x)}:${Math.round(pickup.y)}`;
      const approachPosition = this.getApproachPosition(context, player, position, pickupRange);
      const waypoint = this.getNavigationWaypoint(context, player, approachPosition, id);

      targets.push({
        id,
        type: 'pickup',
        position,
        approachPosition: waypoint ?? approachPosition,
        value,
        effectiveDistance,
        blocked: waypoint !== undefined,
      });
    }

    for (const treasure of context.treasurePositions ?? []) {
      const position = new Phaser.Math.Vector2(treasure.x, treasure.y);
      const rawDistance = Phaser.Math.Distance.Between(player.x, player.y, position.x, position.y);
      const effectiveDistance = 'effectiveDistance' in treasure && treasure.effectiveDistance !== undefined
        ? treasure.effectiveDistance
        : Math.max(0, rawDistance - pickupRange);

      if (effectiveDistance > AUTO_PLAYER_CONSTANTS.TREASURE_SEEK_RADIUS) {
        continue;
      }

      const dangerScore = 'dangerScore' in treasure && treasure.dangerScore !== undefined
        ? treasure.dangerScore
        : this.getEnemyPressureAt(context, position, this.getHpRatio(context));
      const weights = this.strategyEngine.getMovementWeights();
      const value = (18 + 900 / (effectiveDistance + 120)) * weights.treasureMultiplier
        - dangerScore * 0.55 * weights.riskMultiplier;
      const id = `treasure:${Math.round(treasure.x)}:${Math.round(treasure.y)}`;
      const approachPosition = this.getApproachPosition(context, player, position, pickupRange);
      const waypoint = this.getNavigationWaypoint(context, player, approachPosition, id);

      if (nearestEnemyDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE && dangerScore > 2) {
        continue;
      }

      targets.push({
        id,
        type: 'treasure',
        position,
        approachPosition: waypoint ?? approachPosition,
        value,
        effectiveDistance,
        blocked: waypoint !== undefined,
      });
    }

    return targets;
  }

  private getApproachPosition(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    target: Phaser.Math.Vector2,
    pickupRange: number,
  ): Phaser.Math.Vector2 {
    const safeTarget = this.getBorderSafePoint(context, target, pickupRange);

    if (!safeTarget) {
      return target.clone();
    }

    const rawDistance = Phaser.Math.Distance.Between(player.x, player.y, target.x, target.y);

    if (Math.max(0, rawDistance - pickupRange) <= 8) {
      return player.clone();
    }

    return safeTarget;
  }

  private getBorderSafePoint(
    context: AutoPlayerContext,
    target: Phaser.Math.Vector2,
    pickupRange: number,
  ): Phaser.Math.Vector2 | undefined {
    const margin = AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
    const isNearBorder = target.x < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN
      || target.y < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN
      || target.x > context.worldBounds.width - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN
      || target.y > context.worldBounds.height - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;

    if (!isNearBorder) {
      return undefined;
    }

    const safePoint = new Phaser.Math.Vector2(
      Phaser.Math.Clamp(target.x, margin, context.worldBounds.width - margin),
      Phaser.Math.Clamp(target.y, margin, context.worldBounds.height - margin),
    );
    const distanceToTarget = Phaser.Math.Distance.Between(safePoint.x, safePoint.y, target.x, target.y);

    if (pickupRange > 0 && distanceToTarget > pickupRange) {
      const towardTarget = target.clone().subtract(safePoint);

      if (towardTarget.lengthSq() > 0) {
        const allowedDistance = Math.max(0, pickupRange - 8);
        return target.clone().subtract(towardTarget.normalize().scale(allowedDistance));
      }
    }

    return safePoint;
  }

  private getNavigationWaypoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    target: Phaser.Math.Vector2,
    targetId: string,
  ): Phaser.Math.Vector2 | undefined {
    const blocker = this.getBlockingObstacle(context, player, target);

    if (!blocker) {
      return undefined;
    }

    if (
      this.stickyWaypoint
      && this.stickyWaypointTargetId === targetId
      && !this.segmentIntersectsBlockingObstacle(context, player, this.stickyWaypoint)
    ) {
      return this.stickyWaypoint.clone();
    }

    let bestWaypoint: Phaser.Math.Vector2 | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const waypoint of this.getObstacleWaypoints(blocker, context)) {
      if (this.segmentIntersectsBlockingObstacle(context, player, waypoint)) {
        continue;
      }

      const targetDistance = Phaser.Math.Distance.Between(waypoint.x, waypoint.y, target.x, target.y);
      const pressure = this.getEnemyPressureAt(context, waypoint, this.getHpRatio(context));
      const borderPenalty = this.getBorderPenalty(context, waypoint);
      const score = -targetDistance * 0.02 - pressure * 2 - borderPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestWaypoint = waypoint;
      }
    }

    this.stickyWaypoint = bestWaypoint?.clone();
    this.stickyWaypointTargetId = bestWaypoint ? targetId : undefined;
    return bestWaypoint;
  }

  private getObstacleWaypoints(
    obstacle: AutoObstacleSnapshot,
    context: AutoPlayerContext,
  ): Phaser.Math.Vector2[] {
    const margin = AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;

    if (obstacle.shape === 'circle') {
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + margin;

      return [
        new Phaser.Math.Vector2(obstacle.x - radius, obstacle.y),
        new Phaser.Math.Vector2(obstacle.x + radius, obstacle.y),
        new Phaser.Math.Vector2(obstacle.x, obstacle.y - radius),
        new Phaser.Math.Vector2(obstacle.x, obstacle.y + radius),
      ].map((point) => this.clampToSafeWorld(context, point));
    }

    const halfWidth = obstacle.width / 2 + margin;
    const halfHeight = obstacle.height / 2 + margin;

    return [
      new Phaser.Math.Vector2(obstacle.x - halfWidth, obstacle.y - halfHeight),
      new Phaser.Math.Vector2(obstacle.x + halfWidth, obstacle.y - halfHeight),
      new Phaser.Math.Vector2(obstacle.x - halfWidth, obstacle.y + halfHeight),
      new Phaser.Math.Vector2(obstacle.x + halfWidth, obstacle.y + halfHeight),
    ].map((point) => this.clampToSafeWorld(context, point));
  }

  private getDangerInfo(context: AutoPlayerContext, player: Phaser.Math.Vector2): {
    fleeDirection: Phaser.Math.Vector2;
    nearestDistance: number;
    enemyCenter: Phaser.Math.Vector2;
    pressureCount: number;
  } {
    const fleeDirection = new Phaser.Math.Vector2(0, 0);
    const enemyCenter = new Phaser.Math.Vector2(0, 0);
    let nearestDistance = Number.POSITIVE_INFINITY;
    let pressureCount = 0;
    let centerWeight = 0;

    for (const enemy of context.enemyPositions) {
      const enemyPosition = new Phaser.Math.Vector2(enemy.x, enemy.y);
      const centerDistance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      const distance = this.getEnemyEffectiveDistance(context, player, enemy);
      const threat = this.getEnemyThreatWeight(enemy);

      nearestDistance = Math.min(nearestDistance, distance);

      if (distance <= AUTO_PLAYER_CONSTANTS.DANGER_RADIUS) {
        pressureCount += 1;
        const weight = ((AUTO_PLAYER_CONSTANTS.DANGER_RADIUS - Math.max(1, distance)) / AUTO_PLAYER_CONSTANTS.DANGER_RADIUS) * threat;
        fleeDirection.x += ((player.x - enemy.x) / Math.max(1, centerDistance)) * weight;
        fleeDirection.y += ((player.y - enemy.y) / Math.max(1, centerDistance)) * weight;
        enemyCenter.add(enemyPosition.scale(weight));
        centerWeight += weight;
      }
    }

    if (fleeDirection.lengthSq() > 0) {
      fleeDirection.normalize();
    }

    if (centerWeight > 0) {
      enemyCenter.scale(1 / centerWeight);
    }

    return { fleeDirection, nearestDistance, enemyCenter, pressureCount };
  }

  private updateMovementMemory(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): MovementMemoryInfo {
    const deltaMs = Phaser.Math.Clamp(context.deltaMs ?? 16, 0, 120);
    const lastPosition = this.lastPosition?.clone() ?? player.clone();
    const recentDisplacement = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      lastPosition.x,
      lastPosition.y,
    );

    if (!this.stallAnchor) {
      this.stallAnchor = player.clone();
      this.stallMs = 0;
    }

    const anchorDistance = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      this.stallAnchor.x,
      this.stallAnchor.y,
    );

    if (anchorDistance <= AUTO_PLAYER_CONSTANTS.STALL_RADIUS) {
      this.stallMs += deltaMs;
    } else {
      this.stallAnchor = player.clone();
      this.stallMs = 0;
    }

    this.lastPosition = player.clone();

    return {
      stalled: this.stallMs >= AUTO_PLAYER_CONSTANTS.STALL_TRIGGER_MS,
      prolonged: this.stallMs >= AUTO_PLAYER_CONSTANTS.PROLONGED_STALL_MS,
      stallMs: this.stallMs,
      anchor: this.stallAnchor.clone(),
      recentDisplacement,
    };
  }

  private updateEnemyMotionSnapshots(context: AutoPlayerContext): void {
    const deltaSeconds = Math.max(0.001, Phaser.Math.Clamp(context.deltaMs ?? 16, 1, 120) / 1000);
    const nextSnapshots = new Map<string, EnemyMotionSnapshot>();

    context.enemyPositions.forEach((enemy, index) => {
      const key = this.getEnemyMotionKey(enemy, index);
      const previous = this.enemyMotionSnapshots.get(key);
      const explicitVx = 'vx' in enemy ? enemy.vx : undefined;
      const explicitVy = 'vy' in enemy ? enemy.vy : undefined;
      const vx = explicitVx ?? (previous ? (enemy.x - previous.x) / deltaSeconds : 0);
      const vy = explicitVy ?? (previous ? (enemy.y - previous.y) / deltaSeconds : 0);

      nextSnapshots.set(key, {
        x: enemy.x,
        y: enemy.y,
        vx,
        vy,
      });
    });

    this.enemyMotionSnapshots = nextSnapshots;
  }

  private getEnemyMotionKey(enemy: AutoPosition | AutoEnemySnapshot, index: number): string {
    return 'id' in enemy && enemy.id
      ? enemy.id
      : `${index}:${Math.round(enemy.x)}:${Math.round(enemy.y)}`;
  }

  private getSurroundInfo(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    movement: MovementMemoryInfo,
  ): SurroundInfo {
    const directions = this.getBaseDirections();
    const hpRatio = this.getHpRatio(context);
    let blockedSectors = 0;
    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.POSITIVE_INFINITY;

    for (const direction of directions) {
      const normalized = direction.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, player, normalized);
      const actualMove = Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y);
      const pressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
      const borderPenalty = this.getBorderPenalty(context, endpoint);
      const obstaclePenalty = this.getObstaclePenalty(context, endpoint);
      const warningRisk = this.getTotalBossWarningRisk(context, endpoint);
      const noProgressPenalty = actualMove < AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.45 ? 12 : 0;
      const sectorScore = pressure * 2.2
        + borderPenalty * 0.65
        + obstaclePenalty * 0.9
        + warningRisk * 18
        + noProgressPenalty;

      if (
        sectorScore >= AUTO_PLAYER_CONSTANTS.SURROUND_BLOCKED_SCORE
        || obstaclePenalty >= 20
        || borderPenalty >= 24
        || actualMove < AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35
      ) {
        blockedSectors += 1;
      }

      if (
        sectorScore < bestScore
        || (Math.abs(sectorScore - bestScore) < 0.01 && actualMove > 0)
      ) {
        bestScore = sectorScore;
        bestDirection = normalized;
      }
    }

    const surrounded = blockedSectors >= 6
      || (blockedSectors >= 5 && danger.pressureCount >= 3)
      || (movement.stalled && blockedSectors >= 4 && danger.nearestDistance < AUTO_PLAYER_CONSTANTS.DANGER_RADIUS);

    return {
      surrounded,
      blockedSectors,
      safestDirection: bestDirection,
      safestScore: bestScore,
    };
  }

  private getTerrainEscapeInfo(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): TerrainEscapeInfo {
    const enemySectors = this.getEnemySectorCount(context, player, AUTO_PLAYER_CONSTANTS.PRE_ENCIRCLE_RADIUS);
    const nearBorder = this.getNearestBorderDistance(context, player) < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;
    const nearObstacle = this.getNearestObstacleClearance(context, player) < AUTO_PLAYER_CONSTANTS.TERRAIN_ESCAPE_MARGIN;
    const inSlowZone = this.isInPlayerSlowZone(context, player);
    const active = enemySectors >= 4 && (nearBorder || nearObstacle || inSlowZone);
    const info: TerrainEscapeInfo = {
      active,
      direction: new Phaser.Math.Vector2(0, 0),
      enemySectors,
      nearBorder,
      nearObstacle,
      inSlowZone,
    };

    if (!active) {
      return info;
    }

    return {
      ...info,
      direction: this.getTerrainEscapeDirection(context, player, info),
    };
  }

  private getEnemySectorCount(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    radius: number,
  ): number {
    const sectors = new Set<number>();

    for (const enemy of context.enemyPositions) {
      const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);

      if (distance > radius) {
        continue;
      }

      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
      sectors.add(Math.floor(normalizedAngle / (Math.PI / 4)) % 8);
    }

    return sectors.size;
  }

  private getTerrainEscapeDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    terrain: TerrainEscapeInfo,
  ): Phaser.Math.Vector2 {
    const candidates = [
      ...this.getBaseDirections(),
      this.getSoftBorderDirection(context, player),
      this.getNearestObstacleEscapeDirection(context, player),
    ];
    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of candidates) {
      if (candidate.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, player, direction);
      const score = this.scoreTerrainEscapeEndpoint(context, player, endpoint, direction, terrain)
        - this.getEnemyContactRiskAt(context, endpoint, this.getHpRatio(context)) * 0.12
        - this.getEnemyPathContactRisk(context, player, endpoint, this.getHpRatio(context)) * 0.10;

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    return bestDirection;
  }

  private getTerrainEscapeCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    terrain: TerrainEscapeInfo,
  ): number {
    if (!terrain.active) {
      return 0;
    }

    let score = this.scoreTerrainEscapeEndpoint(context, player, endpoint, direction, terrain);

    if (terrain.direction.lengthSq() > 0) {
      score += Math.max(0, direction.dot(terrain.direction)) * 34;
    }

    if (this.getEnemyContactRiskAt(context, endpoint, this.getHpRatio(context)) > 0) {
      score -= 18;
    }

    return score;
  }

  private scoreTerrainEscapeEndpoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    terrain: TerrainEscapeInfo,
  ): number {
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const currentObstacleClearance = this.getNearestObstacleClearance(context, player);
    const endpointObstacleClearance = this.getNearestObstacleClearance(context, endpoint);
    let score = 0;

    if (terrain.nearBorder) {
      score += Math.max(0, endpointBorderDistance - currentBorderDistance) * 0.42;

      if (endpointBorderDistance <= currentBorderDistance + 2) {
        score -= 26;
      }
    }

    if (terrain.nearObstacle) {
      score += Math.max(0, endpointObstacleClearance - currentObstacleClearance) * 0.36;

      if (endpointObstacleClearance <= currentObstacleClearance + 2) {
        score -= 24;
      }
    }

    if (terrain.inSlowZone) {
      const currentInSlowZone = this.isInPlayerSlowZone(context, player);
      const endpointInSlowZone = this.isInPlayerSlowZone(context, endpoint);

      if (currentInSlowZone && !endpointInSlowZone) {
        score += 42;
      } else if (endpointInSlowZone) {
        score -= 18;
      }
    }

    score += terrain.enemySectors * 2.5;

    if (direction.lengthSq() === 0) {
      score -= 20;
    }

    return score;
  }

  private getNearestObstacleEscapeDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    let nearestObstacle: AutoObstacleSnapshot | undefined;
    let nearestClearance = Number.POSITIVE_INFINITY;

    for (const obstacle of context.map?.obstacles ?? []) {
      if (!obstacle.blocksPlayer) {
        continue;
      }

      const clearance = this.getObstacleClearanceAt(player, obstacle);

      if (clearance < nearestClearance) {
        nearestClearance = clearance;
        nearestObstacle = obstacle;
      }
    }

    if (!nearestObstacle || nearestClearance >= AUTO_PLAYER_CONSTANTS.TERRAIN_ESCAPE_MARGIN) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const direction = player.clone().subtract(new Phaser.Math.Vector2(nearestObstacle.x, nearestObstacle.y));

    if (direction.lengthSq() === 0) {
      return new Phaser.Math.Vector2(1, 0);
    }

    return direction.normalize();
  }

  private getObstacleClearanceAt(point: Phaser.Math.Vector2, obstacle: AutoObstacleSnapshot): number {
    if (obstacle.shape === 'circle') {
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
      return Math.max(0, Phaser.Math.Distance.Between(point.x, point.y, obstacle.x, obstacle.y) - radius);
    }

    const dx = Math.max(Math.abs(point.x - obstacle.x) - obstacle.width / 2 - AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN, 0);
    const dy = Math.max(Math.abs(point.y - obstacle.y) - obstacle.height / 2 - AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN, 0);

    return Math.hypot(dx, dy);
  }

  private isInPlayerSlowZone(context: AutoPlayerContext, point: Phaser.Math.Vector2): boolean {
    return (context.map?.slowZones ?? []).some((zone) => (
      zone.playerSpeedMultiplier < 1 && this.isPointInZone(point, zone)
    ));
  }

  private getBreakoutDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
  ): Phaser.Math.Vector2 {
    const shouldBreakout = surround.surrounded
      || (movement.stalled && danger.nearestDistance < AUTO_PLAYER_CONSTANTS.DANGER_RADIUS)
      || movement.prolonged;

    if (!shouldBreakout) {
      return new Phaser.Math.Vector2(0, 0);
    }

    if (kite.active && this.isKiteDirectionViable(context, player, kite.direction, kite)) {
      return kite.direction.clone();
    }

    if (
      this.stickyBreakoutDirection
      && this.stickyBreakoutFrames > 0
      && this.isBreakoutDirectionViable(context, player, this.stickyBreakoutDirection)
    ) {
      return this.stickyBreakoutDirection.clone();
    }

    return surround.safestDirection.lengthSq() > 0
      ? surround.safestDirection.clone().normalize()
      : this.getSoftBorderDirection(context, player);
  }

  private getKiteInfo(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
  ): KiteInfo {
    const hpRatio = this.getHpRatio(context);
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const inwardDirection = this.getSoftBorderDirection(context, player);
    const nearBorder = this.getNearestBorderDistance(context, player) < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;
    const nearCorner = this.isNearCorner(context, player, AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN);
    const enemyCountPressure = context.enemyPositions.length >= 12 && danger.nearestDistance < AUTO_PLAYER_CONSTANTS.DANGER_RADIUS;
    const moveSpeed = Math.max(80, context.player?.moveSpeed ?? 120);
    const highSpeedClusterShaping = moveSpeed >= 170
      && context.enemyPositions.length >= 4
      && danger.nearestDistance < AUTO_PLAYER_CONSTANTS.DANGER_RADIUS + 80
      && danger.nearestDistance > AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS * 0.85;
    const highPressure = currentPressure >= (hpRatio < 0.5 ? 3.6 : 4.6)
      || danger.pressureCount >= 6
      || enemyCountPressure
      || highSpeedClusterShaping
      || surround.surrounded
      || (movement.stalled && danger.pressureCount >= 3);

    if (!highPressure) {
      return {
        active: false,
        direction: new Phaser.Math.Vector2(0, 0),
        inwardDirection,
        currentPressure,
        nearBorder,
        nearCorner,
      };
    }

    const direction = this.getKiteDirection(context, player, danger, inwardDirection, nearBorder, nearCorner);

    return {
      active: direction.lengthSq() > 0,
      direction,
      inwardDirection,
      currentPressure,
      nearBorder,
      nearCorner,
    };
  }

  private getKiteDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    inwardDirection: Phaser.Math.Vector2,
    nearBorder: boolean,
    nearCorner: boolean,
  ): Phaser.Math.Vector2 {
    const seed = danger.enemyCenter.lengthSq() > 0
      ? player.clone().subtract(danger.enemyCenter)
      : danger.fleeDirection.clone();

    if (seed.lengthSq() === 0) {
      return inwardDirection.lengthSq() > 0
        ? inwardDirection.clone()
        : new Phaser.Math.Vector2(0, 0);
    }

    const radial = seed.normalize();
    const tangents = [
      new Phaser.Math.Vector2(-radial.y, radial.x),
      new Phaser.Math.Vector2(radial.y, -radial.x),
    ];
    const options: Phaser.Math.Vector2[] = [];

    if (
      this.stickyKiteDirection
      && this.stickyKiteFrames > 0
    ) {
      options.push(this.stickyKiteDirection.clone());
    }

    for (const tangent of tangents) {
      options.push(tangent.clone());

      if (inwardDirection.lengthSq() > 0 && nearBorder) {
        options.push(tangent.clone().scale(0.78).add(inwardDirection.clone().scale(nearCorner ? 0.92 : 0.62)));
      }
    }

    if (inwardDirection.lengthSq() > 0 && nearCorner) {
      options.push(inwardDirection.clone());
    }

    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const option of options) {
      if (option.lengthSq() === 0) {
        continue;
      }

      const direction = option.clone().normalize();
      const kite = {
        active: true,
        direction,
        inwardDirection,
        currentPressure: this.getEnemyPressureAt(context, player, this.getHpRatio(context)),
        nearBorder,
        nearCorner,
      };
      const score = this.scoreKiteDirection(context, player, direction, kite);

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    return bestDirection;
  }

  private scoreKiteDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    kite: KiteInfo,
  ): number {
    const hpRatio = this.getHpRatio(context);
    const endpoint = this.getCandidateEndpoint(context, player, direction);
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const borderProgress = endpointBorderDistance - currentBorderDistance;
    const actualMove = Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y);
    let score = 0;

    score -= endpointPressure * 4.4;
    score -= this.getObstaclePenalty(context, endpoint) * 3.2;
    score -= this.getTotalBossWarningRisk(context, endpoint) * 90;
    score -= this.getBorderPenalty(context, endpoint) * (kite.nearBorder ? 5.2 : 2.6);
    score += Math.max(0, borderProgress) * (kite.nearBorder ? 0.72 : 0.22);
    score += Math.max(0, actualMove - AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35) * 0.08;

    if (kite.nearBorder && borderProgress <= 2) {
      score -= 24;
    }

    if (kite.nearCorner && borderProgress <= 8) {
      score -= 22;
    }

    if (this.isNearCorner(context, endpoint, AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN)) {
      score -= 28;
    }

    if (this.stickyKiteDirection && this.stickyKiteFrames > 0) {
      score += Math.max(0, direction.dot(this.stickyKiteDirection)) * 10;
    }

    if (kite.inwardDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(kite.inwardDirection)) * (kite.nearBorder ? 22 : 6);
    }

    return score;
  }

  private isKiteDirectionViable(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    kite: KiteInfo,
  ): boolean {
    if (direction.lengthSq() === 0) {
      return false;
    }

    const endpoint = this.getCandidateEndpoint(context, player, direction);
    const actualMove = Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y);
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);

    if (actualMove < AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35) {
      return false;
    }

    if (this.getObstaclePenalty(context, endpoint) >= 20 || this.getTotalBossWarningRisk(context, endpoint) > 0) {
      return false;
    }

    if (endpointBorderDistance < AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN + 12) {
      return false;
    }

    if (kite.nearBorder && endpointBorderDistance <= currentBorderDistance + 2) {
      return false;
    }

    return true;
  }

  private isBreakoutDirectionViable(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
  ): boolean {
    const endpoint = this.getCandidateEndpoint(context, player, direction);

    return this.getObstaclePenalty(context, endpoint) < 20
      && this.getBorderPenalty(context, endpoint) < 30
      && Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y)
        >= AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35;
  }

  private getWeaponDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): Phaser.Math.Vector2 {
    const weapons = this.getWeaponSnapshots(context);
    const direction = new Phaser.Math.Vector2(0, 0);
    const towardEnemies = danger.enemyCenter.clone().subtract(player);

    for (const weapon of weapons) {
      const weight = this.getWeaponLevelWeight(weapon);

      if (weapon.tags.includes('aura')) {
        direction.add(this.getDistanceBandDirection(towardEnemies, danger.nearestDistance, weapon.radiusPx ?? 130).scale(weight));
      } else if (weapon.tags.includes('orbit')) {
        direction.add(this.getOrbitDirection(towardEnemies, danger.nearestDistance, weapon.radiusPx ?? 155).scale(weight));
      } else if (weapon.tags.includes('homing') || weapon.tags.includes('magic')) {
        direction.add(danger.fleeDirection.clone().scale(0.45 * weight));
      } else if (weapon.tags.includes('arcing')) {
        direction.add(this.getOrbitDirection(towardEnemies, danger.nearestDistance, 220).scale(weight));
      } else if (weapon.tags.includes('projectile') || weapon.baseWeaponId === 'knife') {
        direction.add(danger.fleeDirection.clone().scale(0.75 * weight));
        direction.add(new Phaser.Math.Vector2(-towardEnemies.y, towardEnemies.x).normalize().scale(0.35 * weight));
      }
    }

    return direction.lengthSq() > 0 ? direction.normalize() : direction;
  }

  private getWeaponCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): number {
    const weapons = this.getWeaponSnapshots(context);
    let score = 0;

    for (const weapon of weapons) {
      const weight = this.getWeaponLevelWeight(weapon);
      const distance = danger.enemyCenter.lengthSq() > 0
        ? Phaser.Math.Distance.Between(endpoint.x, endpoint.y, danger.enemyCenter.x, danger.enemyCenter.y)
        : Number.POSITIVE_INFINITY;

      if (weapon.tags.includes('aura')) {
        score += this.scoreDistanceBand(distance, weapon.radiusPx ?? 130, 0.55, 1.3) * weight;
      } else if (weapon.tags.includes('orbit')) {
        score += this.scoreDistanceBand(distance, weapon.radiusPx ?? 155, 0.7, 1.45) * weight;
      } else if (weapon.tags.includes('projectile') || weapon.baseWeaponId === 'knife') {
        score += direction.dot(danger.fleeDirection) * 2.4 * weight;
      } else if (weapon.tags.includes('homing') || weapon.tags.includes('magic')) {
        score += direction.dot(danger.fleeDirection) * 1.2 * weight;
      }
    }

    if (context.player?.damageReactionType === 'slowTrail' && danger.enemyCenter.lengthSq() > 0) {
      const towardEnemies = danger.enemyCenter.clone().subtract(player);
      if (towardEnemies.lengthSq() > 0) {
        const tangent = new Phaser.Math.Vector2(-towardEnemies.y, towardEnemies.x).normalize();
        score += Math.abs(direction.dot(tangent)) * 2.2;
      }
    }

    return score;
  }

  private evaluateWeaponEffectivePosition(
    context: AutoPlayerContext,
    position: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): number {
    const weapons = this.getWeaponSnapshots(context);

    if (weapons.length === 0 || context.enemyPositions.length === 0) {
      return 0;
    }

    let score = 0;

    for (const weapon of weapons) {
      const weight = this.getWeaponLevelWeight(weapon);
      const range = this.getSingleWeaponEffectiveRange(weapon);
      let enemiesInBand = 0;
      let closePenalty = 0;

      for (const enemy of context.enemyPositions) {
        const distance = this.getEnemyEffectiveDistance(context, position, enemy);

        if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
          closePenalty += this.getEnemyThreatWeight(enemy);
          continue;
        }

        if (distance >= range.min && distance <= range.max) {
          enemiesInBand += this.getEnemyThreatWeight(enemy);
        }
      }

      const centerDistance = danger.enemyCenter.lengthSq() > 0
        ? Phaser.Math.Distance.Between(position.x, position.y, danger.enemyCenter.x, danger.enemyCenter.y)
        : Number.POSITIVE_INFINITY;
      const bandScore = this.scoreDistanceBand(centerDistance, range.ideal, range.min / range.ideal, range.max / range.ideal);
      const weaponTypeBonus = weapon.tags.includes('homing') || weapon.tags.includes('magic')
        ? Math.min(4, enemiesInBand * 0.42)
        : enemiesInBand * 0.72;

      score += (bandScore * 3 + weaponTypeBonus - closePenalty * 4.5) * weight;
    }

    return score / Math.max(1, weapons.length);
  }

  private getWeaponEffectiveRange(context: AutoPlayerContext): { min: number; ideal: number; max: number } {
    const weapons = this.getWeaponSnapshots(context);

    if (weapons.length === 0) {
      return { min: 130, ideal: 230, max: 360 };
    }

    let totalWeight = 0;
    let min = 0;
    let ideal = 0;
    let max = 0;

    for (const weapon of weapons) {
      const weight = this.getWeaponLevelWeight(weapon);
      const range = this.getSingleWeaponEffectiveRange(weapon);

      totalWeight += weight;
      min += range.min * weight;
      ideal += range.ideal * weight;
      max += range.max * weight;
    }

    if (totalWeight <= 0) {
      return { min: 130, ideal: 230, max: 360 };
    }

    return {
      min: min / totalWeight,
      ideal: ideal / totalWeight,
      max: max / totalWeight,
    };
  }

  private getSingleWeaponEffectiveRange(weapon: AutoWeaponSnapshot): { min: number; ideal: number; max: number } {
    if (weapon.tags.includes('aura')) {
      const radius = weapon.radiusPx ?? 130;

      return { min: radius * 0.58, ideal: radius * 1.02, max: radius * 1.42 };
    }

    if (weapon.tags.includes('orbit')) {
      const radius = weapon.radiusPx ?? 155;

      return { min: radius * 0.72, ideal: radius * 1.08, max: radius * 1.55 };
    }

    if (weapon.tags.includes('arcing')) {
      const range = weapon.rangePx ?? 260;

      return { min: 145, ideal: Math.max(220, range * 0.9), max: Math.max(330, range * 1.35) };
    }

    if (weapon.tags.includes('homing') || weapon.tags.includes('magic')) {
      const range = weapon.rangePx ?? 320;

      return { min: 150, ideal: Math.max(240, range * 0.82), max: Math.max(380, range * 1.45) };
    }

    const range = weapon.rangePx ?? 360;

    return { min: 160, ideal: Math.max(260, range * 0.75), max: Math.max(420, range * 1.25) };
  }

  private getDistanceBandDirection(
    towardEnemies: Phaser.Math.Vector2,
    nearestEnemyDistance: number,
    idealDistance: number,
  ): Phaser.Math.Vector2 {
    if (towardEnemies.lengthSq() === 0 || nearestEnemyDistance === Number.POSITIVE_INFINITY) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const normalized = towardEnemies.clone().normalize();
    const tangent = new Phaser.Math.Vector2(-normalized.y, normalized.x);

    if (nearestEnemyDistance < idealDistance * 0.6) {
      return normalized.scale(-1);
    }

    if (nearestEnemyDistance > idealDistance * 1.35) {
      return normalized;
    }

    return tangent.add(normalized.scale(nearestEnemyDistance < idealDistance ? -0.2 : 0.2)).normalize();
  }

  private getOrbitDirection(
    towardEnemies: Phaser.Math.Vector2,
    nearestEnemyDistance: number,
    idealDistance: number,
  ): Phaser.Math.Vector2 {
    return this.getDistanceBandDirection(towardEnemies, nearestEnemyDistance, idealDistance);
  }

  private scoreDistanceBand(distance: number, idealDistance: number, nearRatio: number, farRatio: number): number {
    if (!Number.isFinite(distance)) {
      return 0;
    }

    if (distance < idealDistance * nearRatio) {
      return -3.5;
    }

    if (distance > idealDistance * farRatio) {
      return -1.2;
    }

    return 3 - Math.abs(distance - idealDistance) / Math.max(1, idealDistance);
  }

  private getWeaponSnapshots(context: AutoPlayerContext): AutoWeaponSnapshot[] {
    if (context.weaponContext?.weapons?.length) {
      return [...context.weaponContext.weapons];
    }

    return (context.weaponContext?.weaponIds ?? []).map((weaponId) => ({
      weaponId,
      baseWeaponId: weaponId,
      level: 1,
      maxLevel: 1,
      tags: this.getFallbackWeaponTags(weaponId),
      radiusPx: weaponId === 'garlic'
        ? context.weaponContext?.garlicRadiusPx
        : weaponId === 'bible'
          ? context.weaponContext?.bibleRadiusPx
          : undefined,
    }));
  }

  private getFallbackWeaponTags(weaponId: string): WeaponTag[] {
    switch (weaponId) {
      case 'garlic':
      case 'soul_eater':
        return ['aura'];
      case 'bible':
      case 'unholy_vespers':
        return ['orbit'];
      case 'magic_wand':
      case 'holy_wand':
        return ['projectile', 'homing', 'magic'];
      case 'axe':
      case 'death_spiral':
        return ['projectile', 'arcing'];
      default:
        return ['projectile'];
    }
  }

  private getWeaponLevelWeight(weapon: AutoWeaponSnapshot): number {
    const maxLevel = Math.max(1, weapon.maxLevel);
    const ratio = Phaser.Math.Clamp(weapon.level / maxLevel, 0, 1);

    return 0.55 + ratio * 0.85 + (weapon.tags.includes('evolved') ? 0.35 : 0);
  }

  private getEnemyPressureAt(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let pressure = 0;

    for (const enemy of context.enemyPositions) {
      const distance = this.getEnemyEffectiveDistance(context, point, enemy);

      if (distance > AUTO_PLAYER_CONSTANTS.DANGER_RADIUS) {
        continue;
      }

      const proximity = (AUTO_PLAYER_CONSTANTS.DANGER_RADIUS - Math.max(0, distance)) / AUTO_PLAYER_CONSTANTS.DANGER_RADIUS;
      const threat = this.getEnemyThreatWeight(enemy);
      const farMultiplier = distance > AUTO_PLAYER_CONSTANTS.SAFE_DISTANCE ? 0.32 : 1;
      let enemyPressure = proximity * proximity * threat * farMultiplier;

      if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        const contactProximity = (AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS - Math.max(0, distance))
          / AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS;
        enemyPressure += contactProximity * contactProximity * 7.5 * threat;
      }

      if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS) {
        const dangerProximity = (AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS - Math.max(0, distance))
          / AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS;
        enemyPressure += (5 + dangerProximity * dangerProximity * 14) * threat;
      }

      pressure += enemyPressure * (hpRatio < 0.5 ? 1.25 : 1);
    }

    return pressure;
  }

  private getEnemyContactRiskAt(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let risk = 0;

    for (const enemy of context.enemyPositions) {
      const distance = this.getEnemyEffectiveDistance(context, point, enemy);

      if (distance > AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const warningProximity = (AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS - Math.max(0, distance))
        / AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS;
      risk += warningProximity * warningProximity * 52 * threat;

      if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS) {
        const dangerProximity = (AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS - Math.max(0, distance))
          / AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS;
        risk += (96 + dangerProximity * 150) * threat;
      }
    }

    return risk * (hpRatio < 0.5 ? 1.35 : 1);
  }

  private getEnemyFutureContactRiskAt(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let risk = 0;
    const predictSeconds = hpRatio < 0.5 ? 0.65 : 0.45;

    for (const [index, enemy] of context.enemyPositions.entries()) {
      const velocityX = 'vx' in enemy ? enemy.vx ?? 0 : 0;
      const velocityY = 'vy' in enemy ? enemy.vy ?? 0 : 0;
      const inferredMotion = this.enemyMotionSnapshots.get(this.getEnemyMotionKey(enemy, index));
      const predictedVx = velocityX || inferredMotion?.vx || 0;
      const predictedVy = velocityY || inferredMotion?.vy || 0;

      if (predictedVx === 0 && predictedVy === 0) {
        continue;
      }

      const futureX = enemy.x + predictedVx * predictSeconds;
      const futureY = enemy.y + predictedVy * predictSeconds;
      const distance = this.getEnemyEffectiveDistance(context, point, enemy, futureX, futureY);

      if (distance > AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const proximity = (AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS - Math.max(0, distance))
        / AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS;
      risk += proximity * proximity * 36 * threat;

      if (distance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS) {
        risk += 48 * threat;
      }
    }

    return risk * (hpRatio < 0.5 ? 1.25 : 1);
  }

  private getEnemyPathContactRisk(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let risk = 0;

    for (const enemy of context.enemyPositions) {
      const enemyPosition = new Phaser.Math.Vector2(enemy.x, enemy.y);
      const currentDistance = this.getEnemyEffectiveDistance(context, start, enemy);
      const endpointDistance = this.getEnemyEffectiveDistance(context, end, enemy);
      const pathInfo = this.getSegmentPointInfo(start, end, enemyPosition);
      const pathDistance = this.getEnemyEffectivePathDistance(context, pathInfo.distance, enemy);

      if (pathDistance > AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const proximity = (AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS - Math.max(0, pathDistance))
        / AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS;
      const movingAway = endpointDistance >= currentDistance + 8;
      const crossingMidPath = pathInfo.t > 0.12 && pathInfo.t < 0.88;
      const escapingStartContact = movingAway
        && pathInfo.t <= 0.12
        && currentDistance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS;
      const approachMultiplier = endpointDistance < currentDistance - 8
        ? 1
        : escapingStartContact
          ? 0.28
          : crossingMidPath
            ? 1.25
            : 0.55;
      risk += proximity * proximity * 86 * threat * approachMultiplier;

      if (pathDistance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS) {
        risk += (crossingMidPath ? 112 : 62) * threat * approachMultiplier;
      }
    }

    return risk * (hpRatio < 0.5 ? 1.3 : 1);
  }

  private getEnemyPathClearanceScore(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let nearestPathDistance = Number.POSITIVE_INFINITY;
    let nearbyEnemies = 0;
    let dangerCrossings = 0;

    for (const enemy of context.enemyPositions) {
      const enemyPosition = new Phaser.Math.Vector2(enemy.x, enemy.y);
      const startDistance = this.getEnemyEffectiveDistance(context, start, enemy);
      const endDistance = this.getEnemyEffectiveDistance(context, end, enemy);

      if (Math.min(startDistance, endDistance) > AUTO_PLAYER_CONSTANTS.DANGER_RADIUS + AUTO_PLAYER_CONSTANTS.STEP_DISTANCE) {
        continue;
      }

      const pathInfo = this.getSegmentPointInfo(start, end, enemyPosition);
      const pathDistance = this.getEnemyEffectivePathDistance(context, pathInfo.distance, enemy);

      if (pathDistance > AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
        continue;
      }

      nearbyEnemies += 1;
      nearestPathDistance = Math.min(nearestPathDistance, pathDistance);

      if (pathInfo.t > 0.12 && pathInfo.t < 0.88 && pathDistance < AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS) {
        dangerCrossings += 1;
      }
    }

    if (nearbyEnemies === 0 || !Number.isFinite(nearestPathDistance)) {
      return 0;
    }

    const pressureMultiplier = nearbyEnemies >= 3 || hpRatio < 0.5 ? 1.35 : 1;

    if (dangerCrossings > 0) {
      return -36 * dangerCrossings * pressureMultiplier;
    }

    if (nearestPathDistance < AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS) {
      const narrowness = (AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS - nearestPathDistance)
        / AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS;

      return -18 * narrowness * pressureMultiplier;
    }

    const openRatio = Phaser.Math.Clamp(
      (nearestPathDistance - AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS)
        / Math.max(1, AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS - AUTO_PLAYER_CONSTANTS.CONTACT_PATH_RADIUS),
      0,
      1,
    );

    return openRatio * (nearbyEnemies >= 2 ? 18 : 8) * pressureMultiplier;
  }

  private getEnemyApproachPenalty(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    const currentDistance = this.getNearestEnemyDistanceAt(context, start);
    const endpointDistance = this.getNearestEnemyDistanceAt(context, end);

    if (!Number.isFinite(currentDistance) || !Number.isFinite(endpointDistance)) {
      return 0;
    }

    const approach = currentDistance - endpointDistance;

    if (approach <= 8) {
      return 0;
    }

    let penalty = Math.max(0, approach - 8) * 0.45;

    if (endpointDistance < AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS) {
      penalty += (AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS - endpointDistance) * 1.15;
    }

    if (endpointDistance < AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS) {
      penalty += (AUTO_PLAYER_CONSTANTS.CONTACT_DANGER_RADIUS - endpointDistance) * 3.1 + 86;
    }

    return penalty * (hpRatio < 0.5 ? 1.3 : 1);
  }

  private getSafeEnemyDistanceScore(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
  ): number {
    const currentDistance = this.getNearestEnemyDistanceAt(context, start);
    const endpointDistance = this.getNearestEnemyDistanceAt(context, end);

    if (!Number.isFinite(currentDistance) || !Number.isFinite(endpointDistance)) {
      return 0;
    }

    const safeMin = AUTO_PLAYER_CONSTANTS.CONTACT_WARNING_RADIUS + 26;
    const safeMax = AUTO_PLAYER_CONSTANTS.SAFE_DISTANCE;
    const idealDistance = (safeMin + safeMax) / 2;
    let score = 0;

    if (endpointDistance >= safeMin && endpointDistance <= safeMax) {
      score += 12 - Math.abs(endpointDistance - idealDistance) * 0.06;
    }

    if (currentDistance > safeMax && endpointDistance > safeMin) {
      score += Math.max(0, currentDistance - endpointDistance) * 0.18;
      score -= Math.max(0, endpointDistance - currentDistance) * 0.28;
    }

    if (currentDistance >= safeMin && currentDistance <= safeMax && endpointDistance > safeMax) {
      score -= (endpointDistance - safeMax) * 0.24 + 8;
    }

    return score;
  }

  private getNearestEnemyDistanceAt(context: AutoPlayerContext, point: Phaser.Math.Vector2): number {
    let nearest = Number.POSITIVE_INFINITY;

    for (const enemy of context.enemyPositions) {
      nearest = Math.min(nearest, this.getEnemyEffectiveDistance(context, point, enemy));
    }

    return nearest;
  }

  private getPlayerCollisionRadius(context: AutoPlayerContext): number {
    const snapshotRadius = context.player?.hitRadiusPx ?? context.player?.radiusPx;

    if (snapshotRadius !== undefined && Number.isFinite(snapshotRadius) && snapshotRadius > 0) {
      return snapshotRadius;
    }

    const positionRadius = (context.playerPosition as AutoPosition & { radius?: number }).radius;

    return positionRadius !== undefined && Number.isFinite(positionRadius) && positionRadius > 0
      ? Math.max(positionRadius, AUTO_PLAYER_CONSTANTS.DEFAULT_PLAYER_COLLISION_RADIUS)
      : AUTO_PLAYER_CONSTANTS.DEFAULT_PLAYER_COLLISION_RADIUS;
  }

  private getEnemyCollisionRadius(enemy: AutoPosition | AutoEnemySnapshot): number {
    const radius = 'radiusPx' in enemy ? enemy.radiusPx : undefined;

    return radius !== undefined && Number.isFinite(radius) && radius > 0
      ? radius
      : AUTO_PLAYER_CONSTANTS.DEFAULT_ENEMY_COLLISION_RADIUS;
  }

  private getEnemyCombinedCollisionRadius(
    context: AutoPlayerContext,
    enemy: AutoPosition | AutoEnemySnapshot,
  ): number {
    return this.getPlayerCollisionRadius(context) + this.getEnemyCollisionRadius(enemy);
  }

  private getEnemyEffectiveDistance(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    enemy: AutoPosition | AutoEnemySnapshot,
    enemyX = enemy.x,
    enemyY = enemy.y,
  ): number {
    const centerDistance = Phaser.Math.Distance.Between(point.x, point.y, enemyX, enemyY);

    return Math.max(0, centerDistance - this.getEnemyCombinedCollisionRadius(context, enemy));
  }

  private getEnemyEffectivePathDistance(
    context: AutoPlayerContext,
    centerPathDistance: number,
    enemy: AutoPosition | AutoEnemySnapshot,
  ): number {
    return Math.max(0, centerPathDistance - this.getEnemyCombinedCollisionRadius(context, enemy));
  }

  private getEnemyThreatWeight(enemy: AutoPosition | AutoEnemySnapshot): number {
    let weight = 1;

    if ('isBoss' in enemy && enemy.isBoss) {
      weight += 3.2;
    } else if ('isMiniBoss' in enemy && enemy.isMiniBoss) {
      weight += 1.35;
    } else if ('isElite' in enemy && enemy.isElite) {
      weight += 1;
    }

    if ('damage' in enemy && enemy.damage !== undefined) {
      weight += Math.min(2.5, Math.max(0, enemy.damage) / 18);
    }

    if ('hpRatio' in enemy && enemy.hpRatio !== undefined && enemy.hpRatio > 0.75) {
      weight += 0.25;
    }

    return weight;
  }

  private getSlowZoneScore(
    context: AutoPlayerContext,
    endpoint: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let score = 0;

    for (const zone of context.map?.slowZones ?? []) {
      if (!this.isPointInZone(endpoint, zone)) {
        continue;
      }

      if (hpRatio < 0.45) {
        score -= (1 - zone.playerSpeedMultiplier) * 7;
      } else if (zone.enemySpeedMultiplier < zone.playerSpeedMultiplier) {
        score += (zone.playerSpeedMultiplier - zone.enemySpeedMultiplier) * 4;
      } else {
        score -= (1 - zone.playerSpeedMultiplier) * 2;
      }
    }

    return score;
  }

  private getPortalScore(
    context: AutoPlayerContext,
    endpoint: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    let score = 0;

    for (const portal of context.map?.portals ?? []) {
      if (!this.isPortalUsable(portal)) {
        continue;
      }

      if (Phaser.Math.Distance.Between(endpoint.x, endpoint.y, portal.x, portal.y) > portal.radius) {
        continue;
      }

      const targetPoint = new Phaser.Math.Vector2(portal.target.x, portal.target.y);
      const exitPressure = this.getEnemyPressureAt(context, targetPoint, hpRatio);
      const currentPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);

      score += exitPressure < currentPressure ? 5 + (currentPressure - exitPressure) : -7 - exitPressure;
      if (hpRatio < 0.4 && exitPressure < 2) {
        score += 4;
      }
    }

    return score;
  }

  private getPortalEscapeDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): Phaser.Math.Vector2 {
    const hpRatio = this.getHpRatio(context);

    if (!this.isPortalEscapeState(context, player, danger, hpRatio)) {
      return new Phaser.Math.Vector2(0, 0);
    }

    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const portal of context.map?.portals ?? []) {
      if (!this.isPortalUsable(portal)) {
        continue;
      }

      const portalPoint = new Phaser.Math.Vector2(portal.x, portal.y);
      const distance = Phaser.Math.Distance.Between(player.x, player.y, portal.x, portal.y);

      if (distance <= portal.radius) {
        continue;
      }

      if (distance > portal.radius + AUTO_PLAYER_CONSTANTS.PORTAL_ESCAPE_SEEK_RADIUS) {
        continue;
      }

      const exitPoint = new Phaser.Math.Vector2(portal.target.x, portal.target.y);
      const currentRisk = this.getPortalEscapeRiskAt(context, player, hpRatio);
      const exitRisk = this.getPortalEscapeRiskAt(context, exitPoint, hpRatio);

      if (!this.isPortalExitUseful(currentRisk, exitRisk, hpRatio)) {
        continue;
      }

      const direction = portalPoint.subtract(player);

      if (direction.lengthSq() === 0) {
        continue;
      }

      const score = (currentRisk - exitRisk) * 5
        + Math.max(0, AUTO_PLAYER_CONSTANTS.PORTAL_ESCAPE_SEEK_RADIUS - Math.max(0, distance - portal.radius)) * 0.035
        + (hpRatio < 0.35 ? 8 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction.normalize();
      }
    }

    return bestDirection;
  }

  private getPortalEscapeCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    hpRatio: number,
  ): number {
    if (!this.isPortalEscapeState(context, player, danger, hpRatio)) {
      return 0;
    }

    let score = 0;
    const currentRisk = this.getPortalEscapeRiskAt(context, player, hpRatio);

    for (const portal of context.map?.portals ?? []) {
      if (!this.isPortalUsable(portal)) {
        continue;
      }

      const playerDistance = Phaser.Math.Distance.Between(player.x, player.y, portal.x, portal.y);

      if (playerDistance > portal.radius + AUTO_PLAYER_CONSTANTS.PORTAL_ESCAPE_SEEK_RADIUS) {
        continue;
      }

      const exitPoint = new Phaser.Math.Vector2(portal.target.x, portal.target.y);
      const exitRisk = this.getPortalEscapeRiskAt(context, exitPoint, hpRatio);

      if (!this.isPortalExitUseful(currentRisk, exitRisk, hpRatio)) {
        continue;
      }

      const endpointDistance = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, portal.x, portal.y);
      const progress = playerDistance - endpointDistance;

      if (endpointDistance <= portal.radius) {
        score += 84 + Math.max(0, currentRisk - exitRisk) * 7 + (hpRatio < 0.35 ? 28 : 0);
      } else {
        score += Math.max(0, progress) * 0.16 + (hpRatio < 0.35 && progress > 0 ? 6 : 0);

        if (progress < -8) {
          score -= 5;
        }
      }
    }

    return score;
  }

  private isUsefulPortalEndpoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    hpRatio: number,
  ): boolean {
    if (!this.isPortalEscapeState(context, player, danger, hpRatio)) {
      return false;
    }

    const currentRisk = this.getPortalEscapeRiskAt(context, player, hpRatio);

    for (const portal of context.map?.portals ?? []) {
      if (!this.isPortalUsable(portal)) {
        continue;
      }

      const playerDistance = Phaser.Math.Distance.Between(player.x, player.y, portal.x, portal.y);
      const endpointDistance = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, portal.x, portal.y);

      if (
        endpointDistance > portal.radius
        || playerDistance > portal.radius + AUTO_PLAYER_CONSTANTS.PORTAL_ESCAPE_SEEK_RADIUS
      ) {
        continue;
      }

      const exitPoint = new Phaser.Math.Vector2(portal.target.x, portal.target.y);
      const exitRisk = this.getPortalEscapeRiskAt(context, exitPoint, hpRatio);

      if (this.isPortalExitUseful(currentRisk, exitRisk, hpRatio)) {
        return true;
      }
    }

    return false;
  }

  private isPortalEscapeState(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    hpRatio: number,
  ): boolean {
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);

    return hpRatio < 0.45
      || danger.nearestDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE
      || danger.pressureCount >= 4
      || currentPressure >= 5
      || this.getTotalBossWarningRisk(context, player) > 0;
  }

  private isPortalExitUseful(currentRisk: number, exitRisk: number, hpRatio: number): boolean {
    if (exitRisk <= currentRisk) {
      return true;
    }

    return hpRatio < 0.35 && exitRisk <= 2.2;
  }

  private getPortalEscapeRiskAt(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    hpRatio: number,
  ): number {
    return this.getEnemyPressureAt(context, point, hpRatio)
      + this.getTotalBossWarningRisk(context, point) * 7;
  }

  private isPortalUsable(portal: AutoPortalSnapshot): portal is AutoPortalSnapshot & { target: AutoPosition } {
    return !!portal.target
      && portal.isAvailable !== false
      && (portal.cooldownRemainingMs ?? 0) <= 0;
  }

  private getBossWarningCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
  ): number {
    const warnings = context.bossWarnings ?? [];

    if (warnings.length === 0) {
      return 0;
    }

    let score = 0;

    for (const warning of warnings) {
      const currentRisk = this.getSemanticBossWarningRisk(context, warning, player);
      const endpointRisk = this.getSemanticBossWarningRisk(context, warning, endpoint);
      const riskDelta = currentRisk - endpointRisk;
      const severity = this.getBossWarningSeverity(warning);

      if (endpointRisk > 0) {
        score -= endpointRisk * severity;
      }

      if (currentRisk > 0 && endpointRisk <= 0) {
        score += severity * 1.15;
      } else if (riskDelta > 0) {
        score += riskDelta * severity * 0.55;
      } else if (currentRisk > 0 && riskDelta <= 0) {
        score -= severity * 0.45;
      }
    }

    return score;
  }

  private getBreakoutCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
  ): number {
    if (!movement.stalled && !movement.prolonged && !surround.surrounded) {
      return 0;
    }

    const hpRatio = this.getHpRatio(context);
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
    const pressureDrop = currentPressure - endpointPressure;
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const borderProgress = endpointBorderDistance - currentBorderDistance;
    const currentObstacleClearance = this.getNearestObstacleClearance(context, player);
    const endpointObstacleClearance = this.getNearestObstacleClearance(context, endpoint);
    const obstacleProgress = endpointObstacleClearance - currentObstacleClearance;
    const actualMove = Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y);
    const anchorDistance = Phaser.Math.Distance.Between(
      endpoint.x,
      endpoint.y,
      movement.anchor.x,
      movement.anchor.y,
    );
    const currentWarningRisk = this.getTotalBossWarningRisk(context, player);
    const endpointWarningRisk = this.getTotalBossWarningRisk(context, endpoint);
    let score = 0;

    score += Math.max(-4, pressureDrop) * (surround.surrounded ? 8 : 4);
    score += Math.max(0, borderProgress) * (surround.surrounded || kite.active ? 0.34 : 0.14);
    score += Math.max(0, obstacleProgress) * 0.10;
    score += Math.max(0, actualMove - AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35) * 0.11;
    score += Math.max(0, anchorDistance - AUTO_PLAYER_CONSTANTS.STALL_RADIUS) * (movement.prolonged ? 0.20 : 0.10);
    score += Math.max(0, direction.dot(surround.safestDirection)) * (surround.surrounded ? 34 : 16);

    if (kite.active && kite.direction.lengthSq() > 0) {
      score += Math.max(0, direction.dot(kite.direction)) * 18;
    } else if (danger.fleeDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(danger.fleeDirection)) * 10;
    }

    if (this.stickyBreakoutDirection && this.stickyBreakoutFrames > 0) {
      score += Math.max(0, direction.dot(this.stickyBreakoutDirection)) * 14;
    }

    if (actualMove < AUTO_PLAYER_CONSTANTS.STEP_DISTANCE * 0.35) {
      score -= 26;
    }

    if (anchorDistance <= AUTO_PLAYER_CONSTANTS.STALL_RADIUS * 0.8) {
      score -= movement.prolonged ? 28 : 14;
    }

    if (endpointWarningRisk > currentWarningRisk) {
      score -= (endpointWarningRisk - currentWarningRisk) * 80;
    }

    if (surround.surrounded) {
      score += 28;
    } else if (movement.prolonged) {
      score += 14;
    }

    if (hpRatio < 0.35) {
      score *= 1.25;
    }

    return score;
  }

  private getKiteCandidateScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    kite: KiteInfo,
  ): number {
    if (!kite.active || kite.direction.lengthSq() === 0) {
      return 0;
    }

    const hpRatio = this.getHpRatio(context);
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const borderProgress = endpointBorderDistance - currentBorderDistance;
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
    let score = 0;

    score += Math.max(0, direction.dot(kite.direction)) * (kite.nearBorder ? 46 : 30);
    score += Math.max(0, borderProgress) * (kite.nearBorder ? 0.42 : 0.14);

    if (kite.inwardDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(kite.inwardDirection)) * (kite.nearBorder ? 28 : 4);
    }

    if (kite.nearBorder && borderProgress <= 1) {
      score -= 26;
    }

    if (endpointBorderDistance < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      score -= (1 - endpointBorderDistance / AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) * (kite.nearBorder ? 30 : 16);
    }

    if (this.isNearCorner(context, endpoint, AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN)) {
      score -= kite.nearCorner ? 44 : 28;
    }

    if (endpointPressure > kite.currentPressure + 1.5 && hpRatio < 0.5) {
      score -= (endpointPressure - kite.currentPressure) * 5;
    }

    if (danger.fleeDirection.lengthSq() > 0 && kite.nearBorder) {
      const fleeAlignment = direction.dot(danger.fleeDirection);
      if (fleeAlignment > 0 && borderProgress <= 2) {
        score -= fleeAlignment * 18;
      }
    }

    return score;
  }

  private getTotalBossWarningRisk(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
  ): number {
    return (context.bossWarnings ?? []).reduce(
      (total, warning) => total + this.getSemanticBossWarningRisk(context, warning, point),
      0,
    );
  }

  private getBossWarningEscapeDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);

    for (const warning of context.bossWarnings ?? []) {
      const risk = this.getSemanticBossWarningRisk(context, warning, player);

      if (risk <= 0) {
        continue;
      }

      const escape = this.getSemanticBossWarningEscapeDirection(context, warning, player);

      if (escape.lengthSq() > 0) {
        direction.add(escape.normalize().scale(risk * this.getBossWarningSeverity(warning)));
      }
    }

    return direction.lengthSq() > 0 ? direction.normalize() : direction;
  }

  private getSemanticBossWarningRisk(
    context: AutoPlayerContext,
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): number {
    if (this.isFinalBossDashWarning(context, warning)) {
      return this.getFinalBossDashRisk(context, point, warning);
    }

    if (this.isFinalBossRingBulletWarning(context, warning)) {
      return this.getFinalBossRingBulletLaneRisk(context, point, warning);
    }

    return this.getBossWarningRisk(warning, point);
  }

  private getSemanticBossWarningEscapeDirection(
    context: AutoPlayerContext,
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    if (this.isFinalBossDashWarning(context, warning)) {
      return this.getFinalBossDashEscapeDirection(context, warning, point);
    }

    if (this.isFinalBossRingBulletWarning(context, warning)) {
      return this.getFinalBossRingBulletEscapeDirection(context, warning, point);
    }

    return this.getSingleWarningEscapeDirection(warning, point);
  }

  private getFinalBossDashEscapeDirection(
    context: AutoPlayerContext,
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const boss = this.getFinalBossAnchor(context);

    if (!boss || warning.shape !== 'line') {
      return new Phaser.Math.Vector2(0, 0);
    }

    const start = new Phaser.Math.Vector2(warning.start.x, warning.start.y);
    const end = new Phaser.Math.Vector2(warning.end.x, warning.end.y);
    const line = end.subtract(start);

    if (line.lengthSq() === 0) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const lineDirection = line.normalize();
    const sideA = new Phaser.Math.Vector2(-lineDirection.y, lineDirection.x);
    const sideB = new Phaser.Math.Vector2(lineDirection.y, -lineDirection.x);
    const currentSide = Math.sign((point.x - warning.start.x) * lineDirection.y - (point.y - warning.start.y) * lineDirection.x);
    const side = currentSide >= 0 ? sideA : sideB;
    const distanceToBoss = this.getFinalBossEffectiveDistance(context, point);

    if (distanceToBoss > AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE) {
      const towardBoss = new Phaser.Math.Vector2(boss.x - point.x, boss.y - point.y);

      if (towardBoss.lengthSq() > 0) {
        return side.scale(0.75).add(towardBoss.normalize().scale(0.55));
      }
    }

    return side;
  }

  private getFinalBossRingBulletEscapeDirection(
    context: AutoPlayerContext,
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    if (warning.shape !== 'circle') {
      return new Phaser.Math.Vector2(0, 0);
    }

    const gapCandidates = this.getFinalBossRingGapCandidates(point, warning);
    let bestDirection = new Phaser.Math.Vector2(0, 0);
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of gapCandidates) {
      const direction = candidate.direction.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, point, direction);
      const score = this.getFinalBossPreferredPositioningScore(context, point, endpoint, direction)
        + this.getFinalBossRingBulletGapScore(context, endpoint, warning) * 40
        - this.getFinalBossRingBulletLaneRisk(context, endpoint, warning) * 80;

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    return bestDirection;
  }

  private updateFinalBossWarningDebugMetrics(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): void {
    const snapshot = this.autoMoveDebugSnapshot ?? this.getEmptyAutoMoveDebugSnapshot();

    if (!this.hasFinalBossCombatWarning(context)) {
      this.autoMoveDebugSnapshot = {
        ...snapshot,
        finalBossCloseRangeScore: 0,
        finalBossDashRisk: 0,
        finalBossRingGapScore: 0,
        finalBossDistancePenalty: 0,
        finalBossDistance: 0,
        finalBossDistanceForbiddenCandidateCount: 0,
        finalBossDistanceHardLimitTriggered: false,
        finalBossEmergencyDistanceEscapeUsed: false,
        finalBossOrbitCandidateChosen: false,
        finalBossRingGapDodgeChosen: false,
        finalBossDashSideStepChosen: false,
        finalBossCloseCutInCandidateChosen: false,
        selectedFinalBossCandidateReason: '',
        bossWarningAvoidReason: '',
      };
      return;
    }

    let dashRisk = 0;
    let ringGapScore = 0;

    for (const warning of context.bossWarnings ?? []) {
      if (this.isFinalBossDashWarning(context, warning)) {
        dashRisk = Math.max(dashRisk, this.getFinalBossDashRisk(context, player, warning));
      } else if (this.isFinalBossRingBulletWarning(context, warning)) {
        ringGapScore = Math.max(ringGapScore, this.getFinalBossRingBulletGapScore(context, player, warning));
      }
    }

    const distance = this.getFinalBossEffectiveDistance(context, player);
    const farPenalty = Number.isFinite(distance)
      ? Math.max(0, distance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_CLOSE_MAX_DISTANCE)
        + Math.max(0, distance - AUTO_PLAYER_CONSTANTS.FINAL_BOSS_DISTANCE_HARD_LIMIT) * 0.9
      : 0;

    this.autoMoveDebugSnapshot = {
      ...snapshot,
      finalBossCloseRangeScore: this.getFinalBossPreferredPositioningScore(context, player, player),
      finalBossDashRisk: dashRisk,
      finalBossRingGapScore: ringGapScore,
      finalBossDistancePenalty: farPenalty,
      finalBossDistance: Number.isFinite(distance) ? distance : 0,
      finalBossDistanceForbiddenCandidateCount: 0,
      finalBossDistanceHardLimitTriggered: false,
      finalBossEmergencyDistanceEscapeUsed: false,
      finalBossOrbitCandidateChosen: false,
      finalBossRingGapDodgeChosen: false,
      finalBossDashSideStepChosen: false,
      finalBossCloseCutInCandidateChosen: false,
      selectedFinalBossCandidateReason: '',
      bossWarningAvoidReason: '',
    };
  }

  private updateFinalBossWarningChoiceDebug(reason: string): void {
    if (!reason.startsWith('finalBoss')) {
      return;
    }

    const snapshot = this.autoMoveDebugSnapshot ?? this.getEmptyAutoMoveDebugSnapshot();

    this.autoMoveDebugSnapshot = {
      ...snapshot,
      finalBossOrbitCandidateChosen: reason === 'finalBossOrbitClockwise'
        || reason === 'finalBossOrbitCounterClockwise'
        || reason === 'finalBossCloseOrbit',
      finalBossRingGapDodgeChosen: reason === 'finalBossRingGapCutThrough',
      finalBossDashSideStepChosen: reason === 'finalBossDashSideStep',
      finalBossCloseCutInCandidateChosen: reason === 'finalBossCloseCutIn',
      selectedFinalBossCandidateReason: reason,
      bossWarningAvoidReason: reason,
    };
  }

  private updateFinalBossDistanceConstraintDebug(update: FinalBossDistanceConstraintDebugUpdate): void {
    const snapshot = this.autoMoveDebugSnapshot ?? this.getEmptyAutoMoveDebugSnapshot();
    const selectedReason = update.selectedReason || snapshot.selectedFinalBossCandidateReason;

    this.autoMoveDebugSnapshot = {
      ...snapshot,
      finalBossDistanceForbiddenCandidateCount: update.forbiddenCandidateCount,
      finalBossDistanceHardLimitTriggered: update.hardLimitTriggered,
      finalBossEmergencyDistanceEscapeUsed: update.emergencyEscapeUsed,
      selectedFinalBossCandidateReason: selectedReason,
      bossWarningAvoidReason: update.hardLimitTriggered
        ? 'finalBossDistanceHardLimit'
        : update.emergencyEscapeUsed
          ? selectedReason || 'finalBossEmergencyContactEscape'
          : snapshot.bossWarningAvoidReason,
    };
  }

  private getSingleWarningEscapeDirection(
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    if (warning.shape === 'circle') {
      const direction = new Phaser.Math.Vector2(point.x - warning.x, point.y - warning.y);

      if (direction.lengthSq() === 0) {
        direction.set(1, 0);
      }

      return direction;
    }

    const start = new Phaser.Math.Vector2(warning.start.x, warning.start.y);
    const end = new Phaser.Math.Vector2(warning.end.x, warning.end.y);
    const segment = end.clone().subtract(start);

    if (segment.lengthSq() === 0) {
      return point.clone().subtract(start);
    }

    const closest = this.getClosestPointOnSegment(start, end, point);
    const away = point.clone().subtract(closest);

    if (away.lengthSq() > 0) {
      return away;
    }

    return new Phaser.Math.Vector2(-segment.y, segment.x);
  }

  private getBossWarningRisk(
    warning: AutoBossWarningSnapshot,
    point: Phaser.Math.Vector2,
  ): number {
    if (warning.shape === 'circle') {
      const distance = Phaser.Math.Distance.Between(point.x, point.y, warning.x, warning.y);
      const margin = warning.danger === 'damage' ? 36 : 20;
      const riskRadius = Math.max(1, warning.radius + margin);

      if (distance >= riskRadius) {
        return 0;
      }

      return 1 + (riskRadius - distance) / riskRadius;
    }

    const start = new Phaser.Math.Vector2(warning.start.x, warning.start.y);
    const end = new Phaser.Math.Vector2(warning.end.x, warning.end.y);
    const distance = this.getDistanceSegmentToPoint(start, end, point);
    const halfWidth = Math.max(1, warning.width / 2);
    const margin = warning.danger === 'damage' ? 28 : 16;
    const riskWidth = halfWidth + margin;

    if (distance >= riskWidth) {
      return 0;
    }

    return 1 + (riskWidth - distance) / riskWidth;
  }

  private getBossWarningSeverity(warning: AutoBossWarningSnapshot): number {
    if (warning.danger === 'slow') {
      return 8;
    }

    switch (warning.kind) {
      case 'beam':
      case 'dash':
        return 26;
      case 'impact':
      case 'shockwave':
      case 'ring':
        return 22;
      default:
        return 18;
    }
  }

  private getObstaclePenalty(context: AutoPlayerContext, endpoint: Phaser.Math.Vector2): number {
    let penalty = 0;

    for (const obstacle of context.map?.obstacles ?? []) {
      if (!obstacle.blocksPlayer) {
        continue;
      }

      if (this.pointIntersectsObstacle(endpoint, obstacle, AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN * 0.45)) {
        penalty += 30;
      } else if (this.pointIntersectsObstacle(endpoint, obstacle, AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN)) {
        penalty += 6;
      }
    }

    return penalty;
  }

  private getNearestObstacleClearance(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
  ): number {
    let clearance = Number.POSITIVE_INFINITY;

    for (const obstacle of context.map?.obstacles ?? []) {
      if (!obstacle.blocksPlayer) {
        continue;
      }

      if (obstacle.shape === 'circle') {
        const radius = Math.max(obstacle.width, obstacle.height) / 2 + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
        clearance = Math.min(
          clearance,
          Phaser.Math.Distance.Between(point.x, point.y, obstacle.x, obstacle.y) - radius,
        );
        continue;
      }

      const halfWidth = obstacle.width / 2 + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
      const halfHeight = obstacle.height / 2 + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
      const dx = Math.max(Math.abs(point.x - obstacle.x) - halfWidth, 0);
      const dy = Math.max(Math.abs(point.y - obstacle.y) - halfHeight, 0);
      const outsideDistance = Math.sqrt(dx * dx + dy * dy);
      const insideDistance = Math.min(
        halfWidth - Math.abs(point.x - obstacle.x),
        halfHeight - Math.abs(point.y - obstacle.y),
      );

      clearance = Math.min(
        clearance,
        dx === 0 && dy === 0 ? -insideDistance : outsideDistance,
      );
    }

    return Number.isFinite(clearance) ? clearance : 240;
  }

  private getBorderPenalty(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    target?: AutoTarget,
  ): number {
    const hard = AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN;
    const warning = AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;

    if (
      point.x < hard
      || point.y < hard
      || point.x > context.worldBounds.width - hard
      || point.y > context.worldBounds.height - hard
    ) {
      return target && this.canPickupFrom(context, point, target.position) ? 12 : 40;
    }

    const nearestBorder = Math.min(
      point.x,
      point.y,
      context.worldBounds.width - point.x,
      context.worldBounds.height - point.y,
    );

    if (nearestBorder >= warning) {
      return 0;
    }

    const canCollect = target && this.canPickupFrom(context, point, target.position);
    return (1 - nearestBorder / warning) * (canCollect ? 2 : 7);
  }

  private getHighPressureBorderPenalty(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    kite: KiteInfo,
  ): number {
    if (!kite.active) {
      return 0;
    }

    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const borderProgress = endpointBorderDistance - currentBorderDistance;
    let penalty = 0;

    if (endpointBorderDistance < AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN + 12) {
      penalty += 52;
    } else if (endpointBorderDistance < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      penalty += (1 - endpointBorderDistance / AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) * (kite.nearBorder ? 24 : 14);
    }

    if (endpointBorderDistance < currentBorderDistance - 2) {
      penalty += (currentBorderDistance - endpointBorderDistance) * 0.38;
    }

    if (kite.nearBorder && borderProgress <= 2) {
      penalty += 22;
    }

    if (this.isNearCorner(context, endpoint, AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN)) {
      penalty += kite.nearCorner ? 42 : 26;
    }

    if (kite.inwardDirection.lengthSq() > 0 && kite.nearBorder) {
      const inwardAlignment = direction.dot(kite.inwardDirection);

      if (inwardAlignment < 0.3) {
        penalty += 16 + (0.3 - inwardAlignment) * 80;
      }
    }

    return penalty;
  }

  private getCornerTrapInfo(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): CornerTrapInfo {
    const inwardDirection = new Phaser.Math.Vector2(0, 0);
    const nearLeft = player.x < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;
    const nearRight = player.x > context.worldBounds.width - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;
    const nearTop = player.y < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;
    const nearBottom = player.y > context.worldBounds.height - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN;

    if (nearLeft) {
      inwardDirection.x = 1;
    } else if (nearRight) {
      inwardDirection.x = -1;
    }

    if (nearTop) {
      inwardDirection.y = 1;
    } else if (nearBottom) {
      inwardDirection.y = -1;
    }

    const nearCorner = inwardDirection.x !== 0 && inwardDirection.y !== 0;
    const enemyPressure = danger.nearestDistance < AUTO_PLAYER_CONSTANTS.DANGER_RADIUS
      || danger.pressureCount >= 3;

    return {
      active: nearCorner && enemyPressure,
      inwardDirection: inwardDirection.lengthSq() > 0
        ? inwardDirection.normalize()
        : inwardDirection,
    };
  }

  private getCornerEscapeScore(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
  ): number {
    if (!cornerTrap.active || cornerTrap.inwardDirection.lengthSq() === 0) {
      return 0;
    }

    const inwardAlignment = direction.dot(cornerTrap.inwardDirection);
    const displacement = endpoint.clone().subtract(player);
    const inwardProgress = displacement.dot(cornerTrap.inwardDirection);
    const currentBorderDistance = this.getNearestBorderDistance(context, player);
    const endpointBorderDistance = this.getNearestBorderDistance(context, endpoint);
    const borderProgress = endpointBorderDistance - currentBorderDistance;
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, this.getHpRatio(context));
    let score = 0;

    score += Math.max(0, inwardAlignment) * 18;
    score += Math.max(0, inwardProgress) * 0.12;
    score += Math.max(0, borderProgress) * 0.10;

    if (inwardAlignment < 0) {
      score -= 26;
    }

    if (borderProgress <= 2) {
      score -= 16;
    }

    if (danger.nearestDistance < AUTO_PLAYER_CONSTANTS.PANIC_DISTANCE) {
      score += Math.max(0, inwardAlignment) * 10;
    }

    if (endpointPressure > 8 && inwardAlignment < 0.45) {
      score -= 10;
    }

    return score;
  }

  private getNoProgressBorderPenalty(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
  ): number {
    if (danger.nearestDistance >= AUTO_PLAYER_CONSTANTS.DANGER_RADIUS) {
      return 0;
    }

    const intendedEndpoint = player.clone().add(
      direction.clone().normalize().scale(AUTO_PLAYER_CONSTANTS.STEP_DISTANCE),
    );
    const intendedMove = Phaser.Math.Distance.Between(
      player.x,
      player.y,
      intendedEndpoint.x,
      intendedEndpoint.y,
    );
    const actualMove = Phaser.Math.Distance.Between(player.x, player.y, endpoint.x, endpoint.y);

    if (actualMove >= intendedMove * 0.55) {
      return 0;
    }

    const endpointNearBorder = this.getNearestBorderDistance(context, endpoint)
      < AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN + 8;

    return endpointNearBorder ? 24 : 0;
  }

  private getNearestBorderDistance(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
  ): number {
    return Math.min(
      point.x,
      point.y,
      context.worldBounds.width - point.x,
      context.worldBounds.height - point.y,
    );
  }

  private isNearCorner(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    margin: number,
  ): boolean {
    const nearHorizontalBorder = point.x < margin || point.x > context.worldBounds.width - margin;
    const nearVerticalBorder = point.y < margin || point.y > context.worldBounds.height - margin;

    return nearHorizontalBorder && nearVerticalBorder;
  }

  private getSoftBorderDirection(context: AutoPlayerContext, player: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (player.x < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      direction.x += 1;
    } else if (player.x > context.worldBounds.width - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      direction.x -= 1;
    }

    if (player.y < AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      direction.y += 1;
    } else if (player.y > context.worldBounds.height - AUTO_PLAYER_CONSTANTS.BORDER_WARNING_MARGIN) {
      direction.y -= 1;
    }

    return direction.lengthSq() > 0 ? direction.normalize() : direction;
  }

  private getBlockingObstacle(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
  ): AutoObstacleSnapshot | undefined {
    return (context.map?.obstacles ?? []).find((obstacle) => (
      obstacle.blocksPlayer && this.segmentIntersectsObstacle(start, end, obstacle)
    ));
  }

  private segmentIntersectsBlockingObstacle(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
  ): boolean {
    return (context.map?.obstacles ?? []).some((obstacle) => (
      obstacle.blocksPlayer && this.segmentIntersectsObstacle(start, end, obstacle)
    ));
  }

  private segmentIntersectsObstacle(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    obstacle: AutoObstacleSnapshot,
  ): boolean {
    if (obstacle.shape === 'circle') {
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
      const center = new Phaser.Math.Vector2(obstacle.x, obstacle.y);
      const segment = end.clone().subtract(start);
      const lengthSq = segment.lengthSq();

      if (lengthSq === 0) {
        return Phaser.Math.Distance.Between(start.x, start.y, center.x, center.y) <= radius;
      }

      const t = Phaser.Math.Clamp(center.clone().subtract(start).dot(segment) / lengthSq, 0, 1);
      const closest = start.clone().add(segment.scale(t));
      return Phaser.Math.Distance.Between(closest.x, closest.y, center.x, center.y) <= radius;
    }

    const margin = AUTO_PLAYER_CONSTANTS.NAVIGATION_MARGIN;
    const left = obstacle.x - obstacle.width / 2 - margin;
    const right = obstacle.x + obstacle.width / 2 + margin;
    const top = obstacle.y - obstacle.height / 2 - margin;
    const bottom = obstacle.y + obstacle.height / 2 + margin;

    return Phaser.Geom.Intersects.LineToRectangle(
      new Phaser.Geom.Line(start.x, start.y, end.x, end.y),
      new Phaser.Geom.Rectangle(left, top, right - left, bottom - top),
    );
  }

  private getDistanceSegmentToPoint(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    point: Phaser.Math.Vector2,
  ): number {
    return this.getSegmentPointInfo(start, end, point).distance;
  }

  private routeSegmentIntersectsObstacle(
    context: AutoPlayerContext,
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
  ): boolean {
    return (context.map?.obstacles ?? [])
      .some((obstacle) => obstacle.blocksPlayer && this.segmentIntersectsObstacle(start, end, obstacle));
  }

  private getRouteSamplePoints(
    player: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
  ): Phaser.Math.Vector2[] {
    const points: Phaser.Math.Vector2[] = [player.clone()];

    for (let index = 0; index < waypoints.length - 1; index += 1) {
      const start = waypoints[index];
      const end = waypoints[index + 1];

      points.push(start.clone().lerp(end, 0.33));
      points.push(start.clone().lerp(end, 0.66));
      points.push(end.clone());
    }

    return points;
  }

  private getDistanceToRoute(
    point: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
  ): number {
    let nearest = Number.POSITIVE_INFINITY;

    for (let index = 0; index < waypoints.length - 1; index += 1) {
      nearest = Math.min(nearest, this.getDistanceSegmentToPoint(waypoints[index], waypoints[index + 1], point));
    }

    return Number.isFinite(nearest) ? nearest : Number.POSITIVE_INFINITY;
  }

  private getClosestPointOnRoute(
    point: Phaser.Math.Vector2,
    waypoints: readonly Phaser.Math.Vector2[],
  ): Phaser.Math.Vector2 {
    let nearestDistance = Number.POSITIVE_INFINITY;
    let nearestPoint = waypoints[0]?.clone() ?? point.clone();

    for (let index = 0; index < waypoints.length - 1; index += 1) {
      const closest = this.getClosestPointOnSegment(waypoints[index], waypoints[index + 1], point);
      const distance = Phaser.Math.Distance.Between(point.x, point.y, closest.x, closest.y);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = closest;
      }
    }

    return nearestPoint;
  }

  private getRouteProgressScore(
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    route: TacticalRoute,
  ): number {
    const waypoint = route.waypoints[Phaser.Math.Clamp(route.currentWaypointIndex, 0, Math.max(0, route.waypoints.length - 1))];

    if (!waypoint) {
      return 0;
    }

    const currentDistance = Phaser.Math.Distance.Between(player.x, player.y, waypoint.x, waypoint.y);
    const endpointDistance = Phaser.Math.Distance.Between(endpoint.x, endpoint.y, waypoint.x, waypoint.y);

    return currentDistance - endpointDistance;
  }

  private getClosestPointOnSegment(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    return this.getSegmentPointInfo(start, end, point).point;
  }

  private getSegmentPointInfo(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    point: Phaser.Math.Vector2,
  ): SegmentPointInfo {
    const segment = end.clone().subtract(start);
    const lengthSq = segment.lengthSq();

    if (lengthSq <= 0) {
      const closest = start.clone();

      return {
        distance: Phaser.Math.Distance.Between(point.x, point.y, closest.x, closest.y),
        t: 0,
        point: closest,
      };
    }

    const t = Phaser.Math.Clamp(point.clone().subtract(start).dot(segment) / lengthSq, 0, 1);
    const closest = start.clone().add(segment.scale(t));

    return {
      distance: Phaser.Math.Distance.Between(point.x, point.y, closest.x, closest.y),
      t,
      point: closest,
    };
  }

  private pointIntersectsObstacle(
    point: Phaser.Math.Vector2,
    obstacle: AutoObstacleSnapshot,
    margin: number,
  ): boolean {
    if (obstacle.shape === 'circle') {
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + margin;
      return Phaser.Math.Distance.Between(point.x, point.y, obstacle.x, obstacle.y) <= radius;
    }

    return point.x >= obstacle.x - obstacle.width / 2 - margin
      && point.x <= obstacle.x + obstacle.width / 2 + margin
      && point.y >= obstacle.y - obstacle.height / 2 - margin
      && point.y <= obstacle.y + obstacle.height / 2 + margin;
  }

  private isPointInZone(point: Phaser.Math.Vector2, zone: AutoSlowZoneSnapshot): boolean {
    if (zone.shape === 'circle') {
      return Phaser.Math.Distance.Between(point.x, point.y, zone.x, zone.y) <= zone.radius;
    }

    return point.x >= zone.x - zone.width / 2
      && point.x <= zone.x + zone.width / 2
      && point.y >= zone.y - zone.height / 2
      && point.y <= zone.y + zone.height / 2;
  }

  private getCandidateEndpoint(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const moveSpeed = Math.max(80, context.player?.moveSpeed ?? 120);
    const stepDistance = Math.min(AUTO_PLAYER_CONSTANTS.STEP_DISTANCE, Math.max(70, moveSpeed * 0.65));

    return this.clampToWorld(context, player.clone().add(direction.clone().normalize().scale(stepDistance)));
  }

  private clampToWorld(context: AutoPlayerContext, point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, 0, context.worldBounds.width),
      Phaser.Math.Clamp(point.y, 0, context.worldBounds.height),
    );
  }

  private clampToSafeWorld(context: AutoPlayerContext, point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const margin = AUTO_PLAYER_CONSTANTS.HARD_BORDER_MARGIN + 4;

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, margin, context.worldBounds.width - margin),
      Phaser.Math.Clamp(point.y, margin, context.worldBounds.height - margin),
    );
  }

  private canPickupFrom(
    context: AutoPlayerContext,
    point: Phaser.Math.Vector2,
    target: Phaser.Math.Vector2,
  ): boolean {
    return Phaser.Math.Distance.Between(point.x, point.y, target.x, target.y) <= this.getPickupRange(context);
  }

  private getPickupClusterScore(
    context: AutoPlayerContext,
    pickup: AutoPosition,
  ): number {
    let clusterScore = 0;

    for (const otherPickup of context.pickupPositions) {
      if (
        Phaser.Math.Distance.Between(pickup.x, pickup.y, otherPickup.x, otherPickup.y)
        <= AUTO_PLAYER_CONSTANTS.PICKUP_CLUSTER_RADIUS
      ) {
        clusterScore += this.getPickupExpValue(otherPickup);
      }
    }

    return Math.min(40, clusterScore);
  }

  private getPickupExpValue(pickup: AutoPosition | AutoPickupSnapshot): number {
    if (!('exp' in pickup) || pickup.exp === undefined) {
      return 1;
    }

    return Math.max(1, pickup.exp);
  }

  private getPickupRange(context: AutoPlayerContext): number {
    return Math.max(0, context.player?.pickupRangePx ?? context.pickupRangePx ?? 0);
  }

  private getHpRatio(context: AutoPlayerContext): number {
    const currentHp = context.player?.currentHp;
    const maxHp = context.player?.maxHp;

    if (currentHp === undefined || maxHp === undefined || maxHp <= 0) {
      return 1;
    }

    return Phaser.Math.Clamp(currentHp / maxHp, 0, 1);
  }

  private getPlayerVector(context: AutoPlayerContext): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(context.playerPosition.x, context.playerPosition.y);
  }

  private updateTargetStability(target: AutoTarget | undefined, reason: string): void {
    if (!target) {
      this.stickyTargetId = undefined;
      this.stickyWaypoint = undefined;
      this.stickyWaypointTargetId = undefined;
      return;
    }

    if (this.stickyTargetId !== target.id) {
      this.stickyTargetId = target.id;
      this.stickyWaypoint = undefined;
      this.stickyWaypointTargetId = undefined;
    }

    if (reason === 'border') {
      this.suppressedTargetId = target.id;
      this.suppressedTargetFrames = AUTO_PLAYER_CONSTANTS.TARGET_COOLDOWN_FRAMES;
    }

    if (reason === 'breakout') {
      this.suppressedTargetId = target.id;
      this.suppressedTargetFrames = Math.max(
        this.suppressedTargetFrames,
        Math.floor(AUTO_PLAYER_CONSTANTS.TARGET_COOLDOWN_FRAMES * 0.6),
      );
    }
  }

  private updateBreakoutStability(reason: string, direction: Phaser.Math.Vector2): void {
    if (reason !== 'breakout') {
      return;
    }

    this.stickyBreakoutDirection = direction.clone().normalize();
    this.stickyBreakoutFrames = AUTO_PLAYER_CONSTANTS.BREAKOUT_STICKY_FRAMES;
  }

  private updateKiteStability(kite: KiteInfo, reason: string, direction: Phaser.Math.Vector2): void {
    if (!kite.active) {
      return;
    }

    if (
      reason === 'kite'
      || reason === 'breakout'
      || (kite.direction.lengthSq() > 0 && direction.dot(kite.direction) > 0.72)
    ) {
      this.stickyKiteDirection = direction.clone().normalize();
      this.stickyKiteFrames = AUTO_PLAYER_CONSTANTS.KITE_STICKY_FRAMES;
    }
  }

  private tickSuppression(): void {
    if (this.stickyKiteFrames > 0) {
      this.stickyKiteFrames -= 1;
    } else {
      this.stickyKiteDirection = undefined;
    }

    if (this.stickyBreakoutFrames > 0) {
      this.stickyBreakoutFrames -= 1;
    } else {
      this.stickyBreakoutDirection = undefined;
    }

    if (this.suppressedTargetFrames <= 0) {
      this.suppressedTargetId = undefined;
      return;
    }

    this.suppressedTargetFrames -= 1;
  }
}

