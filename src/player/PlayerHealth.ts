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

  increaseMaxHp(amount: number, healSameAmount: boolean): void {
    const increaseAmount = Math.max(0, Math.round(amount));

    this.maximumHp += increaseAmount;

    if (healSameAmount) {
      this.setCurrentHp(this.hp + increaseAmount);
      return;
    }

    this.setCurrentHp(this.hp);
  }

  healLostHpRatio(ratio: number): void {
    if (this.dead) {
      return;
    }

    const lostHp = this.maximumHp - this.hp;
    const healAmount = Math.ceil(lostHp * Math.max(0, ratio));

    this.setCurrentHp(this.hp + healAmount);
  }

  reset(): void {
    this.hp = this.maximumHp;
    this.dead = false;
  }
}
