import Phaser from 'phaser';

import { EventBus } from '../core/EventBus';
import { Math2D } from '../core/domain/Math2D';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { ExpManager } from '../progression/ExpManager';

import { Pickup } from './Pickup';
import type { PickupUpdateContext } from './PickupUpdateContext';

interface Position {
  x: number;
  y: number;
}

export interface PickupSnapshot {
  x: number;
  y: number;
  exp: number;
}

export class PickupManager {
  private static readonly SOFT_PICKUP_CAP = 650;
  private static readonly HARD_PICKUP_CAP = 900;
  private static readonly MERGE_MIN_DISTANCE_FROM_PLAYER = 900;
  private static readonly MAX_MERGE_BATCH_SIZE = 24;
  private static readonly PERIODIC_MERGE_INTERVAL_MS = 1500;
  private static readonly PERIODIC_MERGE_RADIUS = 140;
  private static readonly PERIODIC_MERGE_MIN_CLUSTER_SIZE = 3;
  private static readonly PERIODIC_MERGE_MAX_CLUSTER_SIZE = 12;
  private static readonly PERIODIC_MERGE_MAX_CLUSTERS = 8;
  private static readonly PERIODIC_MERGE_MIN_DISTANCE_FROM_PLAYER = 260;

  private readonly pickups: Pickup[] = [];
  private readonly unsubscribeEnemyKilled: () => void;
  private mergedPickupCount = 0;
  private lastMergedPickupCount = 0;
  private periodicMergeTimerMs = PickupManager.PERIODIC_MERGE_INTERVAL_MS;

  constructor(
    private readonly scene: Phaser.Scene,
    eventBus: EventBus<GameEventMap>,
    private readonly expManager: ExpManager,
  ) {
    this.unsubscribeEnemyKilled = eventBus.subscribe('EnemyKilled', (event) => {
      if (!isEnemyKilledEvent(event)) {
        return;
      }

      this.spawnExpGem(event.x, event.y, event.exp);
    });
  }

  get totalExp(): number {
    return this.expManager.totalExp;
  }

  getActiveCount(): number {
    return this.pickups.filter((pickup) => !pickup.isCollected).length;
  }

  getPickupSnapshots(): PickupSnapshot[] {
    return this.pickups.map((pickup) => ({
      x: pickup.body.x,
      y: pickup.body.y,
      exp: pickup.exp,
    }));
  }

  getDebugStats(): {
    activeCount: number;
    mergedPickupCount: number;
    lastMergedPickupCount: number;
  } {
    return {
      activeCount: this.getActiveCount(),
      mergedPickupCount: this.mergedPickupCount,
      lastMergedPickupCount: this.lastMergedPickupCount,
    };
  }

  update(context: PickupUpdateContext): void {
    const playerPosition = context.player.getPositionLike();
    const deltaMs = context.deltaMs;
    this.lastMergedPickupCount = 0;

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (pickup.isCollected) {
        this.pickups.splice(index, 1);
        continue;
      }

      if (pickup.isMagnetizing) {
        pickup.updateMagnet(playerPosition.x, playerPosition.y, deltaMs);

        if (pickup.canFinalizeCollect(playerPosition.x, playerPosition.y)) {
          const gainedExp = pickup.collect();

          if (gainedExp > 0) {
            this.expManager.addExp(gainedExp);
          }

          this.pickups.splice(index, 1);
        }

        continue;
      }

      if (this.isPickupInRange(pickup, playerPosition, context.pickupRange)) {
        pickup.startMagnet();
      }
    }

