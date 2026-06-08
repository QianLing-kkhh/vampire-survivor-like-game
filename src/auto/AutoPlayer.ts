import Phaser from 'phaser';

import type { CharacterDamageReactionType } from '../character/CharacterDamageReactionSkill';
import type { CharacterBaseStats } from '../character/CharacterDefinition';
import type { WeaponTag } from '../weapon/tags/WeaponTag';

export interface AutoPosition {
  x: number;
  y: number;
}

export interface AutoPlayerSnapshot {
  currentHp: number;
  maxHp: number;
  hitRadiusPx?: number;
  radiusPx?: number;
  moveSpeed?: number;
  pickupRangePx?: number;
  characterId?: string;
  damageReactionType?: CharacterDamageReactionType;
  baseStats?: Partial<CharacterBaseStats>;
}

export interface AutoWeaponSnapshot {
  weaponId: string;
  baseWeaponId: string;
  level: number;
  maxLevel: number;
  tags: readonly WeaponTag[];
  radiusPx?: number;
  rangePx?: number;
}

export interface AutoEnemySnapshot extends AutoPosition {
  id?: string;
  vx?: number;
  vy?: number;
  radiusPx?: number;
  damage?: number;
  hpRatio?: number;
  isBoss?: boolean;
  isElite?: boolean;
  isMiniBoss?: boolean;
}

export interface AutoPickupSnapshot extends AutoPosition {
  exp?: number;
  effectiveDistance?: number;
  clusterScore?: number;
  dangerScore?: number;
}

export interface AutoTreasureSnapshot extends AutoPosition {
  effectiveDistance?: number;
  dangerScore?: number;
}

export interface AutoObstacleSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'circle' | 'rect';
  blocksPlayer: boolean;
}

export interface AutoSlowZoneSnapshot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  shape: 'circle' | 'rect';
  playerSpeedMultiplier: number;
  enemySpeedMultiplier: number;
}

export interface AutoPortalSnapshot {
  id: string;
  x: number;
  y: number;
  radius: number;
  target?: AutoPosition;
  isAvailable?: boolean;
  cooldownRemainingMs?: number;
}

export interface AutoMapSnapshot {
  obstacles: readonly AutoObstacleSnapshot[];
  slowZones: readonly AutoSlowZoneSnapshot[];
  portals: readonly AutoPortalSnapshot[];
}

export type AutoBossWarningKind =
  | 'dash'
  | 'beam'
  | 'shockwave'
  | 'ring'
  | 'slowZone'
  | 'impact';

export type AutoBossWarningDanger = 'damage' | 'slow';

export type AutoBossWarningSnapshot =
  | {
    shape: 'line';
    kind: AutoBossWarningKind;
    danger: AutoBossWarningDanger;
    start: AutoPosition;
    end: AutoPosition;
    width: number;
    remainingMs?: number;
  }
  | {
    shape: 'circle';
    kind: AutoBossWarningKind;
    danger: AutoBossWarningDanger;
    x: number;
    y: number;
    radius: number;
    remainingMs?: number;
  };

export interface WeaponAutoContext {
  weaponIds: readonly string[];
  garlicRadiusPx?: number;
  bibleRadiusPx?: number;
  weapons?: readonly AutoWeaponSnapshot[];
}

export interface AutoPlayerContext {
  playerPosition: AutoPosition;
  enemyPositions: readonly (AutoPosition | AutoEnemySnapshot)[];
  pickupPositions: readonly (AutoPosition | AutoPickupSnapshot)[];
  treasurePositions?: readonly (AutoPosition | AutoTreasureSnapshot)[];
  pickupRangePx?: number;
  player?: AutoPlayerSnapshot;
  weaponContext?: WeaponAutoContext;
  map?: AutoMapSnapshot;
  bossWarnings?: readonly AutoBossWarningSnapshot[];
  deltaMs?: number;
  worldBounds: {
    width: number;
    height: number;
  };
}

interface AutoTarget {
  id: string;
  type: 'pickup' | 'treasure';
  position: Phaser.Math.Vector2;
  approachPosition: Phaser.Math.Vector2;
  value: number;
  effectiveDistance: number;
  blocked: boolean;
}

interface Candidate {
  direction: Phaser.Math.Vector2;
  reason: string;
}

type MoveMode =
  | 'SURVIVE'
  | 'REPOSITION'
  | 'BOSS_POSITIONING'
  | 'KITE'
  | 'CHEST_APPROACH'
  | 'COLLECT';

interface StrategicMoveIntent {
  mode: MoveMode;
  targetDirection: Phaser.Math.Vector2;
  targetPosition?: Phaser.Math.Vector2;
  urgency: number;
  validMs: number;
  target?: AutoTarget;
}

interface TacticalRoute {
  id: string;
  waypoints: Phaser.Math.Vector2[];
  currentWaypointIndex: number;
  threatRank: number;
  rawThreat: number;
  rewardScore: number;
  combatFitScore: number;
  routeScore: number;
  createdAt: number;
  validUntil: number;
  commitment: number;
}

interface CandidateRoute {
  id: string;
  waypoints: Phaser.Math.Vector2[];
  rawThreat: number;
  threatRank: number;
  rewardScore: number;
  combatFitScore: number;
  routeScore: number;
  hardInvalid: boolean;
}

interface MicroMoveResult {
  direction: Phaser.Math.Vector2;
  reason:
    | 'FOLLOW_ROUTE'
    | 'AVOID_CLOSE_ENEMY'
    | 'AVOID_BOSS_WARNING'
    | 'AVOID_OBSTACLE'
    | 'EMERGENCY_ESCAPE';
  score: number;
}

interface CornerTrapInfo {
  active: boolean;
  inwardDirection: Phaser.Math.Vector2;
}

