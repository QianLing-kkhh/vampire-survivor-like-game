export interface Vector2Like {
  x: number;
  y: number;
}

export class Vector2 implements Vector2Like {
  constructor(
    public x = 0,
    public y = 0,
  ) {}

  static from(value: Vector2Like): Vector2 {
    return new Vector2(value.x, value.y);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(value: Vector2Like): this {
    this.x = value.x;
    this.y = value.y;
    return this;
  }

  add(value: Vector2Like): this {
    this.x += value.x;
    this.y += value.y;
    return this;
  }

  subtract(value: Vector2Like): this {
    this.x -= value.x;
    this.y -= value.y;
    return this;
  }

  scale(value: number): this {
    this.x *= value;
    this.y *= value;
    return this;
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  distance(value: Vector2Like): number {
    return Math.sqrt(this.distanceSq(value));
  }

  distanceSq(value: Vector2Like): number {
    const dx = value.x - this.x;
    const dy = value.y - this.y;

    return dx * dx + dy * dy;
  }

  dot(value: Vector2Like): number {
    return this.x * value.x + this.y * value.y;
  }

  lerp(value: Vector2Like, amount: number): this {
    this.x += (value.x - this.x) * amount;
    this.y += (value.y - this.y) * amount;
    return this;
  }

  normalize(): this {
    const currentLength = this.length();

    if (currentLength <= 0) {
      return this;
    }

    this.x /= currentLength;
    this.y /= currentLength;
    return this;
  }
}
