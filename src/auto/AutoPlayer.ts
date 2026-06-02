import Phaser from 'phaser';

export interface AutoPosition {
  x: number;
  y: number;
}

export interface AutoPlayerContext {
  playerPosition: AutoPosition;
  enemyPositions: readonly AutoPosition[];
  pickupPositions: readonly AutoPosition[];
  treasurePositions?: readonly AutoPosition[];
  weaponContext?: {
    weaponIds: readonly string[];
    garlicRadiusPx?: number;
    bibleRadiusPx?: number;
  };
  worldBounds: {
    width: number;
    height: number;
  };
}

export class AutoPlayer {
  private static readonly DANGER_RADIUS = 260;
  private static readonly PANIC_DISTANCE = 120;
  private static readonly SAFE_DISTANCE = 220;
  private static readonly PICKUP_SEEK_RADIUS = 900;
  private static readonly PICKUP_CLUSTER_RADIUS = 180;
  private static readonly TREASURE_SEEK_RADIUS = 1200;
  private static readonly TREASURE_DANGER_RADIUS = 180;
  private static readonly BORDER_MARGIN = 250;

  getMoveDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);
    const danger = this.getDangerInfo(context);
    const fleeDirection = danger.direction.lengthSq() > 0
      ? danger.direction.clone().normalize()
      : new Phaser.Math.Vector2(0, 0);
    const tangentDirection = this.getTangentDirection(fleeDirection, context);
    const pickupDirection = this.getPickupDirection(context, danger.nearestDistance);
    const treasureDirection = this.getTreasureDirection(context, danger.nearestDistance);
    const centerDirection = this.getCenterDirection(context);
    const borderDirection = this.getBorderCorrectionDirection(context);
    const weaponIds = context.weaponContext?.weaponIds ?? [];
    const hasGarlic = weaponIds.includes('garlic');
    const weaponDirection = this.getWeaponStrategyDirection(
      context,
      danger.nearestDistance,
      fleeDirection,
      tangentDirection,
    );
    const pickupEscapeAlignment = pickupDirection.lengthSq() === 0
      || fleeDirection.lengthSq() === 0
      ? 0
      : pickupDirection.dot(fleeDirection);
    const treasureEscapeAlignment = treasureDirection.lengthSq() === 0
      || fleeDirection.lengthSq() === 0
      ? 0
      : treasureDirection.dot(fleeDirection);

    if (danger.nearestDistance < AutoPlayer.PANIC_DISTANCE) {
      direction
        .add(fleeDirection.scale(0.70))
        .add(tangentDirection.scale(0.20))
        .add(centerDirection.scale(0.10));

      if (pickupEscapeAlignment > 0.45) {
        direction.add(pickupDirection.scale(0.08));
      }
    } else if (danger.nearestDistance <= AutoPlayer.SAFE_DISTANCE) {
      const treasureWeight = treasureEscapeAlignment > -0.15 ? 0.35 : 0;

      if (hasGarlic) {
        direction
          .add(fleeDirection.scale(0.40))
          .add(tangentDirection.scale(0.25))
          .add(treasureDirection.scale(treasureWeight))
          .add(pickupDirection.scale(treasureWeight > 0 ? 0.18 : 0.30))
          .add(centerDirection.scale(0.05))
          .add(weaponDirection.scale(0.20));
      } else {
        direction
          .add(fleeDirection.scale(0.40))
          .add(tangentDirection.scale(0.25))
          .add(treasureDirection.scale(treasureWeight))
          .add(pickupDirection.scale(treasureWeight > 0 ? 0.18 : 0.30))
          .add(centerDirection.scale(0.05))
          .add(weaponDirection.scale(0.20));
      }
    } else {
      if (hasGarlic) {
        direction
          .add(treasureDirection.scale(treasureDirection.lengthSq() > 0 ? 0.90 : 0))
          .add(pickupDirection.scale(treasureDirection.lengthSq() > 0 ? 0.20 : 0.85))
          .add(centerDirection.scale(0.10))
          .add(tangentDirection.scale(0.05))
          .add(weaponDirection.scale(0.30));
      } else {
        direction
          .add(treasureDirection.scale(treasureDirection.lengthSq() > 0 ? 0.90 : 0))
          .add(pickupDirection.scale(treasureDirection.lengthSq() > 0 ? 0.20 : 0.85))
          .add(centerDirection.scale(0.10))
          .add(tangentDirection.scale(0.05))
          .add(weaponDirection.scale(0.45));
      }
    }

    if (borderDirection.lengthSq() > 0) {
      direction.add(borderDirection.scale(0.9));
    }

    if (direction.lengthSq() === 0) {
      return direction;
    }

    return direction.normalize();
  }

  private getDangerInfo(context: AutoPlayerContext): {
    direction: Phaser.Math.Vector2;
    nearestDistance: number;
  } {
    const direction = new Phaser.Math.Vector2(0, 0);
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const enemyPosition of context.enemyPositions) {
      const distance = Phaser.Math.Distance.Between(
        context.playerPosition.x,
        context.playerPosition.y,
        enemyPosition.x,
        enemyPosition.y,
      );

      nearestDistance = Math.min(nearestDistance, distance);

      if (distance <= 0 || distance > AutoPlayer.DANGER_RADIUS) {
        continue;
      }

      const weight = (AutoPlayer.DANGER_RADIUS - distance) / AutoPlayer.DANGER_RADIUS;
      direction.x += ((context.playerPosition.x - enemyPosition.x) / distance) * weight;
      direction.y += ((context.playerPosition.y - enemyPosition.y) / distance) * weight;
    }

    return { direction, nearestDistance };
  }

  private getWeaponStrategyDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
    fleeDirection: Phaser.Math.Vector2,
    tangentDirection: Phaser.Math.Vector2,
  ): Phaser.Math.Vector2 {
    const weaponIds = context.weaponContext?.weaponIds ?? [];
    const hasKnife = weaponIds.includes('knife');
    const hasGarlic = weaponIds.includes('garlic');
    const hasBible = weaponIds.includes('bible');
    const direction = new Phaser.Math.Vector2(0, 0);

    if (hasGarlic && hasBible) {
      direction
        .add(this.getGarlicDirection(context, nearestEnemyDistance).scale(0.50))
        .add(this.getBibleDirection(context, nearestEnemyDistance).scale(0.40))
        .add(tangentDirection.clone().scale(0.65));
    } else if (hasGarlic) {
      direction
        .add(this.getGarlicDirection(context, nearestEnemyDistance).scale(0.80))
        .add(tangentDirection.clone().scale(0.35));
    } else if (hasBible) {
      direction
        .add(this.getBibleDirection(context, nearestEnemyDistance).scale(0.50))
        .add(tangentDirection.clone().scale(0.35));
    } else if (hasKnife) {
      direction
        .add(this.getKnifeLineDirection(context).scale(0.60))
        .add(fleeDirection.clone().scale(0.20));
    }

    if (direction.lengthSq() === 0) {
      return direction;
    }

    return direction.normalize();
  }

  private getKnifeLineDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    const enemyCenter = this.getNearbyEnemyCenter(context, 620);

    if (!enemyCenter) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return new Phaser.Math.Vector2(
      context.playerPosition.x - enemyCenter.x,
      context.playerPosition.y - enemyCenter.y,
    ).normalize();
  }

  private getGarlicDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
  ): Phaser.Math.Vector2 {
    const garlicRadiusPx = context.weaponContext?.garlicRadiusPx ?? 120;
    const idealDistance = garlicRadiusPx * 0.90;

    return this.getDistanceBandDirection(
      context,
      nearestEnemyDistance,
      idealDistance,
      idealDistance * 0.55,
      idealDistance * 1.30,
    );
  }

  private getBibleDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
  ): Phaser.Math.Vector2 {
    const bibleRadiusPx = context.weaponContext?.bibleRadiusPx ?? 154;

    return this.getDistanceBandDirection(
      context,
      nearestEnemyDistance,
      bibleRadiusPx,
      bibleRadiusPx * 0.65,
      bibleRadiusPx * 1.25,
    );
  }

  private getDistanceBandDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
    idealDistance: number,
    tooCloseDistance: number,
    tooFarDistance: number,
  ): Phaser.Math.Vector2 {
    const enemyCenter = this.getNearbyEnemyCenter(context, Math.max(idealDistance * 2.2, 360));

    if (!enemyCenter || nearestEnemyDistance === Number.POSITIVE_INFINITY) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const towardEnemies = new Phaser.Math.Vector2(
      enemyCenter.x - context.playerPosition.x,
      enemyCenter.y - context.playerPosition.y,
    );

    if (towardEnemies.lengthSq() === 0) {
      return new Phaser.Math.Vector2(0, 0);
    }

    if (nearestEnemyDistance < tooCloseDistance) {
      return towardEnemies.scale(-1).normalize();
    }

    if (nearestEnemyDistance > tooFarDistance) {
      return towardEnemies.normalize();
    }

    const tangent = new Phaser.Math.Vector2(-towardEnemies.y, towardEnemies.x).normalize();

    if (nearestEnemyDistance < idealDistance) {
      return tangent.add(towardEnemies.normalize().scale(-0.25)).normalize();
    }

    return tangent.add(towardEnemies.normalize().scale(0.20)).normalize();
  }

  private getNearbyEnemyCenter(
    context: AutoPlayerContext,
    maxDistance: number,
  ): AutoPosition | undefined {
    let totalX = 0;
    let totalY = 0;
    let count = 0;

    for (const enemyPosition of context.enemyPositions) {
      const distance = Phaser.Math.Distance.Between(
        context.playerPosition.x,
        context.playerPosition.y,
        enemyPosition.x,
        enemyPosition.y,
      );

      if (distance > maxDistance) {
        continue;
      }

      totalX += enemyPosition.x;
      totalY += enemyPosition.y;
      count += 1;
    }

    if (count === 0) {
      return undefined;
    }

    return {
      x: totalX / count,
      y: totalY / count,
    };
  }

  private getPickupDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
  ): Phaser.Math.Vector2 {
    let bestPickup: AutoPosition | undefined;
    let bestScore = 0;

    for (const pickupPosition of context.pickupPositions) {
      const distance = Phaser.Math.Distance.Between(
        context.playerPosition.x,
        context.playerPosition.y,
        pickupPosition.x,
        pickupPosition.y,
      );

      if (distance > AutoPlayer.PICKUP_SEEK_RADIUS) {
        continue;
      }

      if (
        nearestEnemyDistance < AutoPlayer.SAFE_DISTANCE
        && this.isPickupInHighDanger(context, pickupPosition)
      ) {
        continue;
      }

      const score = this.getPickupClusterScore(context, pickupPosition, distance);

      if (score <= bestScore) {
        continue;
      }

      bestPickup = pickupPosition;
      bestScore = score;
    }

    if (!bestPickup) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return new Phaser.Math.Vector2(
      bestPickup.x - context.playerPosition.x,
      bestPickup.y - context.playerPosition.y,
    ).normalize();
  }

  private getTreasureDirection(
    context: AutoPlayerContext,
    nearestEnemyDistance: number,
  ): Phaser.Math.Vector2 {
    let bestTreasure: AutoPosition | undefined;
    let bestScore = 0;

    for (const treasurePosition of context.treasurePositions ?? []) {
      const distance = Phaser.Math.Distance.Between(
        context.playerPosition.x,
        context.playerPosition.y,
        treasurePosition.x,
        treasurePosition.y,
      );

      if (distance > AutoPlayer.TREASURE_SEEK_RADIUS) {
        continue;
      }

      if (
        nearestEnemyDistance < AutoPlayer.PANIC_DISTANCE
        || this.isTreasureInHighDanger(context, treasurePosition)
      ) {
        continue;
      }

      const score = this.getTreasureScore(context, treasurePosition, distance);

      if (score <= bestScore) {
        continue;
      }

      bestTreasure = treasurePosition;
      bestScore = score;
    }

    if (!bestTreasure) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return new Phaser.Math.Vector2(
      bestTreasure.x - context.playerPosition.x,
      bestTreasure.y - context.playerPosition.y,
    ).normalize();
  }

  private getTreasureScore(
    context: AutoPlayerContext,
    treasurePosition: AutoPosition,
    playerDistance: number,
  ): number {
    const distanceScore = 1 - (playerDistance / AutoPlayer.TREASURE_SEEK_RADIUS);
    const enemySafetyMultiplier = this.getTreasureEnemySafetyMultiplier(
      context,
      treasurePosition,
    );

    return (10 + (distanceScore * 6)) * enemySafetyMultiplier;
  }

  private getTreasureEnemySafetyMultiplier(
    context: AutoPlayerContext,
    treasurePosition: AutoPosition,
  ): number {
    let nearestEnemyDistance = Number.POSITIVE_INFINITY;

    for (const enemyPosition of context.enemyPositions) {
      nearestEnemyDistance = Math.min(
        nearestEnemyDistance,
        Phaser.Math.Distance.Between(
          treasurePosition.x,
          treasurePosition.y,
          enemyPosition.x,
          enemyPosition.y,
        ),
      );
    }

    if (nearestEnemyDistance < AutoPlayer.TREASURE_DANGER_RADIUS) {
      return 0.25;
    }

    if (nearestEnemyDistance < AutoPlayer.DANGER_RADIUS) {
      return 0.65;
    }

    return 1;
  }

  private isTreasureInHighDanger(
    context: AutoPlayerContext,
    treasurePosition: AutoPosition,
  ): boolean {
    return context.enemyPositions.some((enemyPosition) => (
      Phaser.Math.Distance.Between(
        treasurePosition.x,
        treasurePosition.y,
        enemyPosition.x,
        enemyPosition.y,
      ) < AutoPlayer.TREASURE_DANGER_RADIUS
    ));
  }

  private getPickupClusterScore(
    context: AutoPlayerContext,
    pickupPosition: AutoPosition,
    playerDistance: number,
  ): number {
    let clusterCount = 0;

    for (const otherPickup of context.pickupPositions) {
      if (
        Phaser.Math.Distance.Between(
          pickupPosition.x,
          pickupPosition.y,
          otherPickup.x,
          otherPickup.y,
        ) <= AutoPlayer.PICKUP_CLUSTER_RADIUS
      ) {
        clusterCount += 1;
      }
    }

    const distanceScore = 1 - (playerDistance / AutoPlayer.PICKUP_SEEK_RADIUS);
    const enemySafetyMultiplier = this.getPickupEnemySafetyMultiplier(
      context,
      pickupPosition,
    );

    return ((clusterCount * 10) + (distanceScore * 4)) * enemySafetyMultiplier;
  }

  private getPickupEnemySafetyMultiplier(
    context: AutoPlayerContext,
    pickupPosition: AutoPosition,
  ): number {
    let nearestEnemyDistance = Number.POSITIVE_INFINITY;

    for (const enemyPosition of context.enemyPositions) {
      nearestEnemyDistance = Math.min(
        nearestEnemyDistance,
        Phaser.Math.Distance.Between(
          pickupPosition.x,
          pickupPosition.y,
          enemyPosition.x,
          enemyPosition.y,
        ),
      );
    }

    if (nearestEnemyDistance < AutoPlayer.PANIC_DISTANCE) {
      return 0.15;
    }

    if (nearestEnemyDistance < AutoPlayer.SAFE_DISTANCE) {
      return 0.55;
    }

    return 1;
  }

  private isPickupInHighDanger(
    context: AutoPlayerContext,
    pickupPosition: AutoPosition,
  ): boolean {
    return context.enemyPositions.some((enemyPosition) => (
      Phaser.Math.Distance.Between(
        pickupPosition.x,
        pickupPosition.y,
        enemyPosition.x,
        enemyPosition.y,
      ) < AutoPlayer.PANIC_DISTANCE
    ));
  }

  private getTangentDirection(
    fleeDirection: Phaser.Math.Vector2,
    context: AutoPlayerContext,
  ): Phaser.Math.Vector2 {
    if (fleeDirection.lengthSq() === 0) {
      const centerDirection = this.getCenterDirection(context);

      if (centerDirection.lengthSq() === 0) {
        return new Phaser.Math.Vector2(0, 0);
      }

      return new Phaser.Math.Vector2(-centerDirection.y, centerDirection.x).normalize();
    }

    const clockwise = new Phaser.Math.Vector2(fleeDirection.y, -fleeDirection.x);
    const counterClockwise = new Phaser.Math.Vector2(-fleeDirection.y, fleeDirection.x);
    const centerDirection = this.getCenterDirection(context);

    if (centerDirection.lengthSq() === 0) {
      return clockwise.normalize();
    }

    return clockwise.dot(centerDirection) >= counterClockwise.dot(centerDirection)
      ? clockwise.normalize()
      : counterClockwise.normalize();
  }

  private getCenterDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(
      context.worldBounds.width / 2 - context.playerPosition.x,
      context.worldBounds.height / 2 - context.playerPosition.y,
    );

    if (direction.lengthSq() === 0) {
      return direction;
    }

    return direction.normalize();
  }

  private getBorderCorrectionDirection(context: AutoPlayerContext): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);
    const { playerPosition, worldBounds } = context;
    const margin = AutoPlayer.BORDER_MARGIN;

    if (playerPosition.x < margin) {
      direction.x += 1;
    } else if (playerPosition.x > worldBounds.width - margin) {
      direction.x -= 1;
    }

    if (playerPosition.y < margin) {
      direction.y += 1;
    } else if (playerPosition.y > worldBounds.height - margin) {
      direction.y -= 1;
    }

    if (direction.lengthSq() > 0) {
      return direction.normalize();
    }

    return direction;
  }
}
