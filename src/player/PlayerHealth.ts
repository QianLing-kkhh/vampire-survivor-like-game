export class PlayerHealth {
  private hp: number;
  private dead = false;
  private invulnerableRemainingMs = 0;
  private shieldStacks = 0;
  private readonly temporaryDamageTakenMultipliers: Array<{
    multiplier: number;
    remainingMs: number;
  }> = [];

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

  isInvulnerable(): boolean {
    return this.invulnerableRemainingMs > 0;
  }

  getShieldStacks(): number {
    return this.shieldStacks;
  }

  addShieldStacks(count: number): number {
    const stacksToAdd = Math.max(0, Math.floor(count));

    if (stacksToAdd <= 0) {
      return this.shieldStacks;
    }

    this.shieldStacks += stacksToAdd;
    return this.shieldStacks;
  }

  consumeShieldStack(): boolean {
    if (this.shieldStacks <= 0) {
      return false;
    }

    this.shieldStacks -= 1;
    return true;
  }

  setInvulnerable(durationMs: number): void {
    this.invulnerableRemainingMs = Math.max(
      this.invulnerableRemainingMs,
      Math.max(0, durationMs),
    );
  }

  updateInvulnerability(deltaMs: number): void {
    if (this.invulnerableRemainingMs <= 0) {
      return;
    }

    this.invulnerableRemainingMs = Math.max(
      0,
      this.invulnerableRemainingMs - Math.max(0, deltaMs),
    );
  }

  addTemporaryDamageTakenMultiplier(multiplier: number, durationMs: number): void {
    const remainingMs = Math.max(0, durationMs);

    if (remainingMs <= 0) {
      return;
    }

    this.temporaryDamageTakenMultipliers.push({
      multiplier: Math.max(0, multiplier),
      remainingMs,
    });
  }

  updateTemporaryEffects(deltaMs: number): void {
    const effectiveDeltaMs = Math.max(0, deltaMs);

    for (let index = this.temporaryDamageTakenMultipliers.length - 1; index >= 0; index -= 1) {
      const effect = this.temporaryDamageTakenMultipliers[index];
      effect.remainingMs -= effectiveDeltaMs;

      if (effect.remainingMs <= 0) {
        this.temporaryDamageTakenMultipliers.splice(index, 1);
      }
    }
  }

  getCurrentDamageTakenMultiplier(): number {
    if (this.temporaryDamageTakenMultipliers.length === 0) {
      return 1;
    }

    return this.temporaryDamageTakenMultipliers.reduce(
      (lowestMultiplier, effect) => Math.min(lowestMultiplier, effect.multiplier),
      1,
    );
  }

  setCurrentHp(value: number): void {
    this.hp = Math.min(Math.max(Math.round(value), 0), this.maximumHp);
    this.dead = this.hp <= 0;
  }

  takeDamage(amount: number): number {
    if (this.dead || this.isInvulnerable()) {
      return 0;
    }

    if (amount > 0 && this.consumeShieldStack()) {
      return 0;
    }

    const previousHp = this.hp;
    const reducedAmount = Math.max(0, amount) * this.getCurrentDamageTakenMultiplier();

    this.setCurrentHp(this.hp - reducedAmount);

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

  heal(amount: number): number {
    if (this.dead) {
      return 0;
    }

    const previousHp = this.hp;
    this.setCurrentHp(this.hp + Math.max(0, amount));
    return Math.max(0, this.hp - previousHp);
  }

  reset(): void {
    this.hp = this.maximumHp;
    this.dead = false;
    this.invulnerableRemainingMs = 0;
    this.shieldStacks = 0;
    this.temporaryDamageTakenMultipliers.length = 0;
  }
}
