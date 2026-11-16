/** Simple token bucket for outbound provider budgets (e.g. SoSoValue 20 req/min). */
export class TokenBucket {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly capacity: number,
    private readonly windowMs: number,
    now = Date.now(),
  ) {
    this.tokens = capacity;
    this.updatedAt = now;
  }

  private refill(now: number): void {
    const elapsed = Math.max(0, now - this.updatedAt);
    this.tokens = Math.min(this.capacity, this.tokens + (elapsed * this.capacity) / this.windowMs);
    this.updatedAt = now;
  }

  /** Take one token if available. */
  tryTake(now = Date.now()): boolean {
    this.refill(now);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /** ms until one token will be available. */
  msUntilNext(now = Date.now()): number {
    this.refill(now);
    if (this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) * this.windowMs) / this.capacity);
  }

  reset(now = Date.now()): void {
    this.tokens = this.capacity;
    this.updatedAt = now;
  }
}