interface MovementMemoryInfo {
  stalled: boolean;
  prolonged: boolean;
  stallMs: number;
  anchor: Phaser.Math.Vector2;
  recentDisplacement: number;
}

interface SurroundInfo {
  surrounded: boolean;
  blockedSectors: number;
  safestDirection: Phaser.Math.Vector2;
  safestScore: number;
}

interface KiteInfo {
  active: boolean;
  direction: Phaser.Math.Vector2;
  inwardDirection: Phaser.Math.Vector2;
  currentPressure: number;
  nearBorder: boolean;
  nearCorner: boolean;
}

interface TerrainEscapeInfo {
  active: boolean;
  direction: Phaser.Math.Vector2;
  enemySectors: number;
  nearBorder: boolean;
  nearObstacle: boolean;
  inSlowZone: boolean;
}

interface SegmentPointInfo {
  distance: number;
  t: number;
  point: Phaser.Math.Vector2;
}

interface EnemyMotionSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class AutoPlayer {
  private static readonly DANGER_RADIUS = 300;
  private static readonly PANIC_DISTANCE = 125;
  private static readonly SAFE_DISTANCE = 230;
  private static readonly PICKUP_SEEK_RADIUS = 900;
  private static readonly TREASURE_SEEK_RADIUS = 1200;
  private static readonly PICKUP_CLUSTER_RADIUS = 180;
  private static readonly HARD_BORDER_MARGIN = 44;
  private static readonly BORDER_WARNING_MARGIN = 190;
  private static readonly NAVIGATION_MARGIN = 42;
  private static readonly STEP_DISTANCE = 115;
  private static readonly TARGET_STICKY_BONUS = 2.2;
  private static readonly TARGET_COOLDOWN_FRAMES = 45;
  private static readonly PORTAL_ESCAPE_SEEK_RADIUS = 420;
  private static readonly STALL_RADIUS = 38;
  private static readonly STALL_TRIGGER_MS = 1400;
  private static readonly PROLONGED_STALL_MS = 2800;
  private static readonly BREAKOUT_STICKY_FRAMES = 16;
  private static readonly SURROUND_BLOCKED_SCORE = 9;
  private static readonly KITE_STICKY_FRAMES = 28;
  private static readonly CONTACT_DANGER_RADIUS = 78;
  private static readonly CONTACT_WARNING_RADIUS = 138;
  private static readonly CONTACT_PATH_RADIUS = 96;
  private static readonly DEFAULT_PLAYER_COLLISION_RADIUS = 28;
  private static readonly DEFAULT_ENEMY_COLLISION_RADIUS = 18;
  private static readonly FINAL_BOSS_DASH_MIN_DISTANCE = 170;
  private static readonly FINAL_BOSS_DASH_IDEAL_DISTANCE = 270;
  private static readonly FINAL_BOSS_DASH_MAX_DISTANCE = 390;
  private static readonly PRE_ENCIRCLE_RADIUS = 430;
  private static readonly TERRAIN_ESCAPE_MARGIN = 150;
  private static readonly STRATEGIC_DISTANCE = 420;
  private static readonly STRATEGIC_REFRESH_MS = 450;
  private static readonly STRATEGIC_URGENT_REFRESH_MS = 250;
  private static readonly STRATEGIC_SAFE_REFRESH_MS = 650;
  private static readonly STRATEGIC_SWITCH_RATIO = 0.14;
  private static readonly TACTICAL_ROUTE_REFRESH_MS = 420;
  private static readonly TACTICAL_ROUTE_URGENT_REFRESH_MS = 220;
  private static readonly TACTICAL_ROUTE_VALID_MS = 650;
  private static readonly TACTICAL_ROUTE_SWITCH_RATIO = 0.16;
  private static readonly ROUTE_WAYPOINT_REACHED_DISTANCE = 82;
  private static readonly MICRO_ROUTE_DEVIATION_LIMIT = 150;
  private static readonly MICRO_THREAT_RADIUS = 230;
  private static readonly TACTICAL_BACKTRACK_GRACE_MS = 260;
  private static readonly TACTICAL_BACKTRACK_LIMIT_MS = 780;

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
  private enemyMotionSnapshots = new Map<string, EnemyMotionSnapshot>();

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
    const intent = this.getStrategicMoveIntent(
      context,
      player,
      danger,
      cornerTrap,
      surround,
      movement,
      terrainEscape,
      kite,
      bestTarget,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    );

    if (
      intent.target
      && (intent.mode === 'COLLECT' || intent.mode === 'CHEST_APPROACH')
      && danger.nearestDistance > AutoPlayer.SAFE_DISTANCE
      && !movement.stalled
      && this.canPickupFrom(context, player, intent.target.position)
      && this.getTotalBossWarningRisk(context, player) <= 0
    ) {
      this.updateTargetStability(intent.target, 'collected');
      this.lastMoveDirection = new Phaser.Math.Vector2(0, 0);
      return new Phaser.Math.Vector2(0, 0);
    }

    const route = this.getCommittedTacticalRoute(
      context,
      player,
      danger,
      intent,
      cornerTrap,
      surround,
      movement,
      kite,
      terrainEscape,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    );
    const microMove = this.evaluateMicroControl(
      context,
      player,
      route,
      intent,
      danger,
      cornerTrap,
      surround,
      movement,
      kite,
      terrainEscape,
    );

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

