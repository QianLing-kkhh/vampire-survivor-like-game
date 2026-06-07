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

  getMoveDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    this.tickSuppression();

    const player = this.getPlayerVector(context);
    const movement = this.updateMovementMemory(context, player);
    const danger = this.getDangerInfo(context, player);
    const cornerTrap = this.getCornerTrapInfo(context, player, danger);
    const surround = this.getSurroundInfo(context, player, danger, movement);
    const targets = this.getTargets(context, player, danger.nearestDistance);
    const bestTarget = this.selectTarget(context, player, targets, danger.nearestDistance);
    const warningEscapeDirection = this.getBossWarningEscapeDirection(context, player);
    const portalEscapeDirection = this.getPortalEscapeDirection(context, player, danger);
    const breakoutDirection = this.getBreakoutDirection(context, player, danger, surround, movement);

    if (
      bestTarget
      && danger.nearestDistance > AutoPlayer.SAFE_DISTANCE
      && !movement.stalled
      && this.canPickupFrom(context, player, bestTarget.position)
      && this.getTotalBossWarningRisk(context, player) <= 0
    ) {
      this.updateTargetStability(bestTarget, 'collected');
      return new Phaser.Math.Vector2(0, 0);
    }

    const candidates = this.getCandidates(
      context,
      player,
      danger,
      bestTarget,
      cornerTrap,
      warningEscapeDirection,
      portalEscapeDirection,
      breakoutDirection,
    );

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestCandidate: Candidate | undefined;

    for (const candidate of candidates) {
      if (candidate.direction.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.direction.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, player, direction);
      const score = this.scoreCandidate(
        context,
        player,
        endpoint,
        direction,
        danger,
        bestTarget,
        cornerTrap,
        surround,
        movement,
      );

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { direction, reason: candidate.reason };
      }
    }

    if (!bestCandidate) {
      return new Phaser.Math.Vector2(0, 0);
    }

    this.updateTargetStability(bestTarget, bestCandidate.reason);
    this.updateBreakoutStability(bestCandidate.reason, bestCandidate.direction);
    return bestCandidate.direction.normalize();
  }

  private getCandidates(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    target: AutoTarget | undefined,
    cornerTrap: CornerTrapInfo,
    warningEscapeDirection: Phaser.Math.Vector2,
    portalEscapeDirection: Phaser.Math.Vector2,
    breakoutDirection: Phaser.Math.Vector2,
  ): Candidate[] {
    const candidates: Candidate[] = this.getBaseDirections()
      .map((direction) => ({ direction, reason: 'base' }));

    if (danger.fleeDirection.lengthSq() > 0) {
      candidates.push({ direction: danger.fleeDirection, reason: 'flee' });
      candidates.push({ direction: new Phaser.Math.Vector2(danger.fleeDirection.y, -danger.fleeDirection.x), reason: 'tangent' });
      candidates.push({ direction: new Phaser.Math.Vector2(-danger.fleeDirection.y, danger.fleeDirection.x), reason: 'tangent' });
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

    if (target) {
      const targetDirection = target.approachPosition.clone().subtract(player);

      if (targetDirection.lengthSq() > 0) {
        candidates.push({ direction: targetDirection, reason: target.blocked ? 'waypoint' : 'target' });
      }
    }

    const weaponDirection = this.getWeaponDirection(context, player, danger);

    if (weaponDirection.lengthSq() > 0) {
      candidates.push({ direction: weaponDirection, reason: 'weapon' });
    }

    const centerDirection = new Phaser.Math.Vector2(
      context.worldBounds.width / 2 - player.x,
      context.worldBounds.height / 2 - player.y,
    );

    if (centerDirection.lengthSq() > 0) {
      candidates.push({ direction: centerDirection, reason: 'center' });
    }

    const borderDirection = this.getSoftBorderDirection(context, player);

    if (borderDirection.lengthSq() > 0) {
      candidates.push({ direction: borderDirection, reason: 'border' });
    }

    return candidates;
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

  private scoreCandidate(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    target: AutoTarget | undefined,
    cornerTrap: CornerTrapInfo,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
  ): number {
    const hpRatio = this.getHpRatio(context);
    let score = 0;

    score -= this.getEnemyPressureAt(context, endpoint, hpRatio) * (hpRatio < 0.35 ? 1.45 : 1);
    score -= this.getBorderPenalty(context, endpoint, target);
    score -= this.getObstaclePenalty(context, endpoint);
    score += this.getSlowZoneScore(context, endpoint, hpRatio);
    score += this.getPortalScore(context, endpoint, hpRatio);
    score += this.getPortalEscapeCandidateScore(context, player, endpoint, danger, hpRatio);
    score += this.getWeaponCandidateScore(context, player, endpoint, direction, danger);
    score += this.getCornerEscapeScore(context, player, endpoint, direction, danger, cornerTrap);
    score += this.getBossWarningCandidateScore(context, player, endpoint);
    score += this.getBreakoutCandidateScore(context, player, endpoint, direction, danger, surround, movement);
    score -= this.getNoProgressBorderPenalty(context, player, endpoint, direction, danger);

    if (target) {
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
        score += target.value * 0.75;
        score += Math.max(-80, progress) * 0.055;
      } else {
        score -= target.value * 0.45;
      }

      if (target.id === this.stickyTargetId) {
        score += movement.stalled ? 0 : AutoPlayer.TARGET_STICKY_BONUS;
      }

      if (this.canPickupFrom(context, endpoint, target.position)) {
        score += target.type === 'treasure' ? 22 : 12;
      }
    }

    if (danger.fleeDirection.lengthSq() > 0) {
      score += direction.dot(danger.fleeDirection) * (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE ? 11 : 4);
    }

    return score;
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
      const distance = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
      const threat = this.getEnemyThreatWeight(enemy);

      nearestDistance = Math.min(nearestDistance, distance);

      if (distance <= AutoPlayer.DANGER_RADIUS) {
        pressureCount += 1;
        const weight = ((AutoPlayer.DANGER_RADIUS - Math.max(1, distance)) / AutoPlayer.DANGER_RADIUS) * threat;
        fleeDirection.x += ((player.x - enemy.x) / Math.max(1, distance)) * weight;
        fleeDirection.y += ((player.y - enemy.y) / Math.max(1, distance)) * weight;
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

  private getBreakoutDirection(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    surround: SurroundInfo,
    movement: MovementMemoryInfo,
  ): Phaser.Math.Vector2 {
    const shouldBreakout = surround.surrounded
      || (movement.stalled && danger.nearestDistance < AutoPlayer.DANGER_RADIUS)
      || movement.prolonged;

    if (!shouldBreakout) {
      return new Phaser.Math.Vector2(0, 0);
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
      const distance = Phaser.Math.Distance.Between(point.x, point.y, enemy.x, enemy.y);

      if (distance > AutoPlayer.DANGER_RADIUS) {
        continue;
      }

      const proximity = (AutoPlayer.DANGER_RADIUS - Math.max(0, distance)) / AutoPlayer.DANGER_RADIUS;
      pressure += proximity * proximity * this.getEnemyThreatWeight(enemy) * (hpRatio < 0.5 ? 1.25 : 1);
    }

    return pressure;
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
        score += 26 + Math.max(0, currentRisk - exitRisk) * 4 + (hpRatio < 0.35 ? 12 : 0);
      } else {
        score += Math.max(0, progress) * 0.11;

        if (progress < -8) {
          score -= 5;
        }
      }
    }

    return score;
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
    score += Math.max(0, borderProgress) * (surround.surrounded ? 0.28 : 0.14);
    score += Math.max(0, obstacleProgress) * 0.10;
    score += Math.max(0, actualMove - AutoPlayer.STEP_DISTANCE * 0.35) * 0.11;
    score += Math.max(0, anchorDistance - AutoPlayer.STALL_RADIUS) * (movement.prolonged ? 0.20 : 0.10);
    score += Math.max(0, direction.dot(surround.safestDirection)) * (surround.surrounded ? 34 : 16);

    if (danger.fleeDirection.lengthSq() > 0) {
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
    const closest = this.getClosestPointOnSegment(start, end, point);

    return Phaser.Math.Distance.Between(point.x, point.y, closest.x, closest.y);
  }

  private getClosestPointOnSegment(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    point: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const segment = end.clone().subtract(start);
    const lengthSq = segment.lengthSq();

    if (lengthSq <= 0) {
      return start.clone();
    }

    const t = Phaser.Math.Clamp(point.clone().subtract(start).dot(segment) / lengthSq, 0, 1);

    return start.clone().add(segment.scale(t));
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

  private tickSuppression(): void {
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
