export class PlayerHealth {
  private hp: number;

  constructor(private readonly maximumHp: number) {
    this.hp = maximumHp;
  }

  get currentHp(): number {
    return this.hp;
  }

  get maxHp(): number {
    return this.maximumHp;
  }

  setCurrentHp(value: number): void {
    this.hp = Math.min(Math.max(value, 0), this.maximumHp);
  }

  reset(): void {
    this.hp = this.maximumHp;
  }
}
