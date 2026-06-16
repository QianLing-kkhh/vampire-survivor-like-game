export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Rect implements RectLike {
  constructor(
    public x = 0,
    public y = 0,
    public width = 0,
    public height = 0,
  ) {}

  get left(): number {
    return this.x;
  }

  get right(): number {
    return this.x + this.width;
  }

  get top(): number {
    return this.y;
  }

  get bottom(): number {
    return this.y + this.height;
  }

  get centerX(): number {
    return this.x + this.width / 2;
  }

  get centerY(): number {
    return this.y + this.height / 2;
  }

  clone(): Rect {
    return new Rect(this.x, this.y, this.width, this.height);
  }
}