    this.enforceSoftCap(playerPosition);
    this.updatePeriodicMerge(playerPosition, deltaMs);
  }

  destroy(): void {
    this.unsubscribeEnemyKilled();

    for (const pickup of this.pickups) {
      pickup.destroy();
    }

    this.pickups.length = 0;
  }

  private spawnExpGem(x: number, y: number, exp: number): void {
    if (exp <= 0) {
      return;
    }

    this.pickups.push(new Pickup(this.scene, x, y, exp));
  }

  private updatePeriodicMerge(playerPosition: Position, deltaMs: number): void {
    this.periodicMergeTimerMs -= deltaMs;

    if (this.periodicMergeTimerMs > 0) {
      return;
    }

    this.periodicMergeTimerMs = PickupManager.PERIODIC_MERGE_INTERVAL_MS;
    this.mergeNearbyPickups(playerPosition);
  }

  private mergeNearbyPickups(playerPosition: Position): void {
    const minPlayerDistanceSq = PickupManager.PERIODIC_MERGE_MIN_DISTANCE_FROM_PLAYER
      * PickupManager.PERIODIC_MERGE_MIN_DISTANCE_FROM_PLAYER;
    const mergeRadiusSq = PickupManager.PERIODIC_MERGE_RADIUS
      * PickupManager.PERIODIC_MERGE_RADIUS;
    const candidates = this.pickups.filter((pickup) => (
      !pickup.isCollected
      && !pickup.isMagnetizing
      && Math2D.distanceSquaredBetween(
        playerPosition.x,
        playerPosition.y,
        pickup.body.x,
        pickup.body.y,
      ) >= minPlayerDistanceSq
    ));

    if (candidates.length < PickupManager.PERIODIC_MERGE_MIN_CLUSTER_SIZE) {
      return;
    }

    const selectedPickups = new Set<Pickup>();
    let mergedClusters = 0;

    for (const anchor of candidates) {
      if (selectedPickups.has(anchor)) {
        continue;
      }

      const cluster: Pickup[] = [anchor];

      for (const candidate of candidates) {
        if (
          candidate === anchor
          || selectedPickups.has(candidate)
          || cluster.length >= PickupManager.PERIODIC_MERGE_MAX_CLUSTER_SIZE
        ) {
          continue;
        }

        const distanceSq = Math2D.distanceSquaredBetween(
          anchor.body.x,
          anchor.body.y,
          candidate.body.x,
          candidate.body.y,
        );

        if (distanceSq <= mergeRadiusSq) {
          cluster.push(candidate);
        }
      }

      if (cluster.length < PickupManager.PERIODIC_MERGE_MIN_CLUSTER_SIZE) {
        continue;
      }

      this.mergePickupCluster(cluster);
      cluster.forEach((pickup) => selectedPickups.add(pickup));
      mergedClusters += 1;

      if (mergedClusters >= PickupManager.PERIODIC_MERGE_MAX_CLUSTERS) {
        break;
      }
    }
  }

  private mergePickupCluster(cluster: Pickup[]): void {
    let mergedExp = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (const pickup of cluster) {
      const weight = Math.max(1, pickup.exp);

      mergedExp += pickup.exp;
      weightedX += pickup.body.x * weight;
      weightedY += pickup.body.y * weight;
    }

    if (mergedExp <= 0) {
      return;
    }

    const selectedPickups = new Set(cluster);
    const mergedX = weightedX / Math.max(1, mergedExp);
    const mergedY = weightedY / Math.max(1, mergedExp);

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (!selectedPickups.has(pickup)) {
        continue;
      }

      pickup.destroy();
      this.pickups.splice(index, 1);
    }

    this.pickups.push(new Pickup(this.scene, mergedX, mergedY, mergedExp));
    this.lastMergedPickupCount += cluster.length;
    this.mergedPickupCount += cluster.length - 1;
  }

  private enforceSoftCap(playerPosition: Position): void {
    const activePickups = this.pickups.filter((pickup) => (
      !pickup.isCollected && !pickup.isMagnetizing
    ));

    if (activePickups.length <= PickupManager.SOFT_PICKUP_CAP) {
      return;
    }

    const overflow = Math.max(
      activePickups.length - PickupManager.SOFT_PICKUP_CAP,
      activePickups.length > PickupManager.HARD_PICKUP_CAP ? 2 : 0,
    );
    const candidates = activePickups
      .map((pickup) => ({
        pickup,
        distanceSq: Math2D.distanceSquaredBetween(
          playerPosition.x,
          playerPosition.y,
          pickup.body.x,
          pickup.body.y,
        ),
      }))
      .filter(({ distanceSq }) => (
        distanceSq >= PickupManager.MERGE_MIN_DISTANCE_FROM_PLAYER
          * PickupManager.MERGE_MIN_DISTANCE_FROM_PLAYER
      ))
      .sort((a, b) => b.distanceSq - a.distanceSq);
    const mergeCount = Math.min(
      PickupManager.MAX_MERGE_BATCH_SIZE,
      Math.max(2, overflow + 1),
      candidates.length,
    );

    if (mergeCount < 2) {
      return;
    }

    const selectedPickups = new Set(
      candidates.slice(0, mergeCount).map(({ pickup }) => pickup),
    );
    let mergedExp = 0;
    let mergedX = 0;
    let mergedY = 0;

    for (const pickup of selectedPickups) {
      mergedExp += pickup.exp;
      mergedX += pickup.body.x;
      mergedY += pickup.body.y;
    }

    mergedX /= selectedPickups.size;
    mergedY /= selectedPickups.size;

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (!selectedPickups.has(pickup)) {
        continue;
      }

      pickup.destroy();
      this.pickups.splice(index, 1);
    }

    this.pickups.push(new Pickup(this.scene, mergedX, mergedY, mergedExp));
    this.lastMergedPickupCount = selectedPickups.size;
    this.mergedPickupCount += selectedPickups.size - 1;
  }

  private isPickupInRange(
    pickup: Pickup,
    playerPosition: Position,
    pickupRange: number,
  ): boolean {
    return Math2D.distanceBetween(
      playerPosition.x,
      playerPosition.y,
      pickup.body.x,
      pickup.body.y,
    ) <= pickupRange;
  }
}