  private getCommittedTacticalRoute(
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
    const deltaMs = Phaser.Math.Clamp(context.deltaMs ?? 16, 0, 120);
    this.tacticalRouteRemainingMs -= deltaMs;

    if (
      this.tacticalRoute
      && this.tacticalRouteRemainingMs > 0
      && this.tacticalRoute.validUntil > this.autoMoveElapsedMs
      && !this.shouldForceTacticalRouteRefresh(context, player, intent)
    ) {
      return this.tacticalRoute;
    }

    const nextRoute = this.evaluateTacticalRoute(
      context,
      player,
      danger,
      intent,
      cornerTrap,
      surround,
      movement,
      kite,
      terrainEscape,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    );
    const committed = this.chooseRouteWithCommitment(this.tacticalRoute, nextRoute, intent);

    this.tacticalRoute = committed;
    this.tacticalRouteRemainingMs = this.getTacticalRouteUpdateInterval(intent.mode);
    return committed;
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
        combatFitScore: this.evaluateRouteCombatFit(context, player, route.waypoints, danger),
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
      const stabilityScore = this.tacticalRoute && this.areRoutesSimilar(this.tacticalRoute.waypoints, route.waypoints)
        ? this.tacticalRoute.commitment
        : 0;
      const routeScore = -route.threatRank * 48
        - route.rawThreat * 0.16
        + rewardScore
        + route.combatFitScore
        + stabilityScore
        - (route.hardInvalid ? 180 : 0);
      const scoredRoute = { ...route, rewardScore, routeScore };

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
      routeScore: Number.NEGATIVE_INFINITY,
      hardInvalid: true,
    };

    return {
      id: `${selected.id}:${this.routeSequence++}`,
      waypoints: selected.waypoints.map((waypoint) => this.clampToWorld(context, waypoint)),
      currentWaypointIndex: Math.min(1, Math.max(0, selected.waypoints.length - 1)),
      threatRank: selected.threatRank,
      rawThreat: selected.rawThreat,
      rewardScore: selected.rewardScore,
      combatFitScore: selected.combatFitScore,
      routeScore: selected.routeScore,
      createdAt: this.autoMoveElapsedMs,
      validUntil: this.autoMoveElapsedMs + AutoPlayer.TACTICAL_ROUTE_VALID_MS,
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
      ? AutoPlayer.TACTICAL_ROUTE_SWITCH_RATIO * 0.5
      : AutoPlayer.TACTICAL_ROUTE_SWITCH_RATIO;
    const requiredGain = Math.max(6, Math.abs(currentRoute.routeScore) * switchRatio);

    if (nextRoute.routeScore < currentRoute.routeScore + requiredGain) {
      return {
        ...currentRoute,
        validUntil: Math.max(currentRoute.validUntil, this.autoMoveElapsedMs + AutoPlayer.TACTICAL_ROUTE_VALID_MS * 0.45),
      };
    }

    return nextRoute;
  }

