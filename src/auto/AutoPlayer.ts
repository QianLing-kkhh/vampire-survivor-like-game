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
}

export interface AutoMapSnapshot {
  obstacles: readonly AutoObstacleSnapshot[];
  slowZones: readonly AutoSlowZoneSnapshot[];
  portals: readonly AutoPortalSnapshot[];
}

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

  private stickyTargetId?: string;
  private stickyWaypoint?: Phaser.Math.Vector2;
  private stickyWaypointTargetId?: string;
  private suppressedTargetId?: string;
  private suppressedTargetFrames = 0;

  getMoveDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    this.tickSuppression();

    const player = this.getPlayerVector(context);
    const danger = this.getDangerInfo(context, player);
    const targets = this.getTargets(context, player, danger.nearestDistance);
    const bestTarget = this.selectTarget(context, player, targets, danger.nearestDistance);

    if (
      bestTarget
      && danger.nearestDistance > AutoPlayer.SAFE_DISTANCE
      && this.canPickupFrom(context, player, bestTarget.position)
    ) {
      this.updateTargetStability(bestTarget, 'collected');
      return new Phaser.Math.Vector2(0, 0);
    }

    const candidates = this.getCandidates(context, player, danger, bestTarget);

    let bestScore = Number.NEGATIVE_INFINITY;
    let bestCandidate: Candidate | undefined;

    for (const candidate of candidates) {
      if (candidate.direction.lengthSq() === 0) {
        continue;
      }

      const direction = candidate.direction.clone().normalize();
      const endpoint = this.getCandidateEndpoint(context, player, direction);
      const score = this.scoreCandidate(context, player, endpoint, direction, danger, bestTarget);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { direction, reason: candidate.reason };
      }
    }

    if (!bestCandidate) {
      return new Phaser.Math.Vector2(0, 0);
    }

    this.updateTargetStability(bestTarget, bestCandidate.reason);
    return bestCandidate.direction.normalize();
  }

  private getCandidates(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    target: AutoTarget | undefined,
  ): Candidate[] {
    const candidates: Candidate[] = [
      { direction: new Phaser.Math.Vector2(1, 0), reason: 'base' },
      { direction: new Phaser.Math.Vector2(1, 1), reason: 'base' },
      { direction: new Phaser.Math.Vector2(0, 1), reason: 'base' },
      { direction: new Phaser.Math.Vector2(-1, 1), reason: 'base' },
      { direction: new Phaser.Math.Vector2(-1, 0), reason: 'base' },
      { direction: new Phaser.Math.Vector2(-1, -1), reason: 'base' },
      { direction: new Phaser.Math.Vector2(0, -1), reason: 'base' },
      { direction: new Phaser.Math.Vector2(1, -1), reason: 'base' },
    ];

    if (danger.fleeDirection.lengthSq() > 0) {
      candidates.push({ direction: danger.fleeDirection, reason: 'flee' });
      candidates.push({ direction: new Phaser.Math.Vector2(danger.fleeDirection.y, -danger.fleeDirection.x), reason: 'tangent' });
      candidates.push({ direction: new Phaser.Math.Vector2(-danger.fleeDirection.y, danger.fleeDirection.x), reason: 'tangent' });
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

  private scoreCandidate(
    context: AutoPlayerContext,
    player: Phaser.Math.Vector2,
    endpoint: Phaser.Math.Vector2,
    direction: Phaser.Math.Vector2,
    danger: ReturnType<AutoPlayer['getDangerInfo']>,
    target: AutoTarget | undefined,
  ): number {
    const hpRatio = this.getHpRatio(context);
    let score = 0;

    score -= this.getEnemyPressureAt(context, endpoint, hpRatio) * (hpRatio < 0.35 ? 1.45 : 1);
    score -= this.getBorderPenalty(context, endpoint, target);
    score -= this.getObstaclePenalty(context, endpoint);
    score += this.getSlowZoneScore(context, endpoint, hpRatio);
    score += this.getPortalScore(context, endpoint, hpRatio);
    score += this.getWeaponCandidateScore(context, player, endpoint, direction, danger);

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

      if (targetPressure < (hpRatio < 0.35 ? 3.5 : 7)) {
        score += target.value * 0.75;
        score += Math.max(-80, progress) * 0.055;
      } else {
        score -= target.value * 0.45;
      }

      if (target.id === this.stickyTargetId) {
        score += AutoPlayer.TARGET_STICKY_BONUS;
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

    for (const target of targets) {
      if (target.id === this.suppressedTargetId && this.suppressedTargetFrames > 0) {
        continue;
      }

      const targetPressure = this.getEnemyPressureAt(context, target.approachPosition, hpRatio);

      if (hpRatio < 0.35 && (targetPressure > 4 || nearestEnemyDistance < AutoPlayer.PANIC_DISTANCE)) {
        continue;
      }

      let score = target.value - targetPressure;

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
      if (!portal.target) {
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
    let clusterCount = 0;

    for (const otherPickup of context.pickupPositions) {
      if (
        Phaser.Math.Distance.Between(pickup.x, pickup.y, otherPickup.x, otherPickup.y)
        <= AutoPlayer.PICKUP_CLUSTER_RADIUS
      ) {
        clusterCount += 1;
      }
    }

    return clusterCount;
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
  }

  private tickSuppression(): void {
    if (this.suppressedTargetFrames <= 0) {
      this.suppressedTargetId = undefined;
      return;
    }

    this.suppressedTargetFrames -= 1;
  }
}
