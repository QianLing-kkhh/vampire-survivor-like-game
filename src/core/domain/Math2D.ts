import { Vector2, type Vector2Like } from './Vector2';
import type { RectLike } from './Rect';

export class Math2D {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }

  static distance(a: Vector2Like, b: Vector2Like): number {
    return Math.sqrt(this.distanceSquared(a, b));
  }

  static distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  static distanceSquared(a: Vector2Like, b: Vector2Like): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    return dx * dx + dy * dy;
  }

  static distanceSquaredBetween(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;

    return dx * dx + dy * dy;
  }

  static degToRad(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  static radToDeg(radians: number): number {
    return radians * 180 / Math.PI;
  }

  static normalizeAngle(radians: number): number {
    const twoPi = Math.PI * 2;
    const normalized = radians % twoPi;

    return normalized < 0 ? normalized + twoPi : normalized;
  }

  static fromAngle(radians: number, length = 1): Vector2 {
    return new Vector2(Math.cos(radians) * length, Math.sin(radians) * length);
  }

  static lineIntersectsRect(start: Vector2Like, end: Vector2Like, rect: RectLike): boolean {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    if (
      this.pointInRect(start, rect)
      || this.pointInRect(end, rect)
    ) {
      return true;
    }

    return this.lineSegmentsIntersect(start, end, { x: left, y: top }, { x: right, y: top })
      || this.lineSegmentsIntersect(start, end, { x: right, y: top }, { x: right, y: bottom })
      || this.lineSegmentsIntersect(start, end, { x: right, y: bottom }, { x: left, y: bottom })
      || this.lineSegmentsIntersect(start, end, { x: left, y: bottom }, { x: left, y: top });
  }

  static pointInRect(point: Vector2Like, rect: RectLike): boolean {
    return point.x >= rect.x
      && point.x <= rect.x + rect.width
      && point.y >= rect.y
      && point.y <= rect.y + rect.height;
  }

  static lineSegmentsIntersect(
    a1: Vector2Like,
    a2: Vector2Like,
    b1: Vector2Like,
    b2: Vector2Like,
  ): boolean {
    const d1 = this.orientation(a1, a2, b1);
    const d2 = this.orientation(a1, a2, b2);
    const d3 = this.orientation(b1, b2, a1);
    const d4 = this.orientation(b1, b2, a2);

    if (d1 === 0 && this.isPointOnSegment(b1, a1, a2)) {
      return true;
    }

    if (d2 === 0 && this.isPointOnSegment(b2, a1, a2)) {
      return true;
    }

    if (d3 === 0 && this.isPointOnSegment(a1, b1, b2)) {
      return true;
    }

    if (d4 === 0 && this.isPointOnSegment(a2, b1, b2)) {
      return true;
    }

    return d1 !== d2 && d3 !== d4;
  }

  private static orientation(a: Vector2Like, b: Vector2Like, c: Vector2Like): -1 | 0 | 1 {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

    if (Math.abs(value) < Number.EPSILON) {
      return 0;
    }

    return value > 0 ? 1 : -1;
  }

  private static isPointOnSegment(point: Vector2Like, start: Vector2Like, end: Vector2Like): boolean {
    return point.x <= Math.max(start.x, end.x)
      && point.x >= Math.min(start.x, end.x)
      && point.y <= Math.max(start.y, end.y)
      && point.y >= Math.min(start.y, end.y);
  }
}
