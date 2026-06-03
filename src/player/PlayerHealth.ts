export class PlayerHealth {
  private hp: number;
  private dead = false;

  constructor(private maximumHp: number) {
    this.maximumHp = Math.round(maximumHp);
    this.hp = this.maximumHp;
  }

  get currentHp(): number {
    return this.hp;
  }

  get maxHp(): number {
    return this.maximumHp;
  }

  get isDead(): boolean {
    return this.dead;
  }

  setCurrentHp(value: number): void {
    this.hp = Math.min(Math.max(Math.round(value), 0), this.maximumHp);
    this.dead = this.hp <= 0;
  }

  takeDamage(amount: number): number {
    if (this.dead) {
      return 0;
    }

    const previousHp = this.hp;

    this.setCurrentHp(this.hp - Math.max(0, amount));

    return Math.max(0, previousHp - this.hp);
  }

  increaseMaxHp(amount: number, healSameAmount: boolean, maxHpLimit = Infinity): number {
    const increaseAmount = Math.max(0, Math.round(amount));
    const previousMaxHp = this.maximumHp;

    this.maximumHp = Math.min(maxHpLimit, this.maximumHp + increaseAmount);
    const actualIncreaseAmount = Math.max(0, this.maximumHp - previousMaxHp);

    if (healSameAmount && actualIncreaseAmount > 0) {
      const previousHp = this.hp;
      this.setCurrentHp(this.hp + actualIncreaseAmount);
      return Math.max(0, this.hp - previousHp);
    }

    this.setCurrentHp(this.hp);
    return 0;
  }

  healLostHpRatio(ratio: number): number {
    if (this.dead) {
      return 0;
    }

    const lostHp = this.maximumHp - this.hp;
    const healAmount = Math.ceil(lostHp * Math.max(0, ratio));
    const previousHp = this.hp;

    this.setCurrentHp(this.hp + healAmount);
    return Math.max(0, this.hp - previousHp);
  }

  reset(): void {
    this.hp = this.maximumHp;
    this.dead = false;
  }
}