  private evaluateMicroControl(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    route: TacticalRoute,
    intent: StrategicMoveIntent,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
    kite: KiteInfo,
    terrainEscape: TerrainEscapeInfo,
  ): MicroMoveResult {
    this.advanceRouteWaypoint(route, player);
    const routeDirection = this.getRouteDirection(context, player, route, intent);
    const warningEscapeDirection = this.getBossWarningEscapeDirection(context, player);
    const routeReturnDirection = this.getRouteReturnDirection(player, route);
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

    if (danger.nearestDistance < AutoPlayer.CONTACT_WARNING_RADIUS) {
      candidates.push(...this.getNearestEnemyEscapeCandidates(context, player).map((candidate) => ({
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

    if (this.lastMoveDirection && this.lastMoveDirection.lengthSq() > 0) {
      candidates.push({ direction: this.lastMoveDirection, reason: 'FOLLOW_ROUTE' });
    }

    let bestMove: MicroMoveResult | undefined;

    for (const candidate of candidates) {
      if (candidate.direction.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.direction.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, player, direction);
      const score = this.scoreMicroDirection(
        context,
        player,
        endpoint,
        direction,
        routeDirection,
        route,
        intent,
        danger,
        surround,
        movement,
        kite,
        terrainEscape,
      );
      const result: MicroMoveResult = {
        direction,
        reason: candidate.reason as MicroMoveResult['reason'],
        score,
      };

      if (!bestMove || result.score > bestMove.score) {
        bestMove = result;
      }
    }

    return bestMove ?? {
      direction: routeDirection.lengthSq() > 0 ? routeDirection.normalize() : new Phaser.Math.Vector2(0, 0),
      reason: 'FOLLOW_ROUTE',
      score: 0,
    };
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
      ? AutoPlayer.TACTICAL_ROUTE_URGENT_REFRESH_MS
      : AutoPlayer.TACTICAL_ROUTE_REFRESH_MS;
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
    const distance = Math.min(forward.length(), AutoPlayer.STRATEGIC_DISTANCE);
    const midDistance = Math.max(120, distance * 0.52);
    const narrowOffset = Math.max(90, distance * 0.28);
    const wideOffset = Math.max(150, distance * 0.45);
    const routes: Array<Pick<CandidateRoute, 'id' | 'waypoints'>> = [
      { id: 'direct', waypoints: [player.clone(), target] },
      { id: 'leftArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance)).add(left.clone().scale(narrowOffset)), target] },
      { id: 'rightArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance)).add(right.clone().scale(narrowOffset)), target] },
      { id: 'wideLeftArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance * 0.82)).add(left.clone().scale(wideOffset)), target] },
      { id: 'wideRightArc', waypoints: [player.clone(), player.clone().add(normalized.clone().scale(midDistance * 0.82)).add(right.clone().scale(wideOffset)), target] },
    ];

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
        player.clone().add(intent.targetDirection.clone().normalize().scale(AutoPlayer.STRATEGIC_DISTANCE)),
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
  ): number {
    if (waypoints.length < 2) {
      return 0;
    }

    const firstWaypoint = waypoints[Math.min(1, waypoints.length - 1)];
    const direction = firstWaypoint.clone().subtract(player);

    if (direction.lengthSq() === 0) {
      return 0;
    }

    return this.getWeaponCandidateScore(context, player, firstWaypoint, direction.normalize(), danger) * 4;
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
      && Phaser.Math.Distance.Between(player.x, player.y, waypoint.x, waypoint.y) < AutoPlayer.ROUTE_WAYPOINT_REACHED_DISTANCE
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

    if (distance < AutoPlayer.MICRO_ROUTE_DEVIATION_LIMIT) {
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
      const immediateThreat = danger.nearestDistance < AutoPlayer.CONTACT_DANGER_RADIUS
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

    if (danger.fleeDirection.lengthSq() > 0 && danger.nearestDistance < AutoPlayer.CONTACT_WARNING_RADIUS) {
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
      danger.nearestDistance < AutoPlayer.CONTACT_DANGER_RADIUS
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
        AutoPlayer.TACTICAL_BACKTRACK_LIMIT_MS,
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

  private getStrategicMoveIntent(
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
    const deltaMs = Phaser.Math.Clamp(context.deltaMs ?? 16, 0, 120);
    this.strategicIntentRemainingMs -= deltaMs;

    if (
      this.strategicIntent
      && this.strategicIntentRemainingMs > 0
      && !this.needsForcedStrategicRefresh(context, player, this.strategicIntent, danger, movement)
    ) {
      return this.strategicIntent;
    }

    const nextIntent = this.evaluateStrategicIntent(
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
      breakoutDirection,
    );

    if (this.strategicIntent && this.strategicIntent.targetDirection.lengthSq() > 0) {
      const currentScore = this.scoreStrategicDirection(
        context,
        player,
        this.strategicIntent.targetDirection.clone().normalize(),
        nextIntent.mode,
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
      const nextScore = this.scoreStrategicDirection(
        context,
        player,
        nextIntent.targetDirection,
        nextIntent.mode,
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
      const canKeepCurrent = this.strategicIntent.mode === nextIntent.mode
        && currentScore >= nextScore * (1 - AutoPlayer.STRATEGIC_SWITCH_RATIO)
        && this.getTotalBossWarningRisk(context, player) <= 0;

      if (canKeepCurrent) {
        this.strategicIntent = {
          ...nextIntent,
          targetDirection: this.strategicIntent.targetDirection.clone(),
          targetPosition: player.clone().add(
            this.strategicIntent.targetDirection.clone().normalize().scale(AutoPlayer.STRATEGIC_DISTANCE),
          ),
        };
        this.strategicIntentRemainingMs = this.strategicIntent.validMs;
        return this.strategicIntent;
      }
    }

    this.strategicIntent = nextIntent;
    this.strategicIntentRemainingMs = nextIntent.validMs;
    return nextIntent;
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

    for (const candidate of this.getStrategicDirections(player, danger, kite, terrainEscape, target, portalEscapeDirection, breakoutDirection)) {
      if (candidate.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.clone().normalize();
      const score = this.scoreStrategicDirection(
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

      if (score > bestScore) {
        bestScore = score;
        bestDirection = direction;
      }
    }

    if (bestDirection.lengthSq() === 0) {
      bestDirection = danger.fleeDirection.lengthSq() > 0
        ? danger.fleeDirection.clone()
        : new Phaser.Math.Vector2(1, 0);
    }

    return {
      mode,
      targetDirection: bestDirection.normalize(),
      targetPosition: player.clone().add(bestDirection.clone().normalize().scale(AutoPlayer.STRATEGIC_DISTANCE)),
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
      || danger.nearestDistance < AutoPlayer.CONTACT_DANGER_RADIUS
      || contactRisk > 80
      || futureContactRisk > 70
      || (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE && currentPressure > 2)
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
    const hpRatio = this.getHpRatio(context);
    const endpoint = this.clampToWorld(
      context,
      player.clone().add(direction.clone().normalize().scale(AutoPlayer.STRATEGIC_DISTANCE)),
    );
    const currentPressure = this.getEnemyPressureAt(context, player, hpRatio);
    const endpointPressure = this.getEnemyPressureAt(context, endpoint, hpRatio);
    const borderProgress = this.getNearestBorderDistance(context, endpoint)
      - this.getNearestBorderDistance(context, player);
    const obstacleProgress = this.getNearestObstacleClearance(context, endpoint)
      - this.getNearestObstacleClearance(context, player);
    const density = this.getEnemyDensityInDirection(context, player, direction, AutoPlayer.PRE_ENCIRCLE_RADIUS);
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

    return score;
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
      || (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE && intent.mode !== 'SURVIVE')
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
      return danger.nearestDistance < AutoPlayer.SAFE_DISTANCE ? 0.78 : 0.62;
    }

    if (mode === 'BOSS_POSITIONING' || mode === 'KITE') {
      return 0.55;
    }

    return 0.35;
  }

  private getStrategicValidMs(mode: MoveMode): number {
    if (mode === 'SURVIVE' || mode === 'REPOSITION') {
      return AutoPlayer.STRATEGIC_URGENT_REFRESH_MS;
    }

    if (mode === 'COLLECT' || mode === 'CHEST_APPROACH') {
      return AutoPlayer.STRATEGIC_SAFE_REFRESH_MS;
    }

    return AutoPlayer.STRATEGIC_REFRESH_MS;
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
    const boss = this.getFinalBossEnemy(context);

    if (!boss) {
      return 0;
    }

    const dashContext = this.hasDashBossWarning(context) || mode === 'BOSS_POSITIONING' || mode === 'KITE';

    if (!dashContext) {
      return 0;
    }

    const currentDistance = this.getEnemyEffectiveDistance(context, player, boss);
    const endpointDistance = this.getEnemyEffectiveDistance(context, endpoint, boss);
    const scale = strategic ? 1.35 : 1;
    let score = 0;

    if (endpointDistance < AutoPlayer.FINAL_BOSS_DASH_MIN_DISTANCE) {
      score -= (AutoPlayer.FINAL_BOSS_DASH_MIN_DISTANCE - endpointDistance) * 0.55 * scale + 18 * scale;
    } else if (endpointDistance <= AutoPlayer.FINAL_BOSS_DASH_MAX_DISTANCE) {
      score += (18 - Math.abs(endpointDistance - AutoPlayer.FINAL_BOSS_DASH_IDEAL_DISTANCE) * 0.045) * scale;
    } else {
      score -= (endpointDistance - AutoPlayer.FINAL_BOSS_DASH_MAX_DISTANCE) * 0.22 * scale + 16 * scale;
    }

    if (currentDistance > AutoPlayer.FINAL_BOSS_DASH_IDEAL_DISTANCE && endpointDistance < currentDistance) {
      score += Math.min(90, currentDistance - endpointDistance) * 0.18 * scale;
    }

    if (
      currentDistance <= AutoPlayer.FINAL_BOSS_DASH_MAX_DISTANCE
      && endpointDistance > currentDistance
      && endpointDistance > AutoPlayer.FINAL_BOSS_DASH_IDEAL_DISTANCE
    ) {
      score -= Math.min(90, endpointDistance - currentDistance) * 0.24 * scale;
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
        score += movement.stalled ? 0 : AutoPlayer.TARGET_STICKY_BONUS * 0.5;
      }

      if (this.canPickupFrom(context, endpoint, target.position)) {
        score += target.type === 'treasure' ? 10 : 5;
      }
    }

    if (danger.fleeDirection.lengthSq() > 0) {
      if (intent.mode === 'SURVIVE') {
        const fleeWeight = kite.active
          ? 1.2
          : danger.nearestDistance > AutoPlayer.SAFE_DISTANCE
            ? 0.7
            : (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE ? 16 : 7);
        score += direction.dot(danger.fleeDirection) * fleeWeight;
      } else if (danger.nearestDistance < AutoPlayer.CONTACT_WARNING_RADIUS) {
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
      this.tacticalBacktrackMs / AutoPlayer.TACTICAL_BACKTRACK_GRACE_MS,
      0,
      1,
    );
    const overrunRatio = Phaser.Math.Clamp(
      (this.tacticalBacktrackMs - AutoPlayer.TACTICAL_BACKTRACK_GRACE_MS)
        / Math.max(1, AutoPlayer.TACTICAL_BACKTRACK_LIMIT_MS - AutoPlayer.TACTICAL_BACKTRACK_GRACE_MS),
      0,
      1,
    );
    const opposite = -alignment;
    const currentContactRisk = this.getEnemyContactRiskAt(context, player, hpRatio)
      + this.getEnemyPathContactRisk(
        context,
        player,
        player.clone().add(strategic.clone().scale(AutoPlayer.STEP_DISTANCE)),
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

      if (hpRatio < 0.35 && (targetPressure > 4 || nearestEnemyDistance < AutoPlayer.PANIC_DISTANCE)) {
        continue;
      }

      let score = target.value - targetPressure - targetWarningRisk * 18;

      if (target.id === this.stickyTargetId) {
        score += AutoPlayer.TARGET_STICKY_BONUS;
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

      if (effectiveDistance > AutoPlayer.PICKUP_SEEK_RADIUS) {
        continue;
      }

      const clusterScore = 'clusterScore' in pickup && pickup.clusterScore !== undefined
        ? pickup.clusterScore
        : this.getPickupClusterScore(context, pickup);
      const dangerScore = 'dangerScore' in pickup && pickup.dangerScore !== undefined
        ? pickup.dangerScore
        : this.getEnemyPressureAt(context, position, this.getHpRatio(context));
      const nearBonus = effectiveDistance <= 80 ? 8 : effectiveDistance <= 160 ? 4 : 0;
      const value = 6 + clusterScore * 1.45 + nearBonus + 420 / (effectiveDistance + 80) - dangerScore * 0.35;
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

      if (effectiveDistance > AutoPlayer.TREASURE_SEEK_RADIUS) {
        continue;
      }

      const dangerScore = 'dangerScore' in treasure && treasure.dangerScore !== undefined
        ? treasure.dangerScore
        : this.getEnemyPressureAt(context, position, this.getHpRatio(context));
      const value = 18 + 900 / (effectiveDistance + 120) - dangerScore * 0.55;
      const id = `treasure:${Math.round(treasure.x)}:${Math.round(treasure.y)}`;
      const approachPosition = this.getApproachPosition(context, player, position, pickupRange);
      const waypoint = this.getNavigationWaypoint(context, player, approachPosition, id);

      if (nearestEnemyDistance < AutoPlayer.PANIC_DISTANCE && dangerScore > 2) {
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
    const margin = AutoPlayer.HARD_BORDER_MARGIN + AutoPlayer.NAVIGATION_MARGIN;
    const isNearBorder = target.x < AutoPlayer.BORDER_WARNING_MARGIN
      || target.y < AutoPlayer.BORDER_WARNING_MARGIN
      || target.x > context.worldBounds.width - AutoPlayer.BORDER_WARNING_MARGIN
      || target.y > context.worldBounds.height - AutoPlayer.BORDER_WARNING_MARGIN;

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
    const margin = AutoPlayer.NAVIGATION_MARGIN;

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

      if (distance <= AutoPlayer.DANGER_RADIUS) {
        pressureCount += 1;
        const weight = ((AutoPlayer.DANGER_RADIUS - Math.max(1, distance)) / AutoPlayer.DANGER_RADIUS) * threat;
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

    if (anchorDistance <= AutoPlayer.STALL_RADIUS) {
      this.stallMs += deltaMs;
    } else {
      this.stallAnchor = player.clone();
      this.stallMs = 0;
    }

    this.lastPosition = player.clone();

    return {
      stalled: this.stallMs >= AutoPlayer.STALL_TRIGGER_MS,
      prolonged: this.stallMs >= AutoPlayer.PROLONGED_STALL_MS,
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
      const noProgressPenalty = actualMove < AutoPlayer.STEP_DISTANCE * 0.45 ? 12 : 0;
      const sectorScore = pressure * 2.2
        + borderPenalty * 0.65
        + obstaclePenalty * 0.9
        + warningRisk * 18
        + noProgressPenalty;

      if (
        sectorScore >= AutoPlayer.SURROUND_BLOCKED_SCORE
        || obstaclePenalty >= 20
        || borderPenalty >= 24
        || actualMove < AutoPlayer.STEP_DISTANCE * 0.35
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
      || (movement.stalled && blockedSectors >= 4 && danger.nearestDistance < AutoPlayer.DANGER_RADIUS);

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
    const enemySectors = this.getEnemySectorCount(context, player, AutoPlayer.PRE_ENCIRCLE_RADIUS);
    const nearBorder = this.getNearestBorderDistance(context, player) < AutoPlayer.BORDER_WARNING_MARGIN;
    const nearObstacle = this.getNearestObstacleClearance(context, player) < AutoPlayer.TERRAIN_ESCAPE_MARGIN;
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

    if (!nearestObstacle || nearestClearance >= AutoPlayer.TERRAIN_ESCAPE_MARGIN) {
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
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + AutoPlayer.NAVIGATION_MARGIN;
      return Math.max(0, Phaser.Math.Distance.Between(point.x, point.y, obstacle.x, obstacle.y) - radius);
    }

    const dx = Math.max(Math.abs(point.x - obstacle.x) - obstacle.width / 2 - AutoPlayer.NAVIGATION_MARGIN, 0);
    const dy = Math.max(Math.abs(point.y - obstacle.y) - obstacle.height / 2 - AutoPlayer.NAVIGATION_MARGIN, 0);

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
      || (movement.stalled && danger.nearestDistance < AutoPlayer.DANGER_RADIUS)
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
    const nearBorder = this.getNearestBorderDistance(context, player) < AutoPlayer.BORDER_WARNING_MARGIN;
    const nearCorner = this.isNearCorner(context, player, AutoPlayer.BORDER_WARNING_MARGIN);
    const enemyCountPressure = context.enemyPositions.length >= 12 && danger.nearestDistance < AutoPlayer.DANGER_RADIUS;
    const moveSpeed = Math.max(80, context.player?.moveSpeed ?? 120);
    const highSpeedClusterShaping = moveSpeed >= 170
      && context.enemyPositions.length >= 4
      && danger.nearestDistance < AutoPlayer.DANGER_RADIUS + 80
      && danger.nearestDistance > AutoPlayer.CONTACT_WARNING_RADIUS * 0.85;
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
    score += Math.max(0, actualMove - AutoPlayer.STEP_DISTANCE * 0.35) * 0.08;

    if (kite.nearBorder && borderProgress <= 2) {
      score -= 24;
    }

    if (kite.nearCorner && borderProgress <= 8) {
      score -= 22;
    }

    if (this.isNearCorner(context, endpoint, AutoPlayer.BORDER_WARNING_MARGIN)) {
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

    if (actualMove < AutoPlayer.STEP_DISTANCE * 0.35) {
      return false;
    }

    if (this.getObstaclePenalty(context, endpoint) >= 20 || this.getTotalBossWarningRisk(context, endpoint) > 0) {
      return false;
    }

    if (endpointBorderDistance < AutoPlayer.HARD_BORDER_MARGIN + 12) {
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
        >= AutoPlayer.STEP_DISTANCE * 0.35;
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

      if (distance > AutoPlayer.DANGER_RADIUS) {
        continue;
      }

      const proximity = (AutoPlayer.DANGER_RADIUS - Math.max(0, distance)) / AutoPlayer.DANGER_RADIUS;
      const threat = this.getEnemyThreatWeight(enemy);
      const farMultiplier = distance > AutoPlayer.SAFE_DISTANCE ? 0.32 : 1;
      let enemyPressure = proximity * proximity * threat * farMultiplier;

      if (distance < AutoPlayer.CONTACT_WARNING_RADIUS) {
        const contactProximity = (AutoPlayer.CONTACT_WARNING_RADIUS - Math.max(0, distance))
          / AutoPlayer.CONTACT_WARNING_RADIUS;
        enemyPressure += contactProximity * contactProximity * 7.5 * threat;
      }

      if (distance < AutoPlayer.CONTACT_DANGER_RADIUS) {
        const dangerProximity = (AutoPlayer.CONTACT_DANGER_RADIUS - Math.max(0, distance))
          / AutoPlayer.CONTACT_DANGER_RADIUS;
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

      if (distance > AutoPlayer.CONTACT_WARNING_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const warningProximity = (AutoPlayer.CONTACT_WARNING_RADIUS - Math.max(0, distance))
        / AutoPlayer.CONTACT_WARNING_RADIUS;
      risk += warningProximity * warningProximity * 52 * threat;

      if (distance < AutoPlayer.CONTACT_DANGER_RADIUS) {
        const dangerProximity = (AutoPlayer.CONTACT_DANGER_RADIUS - Math.max(0, distance))
          / AutoPlayer.CONTACT_DANGER_RADIUS;
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

      if (distance > AutoPlayer.CONTACT_WARNING_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const proximity = (AutoPlayer.CONTACT_WARNING_RADIUS - Math.max(0, distance))
        / AutoPlayer.CONTACT_WARNING_RADIUS;
      risk += proximity * proximity * 36 * threat;

      if (distance < AutoPlayer.CONTACT_DANGER_RADIUS) {
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

      if (pathDistance > AutoPlayer.CONTACT_PATH_RADIUS) {
        continue;
      }

      const threat = this.getEnemyThreatWeight(enemy);
      const proximity = (AutoPlayer.CONTACT_PATH_RADIUS - Math.max(0, pathDistance))
        / AutoPlayer.CONTACT_PATH_RADIUS;
      const movingAway = endpointDistance >= currentDistance + 8;
      const crossingMidPath = pathInfo.t > 0.12 && pathInfo.t < 0.88;
      const escapingStartContact = movingAway
        && pathInfo.t <= 0.12
        && currentDistance < AutoPlayer.CONTACT_WARNING_RADIUS;
      const approachMultiplier = endpointDistance < currentDistance - 8
        ? 1
        : escapingStartContact
          ? 0.28
          : crossingMidPath
            ? 1.25
            : 0.55;
      risk += proximity * proximity * 86 * threat * approachMultiplier;

      if (pathDistance < AutoPlayer.CONTACT_DANGER_RADIUS) {
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

      if (Math.min(startDistance, endDistance) > AutoPlayer.DANGER_RADIUS + AutoPlayer.STEP_DISTANCE) {
        continue;
      }

      const pathInfo = this.getSegmentPointInfo(start, end, enemyPosition);
      const pathDistance = this.getEnemyEffectivePathDistance(context, pathInfo.distance, enemy);

      if (pathDistance > AutoPlayer.CONTACT_WARNING_RADIUS) {
        continue;
      }

      nearbyEnemies += 1;
      nearestPathDistance = Math.min(nearestPathDistance, pathDistance);

      if (pathInfo.t > 0.12 && pathInfo.t < 0.88 && pathDistance < AutoPlayer.CONTACT_PATH_RADIUS) {
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

    if (nearestPathDistance < AutoPlayer.CONTACT_PATH_RADIUS) {
      const narrowness = (AutoPlayer.CONTACT_PATH_RADIUS - nearestPathDistance)
        / AutoPlayer.CONTACT_PATH_RADIUS;

      return -18 * narrowness * pressureMultiplier;
    }

    const openRatio = Phaser.Math.Clamp(
      (nearestPathDistance - AutoPlayer.CONTACT_PATH_RADIUS)
        / Math.max(1, AutoPlayer.CONTACT_WARNING_RADIUS - AutoPlayer.CONTACT_PATH_RADIUS),
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

    if (endpointDistance < AutoPlayer.CONTACT_WARNING_RADIUS) {
      penalty += (AutoPlayer.CONTACT_WARNING_RADIUS - endpointDistance) * 1.15;
    }

    if (endpointDistance < AutoPlayer.CONTACT_DANGER_RADIUS) {
      penalty += (AutoPlayer.CONTACT_DANGER_RADIUS - endpointDistance) * 3.1 + 86;
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

    const safeMin = AutoPlayer.CONTACT_WARNING_RADIUS + 26;
    const safeMax = AutoPlayer.SAFE_DISTANCE;
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
      ? Math.max(positionRadius, AutoPlayer.DEFAULT_PLAYER_COLLISION_RADIUS)
      : AutoPlayer.DEFAULT_PLAYER_COLLISION_RADIUS;
  }

  private getEnemyCollisionRadius(enemy: AutoPosition | AutoEnemySnapshot): number {
    const radius = 'radiusPx' in enemy ? enemy.radiusPx : undefined;

    return radius !== undefined && Number.isFinite(radius) && radius > 0
      ? radius
      : AutoPlayer.DEFAULT_ENEMY_COLLISION_RADIUS;
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

      if (distance > portal.radius + AutoPlayer.PORTAL_ESCAPE_SEEK_RADIUS) {
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
        + Math.max(0, AutoPlayer.PORTAL_ESCAPE_SEEK_RADIUS - Math.max(0, distance - portal.radius)) * 0.035
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

      if (playerDistance > portal.radius + AutoPlayer.PORTAL_ESCAPE_SEEK_RADIUS) {
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
        || playerDistance > portal.radius + AutoPlayer.PORTAL_ESCAPE_SEEK_RADIUS
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
      || danger.nearestDistance < AutoPlayer.PANIC_DISTANCE
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
      const currentRisk = this.getBossWarningRisk(warning, player);
      const endpointRisk = this.getBossWarningRisk(warning, endpoint);
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
    score += Math.max(0, actualMove - AutoPlayer.STEP_DISTANCE * 0.35) * 0.11;
    score += Math.max(0, anchorDistance - AutoPlayer.STALL_RADIUS) * (movement.prolonged ? 0.20 : 0.10);
    score += Math.max(0, direction.dot(surround.safestDirection)) * (surround.surrounded ? 34 : 16);

    if (kite.active && kite.direction.lengthSq() > 0) {
      score += Math.max(0, direction.dot(kite.direction)) * 18;
    } else if (danger.fleeDirection.lengthSq() > 0) {
      score += Math.max(0, direction.dot(danger.fleeDirection)) * 10;
    }

    if (this.stickyBreakoutDirection && this.stickyBreakoutFrames > 0) {
      score += Math.max(0, direction.dot(this.stickyBreakoutDirection)) * 14;
    }

    if (actualMove < AutoPlayer.STEP_DISTANCE * 0.35) {
      score -= 26;
    }

    if (anchorDistance <= AutoPlayer.STALL_RADIUS * 0.8) {
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

    if (endpointBorderDistance < AutoPlayer.BORDER_WARNING_MARGIN) {
      score -= (1 - endpointBorderDistance / AutoPlayer.BORDER_WARNING_MARGIN) * (kite.nearBorder ? 30 : 16);
    }

    if (this.isNearCorner(context, endpoint, AutoPlayer.BORDER_WARNING_MARGIN)) {
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
      (total, warning) => total + this.getBossWarningRisk(warning, point),
      0,
    );
  }

  private getBossWarningEscapeDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);

    for (const warning of context.bossWarnings ?? []) {
      const risk = this.getBossWarningRisk(warning, player);

      if (risk <= 0) {
        continue;
      }

      const escape = this.getSingleWarningEscapeDirection(warning, player);

      if (escape.lengthSq() > 0) {
        direction.add(escape.normalize().scale(risk * this.getBossWarningSeverity(warning)));
      }
    }

    return direction.lengthSq() > 0 ? direction.normalize() : direction;
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

      if (this.pointIntersectsObstacle(endpoint, obstacle, AutoPlayer.NAVIGATION_MARGIN * 0.45)) {
        penalty += 30;
      } else if (this.pointIntersectsObstacle(endpoint, obstacle, AutoPlayer.NAVIGATION_MARGIN)) {
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
        const radius = Math.max(obstacle.width, obstacle.height) / 2 + AutoPlayer.NAVIGATION_MARGIN;
        clearance = Math.min(
          clearance,
          Phaser.Math.Distance.Between(point.x, point.y, obstacle.x, obstacle.y) - radius,
        );
        continue;
      }

      const halfWidth = obstacle.width / 2 + AutoPlayer.NAVIGATION_MARGIN;
      const halfHeight = obstacle.height / 2 + AutoPlayer.NAVIGATION_MARGIN;
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
    const hard = AutoPlayer.HARD_BORDER_MARGIN;
    const warning = AutoPlayer.BORDER_WARNING_MARGIN;

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

    if (endpointBorderDistance < AutoPlayer.HARD_BORDER_MARGIN + 12) {
      penalty += 52;
    } else if (endpointBorderDistance < AutoPlayer.BORDER_WARNING_MARGIN) {
      penalty += (1 - endpointBorderDistance / AutoPlayer.BORDER_WARNING_MARGIN) * (kite.nearBorder ? 24 : 14);
    }

    if (endpointBorderDistance < currentBorderDistance - 2) {
      penalty += (currentBorderDistance - endpointBorderDistance) * 0.38;
    }

    if (kite.nearBorder && borderProgress <= 2) {
      penalty += 22;
    }

    if (this.isNearCorner(context, endpoint, AutoPlayer.BORDER_WARNING_MARGIN)) {
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
    const nearLeft = player.x < AutoPlayer.BORDER_WARNING_MARGIN;
    const nearRight = player.x > context.worldBounds.width - AutoPlayer.BORDER_WARNING_MARGIN;
    const nearTop = player.y < AutoPlayer.BORDER_WARNING_MARGIN;
    const nearBottom = player.y > context.worldBounds.height - AutoPlayer.BORDER_WARNING_MARGIN;

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
    const enemyPressure = danger.nearestDistance < AutoPlayer.DANGER_RADIUS
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

    if (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE) {
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
    if (danger.nearestDistance >= AutoPlayer.DANGER_RADIUS) {
      return 0;
    }

    const intendedEndpoint = player.clone().add(
      direction.clone().normalize().scale(AutoPlayer.STEP_DISTANCE),
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
      < AutoPlayer.HARD_BORDER_MARGIN + 8;

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

    if (player.x < AutoPlayer.BORDER_WARNING_MARGIN) {
      direction.x += 1;
    } else if (player.x > context.worldBounds.width - AutoPlayer.BORDER_WARNING_MARGIN) {
      direction.x -= 1;
    }

    if (player.y < AutoPlayer.BORDER_WARNING_MARGIN) {
      direction.y += 1;
    } else if (player.y > context.worldBounds.height - AutoPlayer.BORDER_WARNING_MARGIN) {
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
      const radius = Math.max(obstacle.width, obstacle.height) / 2 + AutoPlayer.NAVIGATION_MARGIN;
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

    const margin = AutoPlayer.NAVIGATION_MARGIN;
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
    const stepDistance = Math.min(AutoPlayer.STEP_DISTANCE, Math.max(70, moveSpeed * 0.65));

    return this.clampToWorld(context, player.clone().add(direction.clone().normalize().scale(stepDistance)));
  }

  private clampToWorld(context: AutoPlayerContext, point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(point.x, 0, context.worldBounds.width),
      Phaser.Math.Clamp(point.y, 0, context.worldBounds.height),
    );
  }

  private clampToSafeWorld(context: AutoPlayerContext, point: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const margin = AutoPlayer.HARD_BORDER_MARGIN + 4;

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
        <= AutoPlayer.PICKUP_CLUSTER_RADIUS
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
      this.suppressedTargetFrames = AutoPlayer.TARGET_COOLDOWN_FRAMES;
    }

    if (reason === 'breakout') {
      this.suppressedTargetId = target.id;
      this.suppressedTargetFrames = Math.max(
        this.suppressedTargetFrames,
        Math.floor(AutoPlayer.TARGET_COOLDOWN_FRAMES * 0.6),
      );
    }
  }

  private updateBreakoutStability(reason: string, direction: Phaser.Math.Vector2): void {
    if (reason !== 'breakout') {
      return;
    }

    this.stickyBreakoutDirection = direction.clone().normalize();
    this.stickyBreakoutFrames = AutoPlayer.BREAKOUT_STICKY_FRAMES;
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
      this.stickyKiteFrames = AutoPlayer.KITE_STICKY_FRAMES;
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
